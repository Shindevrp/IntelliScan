"""
Network scanner using Scapy and alternative frameworks for high-speed scanning
"""
import os
import json
import time
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from scapy.all import ARP, Ether, IP, TCP, sr1, srp
from utils.telemetry import get_tracer
from scanner.anomaly_detection import AnomalyDetector
from config import MAX_CONCURRENT_SCANS, SCAN_TIMEOUT, SCAN_RESULTS_DIR

# Configure logging
logger = logging.getLogger(__name__)

# Ensure results directory exists
os.makedirs(SCAN_RESULTS_DIR, exist_ok=True)

class NetworkScanner:
    """Network scanner class using Scapy and alternatives"""

    def __init__(self):
        """Initialize the network scanner"""
        self.tracer = get_tracer("network_scanner")
        self.active_scans = {}
        self.scan_results = {}
        self.anomaly_detector = AnomalyDetector()
        self.executor = ThreadPoolExecutor(max_workers=MAX_CONCURRENT_SCANS)
    
    def start_scan(self, scan_id, targets, ports, timeout=SCAN_TIMEOUT):
        """Start a network scan with the given parameters"""
        with self.tracer.start_as_current_span("start_scan") as span:
            span.set_attribute("scan_id", scan_id)
            span.set_attribute("target_count", len(targets))
            span.set_attribute("port_count", len(ports))
            
            logger.info(f"Starting scan {scan_id} with {len(targets)} targets and {len(ports)} ports")
            
            # Initialize scan status
            self.active_scans[scan_id] = {
                'status': 'running',
                'start_time': time.time(),
                'progress': 0,
                'targets': targets,
                'ports': ports,
                'timeout': timeout,
                'results': {}
            }
            
            # Start scan in background
            thread = threading.Thread(
                target=self._execute_scan,
                args=(scan_id, targets, ports, timeout)
            )
            thread.daemon = True
            thread.start()
            
            return {
                'scan_id': scan_id,
                'status': 'running',
                'targets': targets,
                'ports': ports
            }
    
    def _execute_scan(self, scan_id, targets, ports, timeout):
        """Execute the network scan using Scapy"""
        with self.tracer.start_as_current_span("execute_scan") as span:
            span.set_attribute("scan_id", scan_id)
            
            try:
                start_time = time.time()
                results = {
                    'scan_id': scan_id,
                    'start_time': start_time,
                    'targets': targets,
                    'ports': ports,
                    'timeout': timeout,
                    'results': {}
                }
                
                total_tasks = len(targets) * len(ports)
                completed_tasks = 0
                
                # First, perform an ARP scan to find live hosts
                live_hosts = self._discover_hosts(targets)
                
                # For each target, scan specified ports
                futures = []
                
                for target in live_hosts:
                    results['results'][target] = {'status': 'scanned', 'ports': {}}
                    
                    # Submit port scanning tasks
                    for port in ports:
                        futures.append(
                            self.executor.submit(
                                self._scan_port, 
                                scan_id=scan_id,
                                target=target, 
                                port=port, 
                                timeout=timeout,
                                results=results
                            )
                        )
                
                # Process results as they complete
                for future in futures:
                    future.result()
                    completed_tasks += 1
                    progress = (completed_tasks / total_tasks) * 100
                    
                    # Update progress
                    if scan_id in self.active_scans:
                        self.active_scans[scan_id]['progress'] = progress
                
                # Run anomaly detection on results
                self._detect_anomalies(results)
                
                # Mark scan as completed
                end_time = time.time()
                results['end_time'] = end_time
                results['duration'] = end_time - start_time
                
                if scan_id in self.active_scans:
                    self.active_scans[scan_id]['status'] = 'completed'
                    self.active_scans[scan_id]['progress'] = 100
                    self.active_scans[scan_id]['end_time'] = end_time
                    self.active_scans[scan_id]['duration'] = end_time - start_time
                
                # Store results
                self.scan_results[scan_id] = results
                
                # Save results to file
                self._save_results(scan_id, results)
                
                logger.info(f"Scan {scan_id} completed in {end_time - start_time:.2f} seconds")
                
            except Exception as e:
                logger.error(f"Error in scan {scan_id}: {str(e)}")
                
                if scan_id in self.active_scans:
                    self.active_scans[scan_id]['status'] = 'error'
                    self.active_scans[scan_id]['error'] = str(e)
    
    def _discover_hosts(self, targets):
        """Discover live hosts using ARP"""
        with self.tracer.start_as_current_span("discover_hosts") as span:
            span.set_attribute("target_count", len(targets))
            
            live_hosts = []
            
            # For simplicity, we're returning all targets as live
            # In a real implementation, this would use ARP to verify hosts are active
            for target in targets:
                try:
                    # Use ARP to check if host is alive (if it's on local network)
                    if self._is_ip_in_local_network(target):
                        arp = ARP(pdst=target)
                        ether = Ether(dst="ff:ff:ff:ff:ff:ff")
                        packet = ether/arp
                        
                        # Send packet and wait for response with timeout
                        result = srp(packet, timeout=1, verbose=0)[0]
                        
                        if result:
                            live_hosts.append(target)
                    else:
                        # If not in local network, try ICMP ping
                        ping_packet = IP(dst=target)/TCP(dport=80, flags="S")
                        ping_response = sr1(ping_packet, timeout=1, verbose=0)
                        
                        if ping_response:
                            live_hosts.append(target)
                except Exception as e:
                    logger.warning(f"Error checking if host {target} is alive: {str(e)}")
                    # Include it anyway to be thorough
                    live_hosts.append(target)
            
            logger.info(f"Discovered {len(live_hosts)} live hosts out of {len(targets)} targets")
            span.set_attribute("live_host_count", len(live_hosts))
            
            return live_hosts
    
    def _is_ip_in_local_network(self, ip):
        """Check if IP is in local network"""
        # Simplified implementation - in a real app, this would check subnet
        return ip.startswith('192.168.') or ip.startswith('10.') or ip.startswith('172.')
    
    def _scan_port(self, scan_id, target, port, timeout, results):
        """Scan a specific port on a target"""
        with self.tracer.start_as_current_span("scan_port") as span:
            span.set_attribute("scan_id", scan_id)
            span.set_attribute("target", target)
            span.set_attribute("port", port)
            
            try:
                # Create SYN packet
                syn_packet = IP(dst=target)/TCP(dport=port, flags="S")
                
                # Send packet and wait for response with timeout
                response = sr1(syn_packet, timeout=timeout, verbose=0)
                
                # Process response
                port_status = {
                    'status': 'closed',
                    'service': self._guess_service(port)
                }
                
                if response:
                    if response.haslayer(TCP):
                        tcp_layer = response.getlayer(TCP)
                        
                        # Check TCP flags
                        if tcp_layer.flags & 0x12:  # SYN+ACK
                            port_status['status'] = 'open'
                        elif tcp_layer.flags & 0x14:  # RST+ACK
                            port_status['status'] = 'closed'
                
                # Update results
                results['results'][target]['ports'][port] = port_status
                
            except Exception as e:
                logger.warning(f"Error scanning {target}:{port}: {str(e)}")
                # Update results with error
                results['results'][target]['ports'][port] = {
                    'status': 'error',
                    'error': str(e),
                    'service': self._guess_service(port)
                }
    
    def _guess_service(self, port):
        """Guess the service name based on port number"""
        common_ports = {
            21: 'FTP',
            22: 'SSH',
            23: 'Telnet',
            25: 'SMTP',
            53: 'DNS',
            80: 'HTTP',
            110: 'POP3',
            143: 'IMAP',
            443: 'HTTPS',
            445: 'SMB',
            3306: 'MySQL',
            3389: 'RDP',
            5432: 'PostgreSQL',
            8080: 'HTTP-Proxy',
            8443: 'HTTPS-Alt'
        }
        
        return common_ports.get(port, f'Unknown ({port})')
    
    def _detect_anomalies(self, results):
        """Detect anomalies in scan results"""
        with self.tracer.start_as_current_span("detect_anomalies") as span:
            span.set_attribute("scan_id", results['scan_id'])
            
            # Process all scan results for anomalies
            anomalies = self.anomaly_detector.detect(results)
            
            # Add anomalies to results
            results['anomalies'] = anomalies
            
            logger.info(f"Detected {len(anomalies)} anomalies in scan {results['scan_id']}")
    
    def _save_results(self, scan_id, results):
        """Save scan results to file"""
        results_file = os.path.join(SCAN_RESULTS_DIR, f"{scan_id}.json")
        
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"Saved results for scan {scan_id} to {results_file}")
    
    def get_scan_status(self, scan_id):
        """Get the status of a running scan"""
        if scan_id in self.active_scans:
            return self.active_scans[scan_id]
        
        # Check if we have results for this scan
        if scan_id in self.scan_results:
            return {
                'status': 'completed',
                'progress': 100,
                'start_time': self.scan_results[scan_id]['start_time'],
                'end_time': self.scan_results[scan_id].get('end_time'),
                'duration': self.scan_results[scan_id].get('duration')
            }
        
        # Check if we have saved results
        results_file = os.path.join(SCAN_RESULTS_DIR, f"{scan_id}.json")
        if os.path.exists(results_file):
            with open(results_file, 'r') as f:
                results = json.load(f)
                
                return {
                    'status': 'completed',
                    'progress': 100,
                    'start_time': results['start_time'],
                    'end_time': results.get('end_time'),
                    'duration': results.get('duration')
                }
        
        return None
    
    def get_scan_results(self, scan_id):
        """Get the results of a completed scan"""
        # Check if we have results in memory
        if scan_id in self.scan_results:
            return self.scan_results[scan_id]
        
        # Check if we have saved results
        results_file = os.path.join(SCAN_RESULTS_DIR, f"{scan_id}.json")
        if os.path.exists(results_file):
            with open(results_file, 'r') as f:
                return json.load(f)
        
        return None

    def scan_with_scapy(self, target, ports):
        """Perform a TCP SYN scan using Scapy"""
        results = {}
        for port in ports:
            pkt = IP(dst=target)/TCP(dport=port, flags='S')
            resp = sr1(pkt, timeout=1, verbose=0)
            if resp is not None and resp.haslayer(TCP):
                if resp[TCP].flags == 0x12:  # SYN-ACK
                    results[port] = 'open'
                elif resp[TCP].flags == 0x14:  # RST-ACK
                    results[port] = 'closed'
                else:
                    results[port] = 'filtered'
            else:
                results[port] = 'filtered'
        return results

    def scan_with_alternative(self, target, ports):
        """Stub for alternative high-speed scanning frameworks (to be implemented)"""
        # Example: integrate masscan or nmap here
        return {port: 'unknown' for port in ports}

    def scan_with_masscan(self, target, ports):
        """Stub for masscan integration (alternative high-speed scanner)"""
        # This is a placeholder for masscan integration
        # Example: subprocess call to masscan binary
        # Return format should match scan_with_scapy
        return {port: 'unknown' for port in ports}

    def scan(self, target, ports, method='scapy'):
        if method == 'scapy':
            return self.scan_with_scapy(target, ports)
        elif method == 'masscan':
            return self.scan_with_masscan(target, ports)
        else:
            return self.scan_with_alternative(target, ports)
