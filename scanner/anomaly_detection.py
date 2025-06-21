"""
Anomaly detection for network scan results
"""
import os
import logging
import pickle
import numpy as np
from utils.telemetry import get_tracer
from config import ANOMALY_MODEL_PATH, CONFIDENCE_THRESHOLD

# Configure logging
logger = logging.getLogger(__name__)

class AnomalyDetector:
    """Anomaly detection for network scanning results"""
    
    def __init__(self):
        """Initialize the anomaly detector"""
        self.tracer = get_tracer("anomaly_detector")
        self.model = None
        
        # Load anomaly detection model if it exists
        self._load_model()
    
    def _load_model(self):
        """Load the anomaly detection model"""
        try:
            if os.path.exists(ANOMALY_MODEL_PATH):
                with open(ANOMALY_MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info("Loaded anomaly detection model")
            else:
                logger.warning(f"Anomaly detection model not found at {ANOMALY_MODEL_PATH}, using rule-based detection")
        except Exception as e:
            logger.error(f"Error loading anomaly detection model: {str(e)}")
            logger.warning("Using rule-based anomaly detection instead")
    
    def detect(self, scan_results):
        """Detect anomalies in scan results"""
        with self.tracer.start_as_current_span("detect_anomalies") as span:
            span.set_attribute("scan_id", scan_results['scan_id'])
            
            # In a real implementation, this would use ML for anomaly detection
            # For now, we'll use some basic rules
            
            anomalies = []
            
            # Check for unusual port combinations
            unusual_port_combinations = self._check_unusual_port_combinations(scan_results)
            anomalies.extend(unusual_port_combinations)
            
            # Check for potential vulnerabilities
            potential_vulnerabilities = self._check_potential_vulnerabilities(scan_results)
            anomalies.extend(potential_vulnerabilities)
            
            # Check for unusual network patterns
            unusual_patterns = self._check_unusual_network_patterns(scan_results)
            anomalies.extend(unusual_patterns)
            
            logger.info(f"Detected {len(anomalies)} anomalies")
            return anomalies
    
    def _check_unusual_port_combinations(self, scan_results):
        """Check for unusual combinations of open ports"""
        anomalies = []
        
        # Suspicious port combinations
        suspicious_combinations = [
            {'ports': [22, 2222], 'description': 'Multiple SSH ports open'},
            {'ports': [80, 8080, 8888], 'description': 'Multiple HTTP ports open'},
            {'ports': [21, 22, 23], 'description': 'Multiple remote access services'},
            {'ports': [3306, 5432], 'description': 'Multiple database services'}
        ]
        
        for target, target_data in scan_results['results'].items():
            open_ports = []
            
            for port, port_data in target_data.get('ports', {}).items():
                if port_data.get('status') == 'open':
                    open_ports.append(int(port))
            
            for combo in suspicious_combinations:
                matching_ports = [p for p in combo['ports'] if p in open_ports]
                if len(matching_ports) >= 2:
                    anomalies.append({
                        'type': 'unusual_port_combination',
                        'target': target,
                        'ports': matching_ports,
                        'description': combo['description'],
                        'severity': 'medium',
                        'confidence': 0.75
                    })
        
        return anomalies
    
    def _check_potential_vulnerabilities(self, scan_results):
        """Check for potential vulnerabilities based on open ports"""
        anomalies = []
        
        # Known vulnerable services
        vulnerable_services = [
            {'port': 21, 'service': 'FTP', 'description': 'Plaintext FTP service detected', 'severity': 'high'},
            {'port': 23, 'service': 'Telnet', 'description': 'Plaintext Telnet service detected', 'severity': 'high'},
            {'port': 25, 'service': 'SMTP', 'description': 'SMTP service might be vulnerable to relay attacks', 'severity': 'medium'},
            {'port': 445, 'service': 'SMB', 'description': 'SMB service might be vulnerable to exploits', 'severity': 'high'},
            {'port': 3389, 'service': 'RDP', 'description': 'RDP service might be vulnerable to brute force', 'severity': 'medium'}
        ]
        
        for target, target_data in scan_results['results'].items():
            for port, port_data in target_data.get('ports', {}).items():
                if port_data.get('status') == 'open':
                    port_num = int(port)
                    
                    for vuln in vulnerable_services:
                        if port_num == vuln['port']:
                            anomalies.append({
                                'type': 'potential_vulnerability',
                                'target': target,
                                'port': port_num,
                                'service': port_data.get('service', vuln['service']),
                                'description': vuln['description'],
                                'severity': vuln['severity'],
                                'confidence': 0.8
                            })
        
        return anomalies
    
    def _check_unusual_network_patterns(self, scan_results):
        """Check for unusual network patterns"""
        anomalies = []
        
        # Get all targets with open ports
        targets_with_open_ports = {}
        
        for target, target_data in scan_results['results'].items():
            open_ports = []
            
            for port, port_data in target_data.get('ports', {}).items():
                if port_data.get('status') == 'open':
                    open_ports.append(int(port))
            
            if open_ports:
                targets_with_open_ports[target] = open_ports
        
        # Check for identical port patterns across multiple hosts
        if len(targets_with_open_ports) > 1:
            # Group hosts by their open port pattern
            port_patterns = {}
            
            for target, open_ports in targets_with_open_ports.items():
                port_pattern = tuple(sorted(open_ports))
                if port_pattern not in port_patterns:
                    port_patterns[port_pattern] = []
                port_patterns[port_pattern].append(target)
            
            # Check for identical port patterns
            for port_pattern, targets in port_patterns.items():
                if len(targets) > 1 and len(port_pattern) > 2:
                    anomalies.append({
                        'type': 'identical_port_pattern',
                        'targets': targets,
                        'ports': list(port_pattern),
                        'description': f"Multiple hosts ({len(targets)}) have identical open port patterns",
                        'severity': 'low',
                        'confidence': 0.7
                    })
        
        return anomalies
