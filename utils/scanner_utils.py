"""
Utility functions for the network scanner
"""
import os
import json
import logging
import ipaddress
import re
from datetime import datetime
from utils.telemetry import get_tracer
from config import SCAN_RESULTS_DIR

# Configure logging
logger = logging.getLogger(__name__)

# Ensure results directory exists
os.makedirs(SCAN_RESULTS_DIR, exist_ok=True)

def parse_target_input(target_input):
    """Parse target input string into list of IP addresses or hostnames"""
    tracer = get_tracer("scanner_utils")
    
    with tracer.start_as_current_span("parse_target_input") as span:
        span.set_attribute("target_input", target_input)
        
        targets = []
        
        if not target_input:
            return targets
        
        # Split by commas
        target_list = [t.strip() for t in target_input.split(',')]
        
        for target in target_list:
            # Check if it's an IP range with dash
            if '-' in target and not target.startswith('http'):
                expanded = expand_ip_range(target)
                targets.extend(expanded)
            
            # Check if it's a CIDR notation
            elif '/' in target:
                try:
                    network = ipaddress.ip_network(target, strict=False)
                    for ip in network.hosts():
                        targets.append(str(ip))
                except ValueError:
                    # Not a valid CIDR, add as is
                    targets.append(target)
            
            # Single target
            else:
                targets.append(target)
        
        # Remove duplicates
        targets = list(dict.fromkeys(targets))
        
        logger.info(f"Parsed {len(targets)} targets from input: {target_input[:50]}...")
        span.set_attribute("target_count", len(targets))
        
        return targets

def expand_ip_range(ip_range):
    """Expand an IP range into a list of IPs"""
    tracer = get_tracer("scanner_utils")
    
    with tracer.start_as_current_span("expand_ip_range") as span:
        span.set_attribute("ip_range", ip_range)
        
        try:
            # Handle format like 192.168.1.1-10
            if '-' in ip_range:
                base_part, range_part = ip_range.rsplit('.', 1)
                
                if '-' in range_part:
                    start, end = range_part.split('-')
                    start_num, end_num = int(start), int(end)
                    
                    if 0 <= start_num <= 255 and 0 <= end_num <= 255:
                        expanded = [f"{base_part}.{i}" for i in range(start_num, end_num + 1)]
                        span.set_attribute("expanded_count", len(expanded))
                        return expanded
        except Exception as e:
            logger.error(f"Error expanding IP range {ip_range}: {str(e)}")
            span.record_exception(e)
        
        # Return original if parsing fails
        return [ip_range]

def validate_ip_address(ip):
    """Validate an IP address"""
    try:
        ipaddress.ip_address(ip)
        return True
    except ValueError:
        return False

def is_valid_hostname(hostname):
    """Validate a hostname"""
    hostname_pattern = re.compile(r'^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$')
    return bool(hostname_pattern.match(hostname))

def save_scan_result(scan_id, results):
    """Save scan results to file"""
    tracer = get_tracer("scanner_utils")
    
    with tracer.start_as_current_span("save_scan_result") as span:
        span.set_attribute("scan_id", scan_id)
        
        try:
            results_file = os.path.join(SCAN_RESULTS_DIR, f"{scan_id}.json")
            
            with open(results_file, 'w') as f:
                json.dump(results, f, indent=2)
            
            logger.info(f"Saved results for scan {scan_id} to {results_file}")
            return True
        except Exception as e:
            logger.error(f"Error saving scan results: {str(e)}")
            span.record_exception(e)
            return False

def get_scan_history():
    """Get scan history from saved results"""
    tracer = get_tracer("scanner_utils")
    
    with tracer.start_as_current_span("get_scan_history") as span:
        history = []
        
        try:
            # List all JSON files in the results directory
            for filename in os.listdir(SCAN_RESULTS_DIR):
                if filename.endswith(".json"):
                    file_path = os.path.join(SCAN_RESULTS_DIR, filename)
                    
                    try:
                        with open(file_path, 'r') as f:
                            results = json.load(f)
                            
                            # Extract basic info for history
                            scan_id = results.get('scan_id', filename.replace('.json', ''))
                            start_time = results.get('start_time', 0)
                            targets = results.get('targets', [])
                            
                            # Format start time
                            if start_time:
                                start_time_str = datetime.fromtimestamp(start_time).strftime('%Y-%m-%d %H:%M:%S')
                            else:
                                start_time_str = 'Unknown'
                            
                            # Count results
                            target_count = len(targets) if isinstance(targets, list) else 1
                            
                            # Count open ports
                            open_ports = 0
                            for target, target_data in results.get('results', {}).items():
                                for port, port_data in target_data.get('ports', {}).items():
                                    if port_data.get('status') == 'open':
                                        open_ports += 1
                            
                            history.append({
                                'scan_id': scan_id,
                                'timestamp': start_time,
                                'datetime': start_time_str,
                                'target_count': target_count,
                                'open_ports': open_ports,
                                'targets': targets[:3] if isinstance(targets, list) else [targets]  # First 3 targets
                            })
                    except Exception as e:
                        logger.warning(f"Error reading scan history from {filename}: {str(e)}")
            
            # Sort by timestamp (newest first)
            history.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
            
            span.set_attribute("history_count", len(history))
            return history
        except Exception as e:
            logger.error(f"Error getting scan history: {str(e)}")
            span.record_exception(e)
            return []
