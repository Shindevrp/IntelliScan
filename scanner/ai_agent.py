"""
AI Agent for optimizing and analyzing network scans
"""
import os
import json
import logging
import random
import pickle
import re
from utils.telemetry import get_tracer
from config import AGENT_MODEL_PATH, CONFIDENCE_THRESHOLD
from typing import List, Dict, Any

# Configure logging
logger = logging.getLogger(__name__)

class ScannerAgent:
    """AI agent for network scanning optimization and analysis"""
    
    def __init__(self):
        """Initialize the AI agent"""
        self.tracer = get_tracer("scanner_agent")
        self.model = None
        
        # Load agent model if it exists
        self._load_model()
    
    def _load_model(self):
        """Load the AI agent model"""
        try:
            if os.path.exists(AGENT_MODEL_PATH):
                with open(AGENT_MODEL_PATH, 'rb') as f:
                    self.model = pickle.load(f)
                logger.info("Loaded AI agent model")
            else:
                logger.warning(f"Agent model not found at {AGENT_MODEL_PATH}, using heuristic-based approach")
        except Exception as e:
            logger.error(f"Error loading AI agent model: {str(e)}")
            logger.warning("Using heuristic-based approach instead")
    
    def optimize_scan_parameters(self, targets, scan_type, custom_ports=None):
        """Optimize scanning parameters based on input"""
        with self.tracer.start_as_current_span("optimize_scan_parameters") as span:
            span.set_attribute("original_targets", targets)
            span.set_attribute("original_scan_type", scan_type)
            
            # In a real implementation, this would use ML to optimize parameters
            # For now, we'll use some basic heuristics
            
            optimized_params = {
                'targets': targets,
                'scan_type': scan_type,
                'custom_ports': custom_ports
            }
            
            # Optimize target specification
            if ',' in targets:
                # Multiple targets separated by commas
                target_list = [t.strip() for t in targets.split(',')]
                optimized_params['targets'] = ','.join(target_list)
            elif '-' in targets and not targets.startswith('http'):
                # Possible IP range (e.g., 192.168.1.1-10)
                # Expand the range for better scanning
                optimized_params['targets'] = self._expand_ip_range(targets)
            
            # Optimize scan type based on target count
            target_count = len(optimized_params['targets'].split(','))
            if target_count > 10 and scan_type == 'comprehensive':
                # Too many targets for comprehensive scan, downgrade to standard
                logger.info("Downgrading scan type from comprehensive to standard due to high target count")
                optimized_params['scan_type'] = 'standard'
            
            logger.info(f"Optimized scan parameters: {optimized_params}")
            return optimized_params
    
    def _expand_ip_range(self, ip_range):
        """Expand an IP range into individual IPs"""
        # Simple implementation for common formats
        if '-' in ip_range:
            # Format like 192.168.1.1-10
            base_part, range_part = ip_range.rsplit('.', 1)
            if '-' in range_part:
                start, end = range_part.split('-')
                try:
                    start_num, end_num = int(start), int(end)
                    ips = [f"{base_part}.{i}" for i in range(start_num, end_num + 1)]
                    return ','.join(ips)
                except ValueError:
                    return ip_range
        
        return ip_range
    
    def analyze_scan_results(self, results):
        """Analyze scan results and provide insights"""
        with self.tracer.start_as_current_span("analyze_scan_results") as span:
            span.set_attribute("scan_id", results['scan_id'])
            
            # Add insights to results
            enhanced_results = results.copy()
            enhanced_results['insights'] = []
            
            # Count open/closed ports
            open_ports = 0
            closed_ports = 0
            total_ports = 0
            common_open_ports = {}
            
            for target, target_data in results['results'].items():
                for port, port_data in target_data.get('ports', {}).items():
                    total_ports += 1
                    if port_data.get('status') == 'open':
                        open_ports += 1
                        service = port_data.get('service', f"Unknown ({port})")
                        common_open_ports[service] = common_open_ports.get(service, 0) + 1
                    elif port_data.get('status') == 'closed':
                        closed_ports += 1
            
            # Add basic statistics
            enhanced_results['insights'].append({
                'type': 'statistics',
                'total_targets': len(results['targets']),
                'total_ports_scanned': total_ports,
                'open_ports': open_ports,
                'closed_ports': closed_ports,
                'error_ports': total_ports - open_ports - closed_ports
            })
            
            # Add common services insight
            if common_open_ports:
                common_services = sorted(common_open_ports.items(), key=lambda x: x[1], reverse=True)
                enhanced_results['insights'].append({
                    'type': 'common_services',
                    'services': [{"service": service, "count": count} for service, count in common_services[:5]]
                })
            
            # Add security recommendations based on open ports
            security_recommendations = self._generate_security_recommendations(common_open_ports)
            if security_recommendations:
                enhanced_results['insights'].append({
                    'type': 'security_recommendations',
                    'recommendations': security_recommendations
                })
            
            # Add anomalies if present
            if 'anomalies' in results and results['anomalies']:
                enhanced_results['insights'].append({
                    'type': 'anomalies',
                    'count': len(results['anomalies']),
                    'details': results['anomalies'][:5]  # Show top 5 anomalies
                })
            
            logger.info(f"Added {len(enhanced_results['insights'])} insights to scan results")
            return enhanced_results
    
    def _generate_security_recommendations(self, common_open_ports):
        """Generate security recommendations based on open ports"""
        recommendations = []
        
        # Check for common security issues
        for service, count in common_open_ports.items():
            if 'HTTP' in service:
                recommendations.append({
                    'severity': 'medium',
                    'service': service,
                    'description': 'Web services detected. Ensure they are properly secured with HTTPS and access controls.',
                    'recommendation': 'Configure HTTPS, implement secure headers, and restrict access if not publicly needed.'
                })
            
            if 'SSH' in service:
                recommendations.append({
                    'severity': 'high',
                    'service': service,
                    'description': 'SSH services detected. These are common targets for brute force attacks.',
                    'recommendation': 'Use key-based authentication, disable password login, and implement fail2ban.'
                })
            
            if 'FTP' in service:
                recommendations.append({
                    'severity': 'high',
                    'service': service,
                    'description': 'FTP services detected. FTP is insecure and transfers data in plaintext.',
                    'recommendation': 'Replace with SFTP or FTPS for secure file transfers.'
                })
            
            if 'SMB' in service:
                recommendations.append({
                    'severity': 'high',
                    'service': service,
                    'description': 'SMB services detected. SMB has had critical vulnerabilities in the past.',
                    'recommendation': 'Ensure SMB is properly configured, up-to-date, and not exposed to the internet.'
                })
            
            if 'RDP' in service:
                recommendations.append({
                    'severity': 'high',
                    'service': service,
                    'description': 'RDP services detected. RDP is a common target for attacks.',
                    'recommendation': 'Use strong passwords, implement Network Level Authentication, and consider a VPN.'
                })
        
        return recommendations
    
    def interpret_voice_command(self, command_text):
        """Interpret voice command and convert to scan parameters"""
        with self.tracer.start_as_current_span("interpret_voice_command") as span:
            span.set_attribute("command_text", command_text)
            
            return self._parse_command(command_text)
    
    def interpret_text_command(self, command_text):
        """Interpret text command and convert to scan parameters"""
        with self.tracer.start_as_current_span("interpret_text_command") as span:
            span.set_attribute("command_text", command_text)
            
            return self._parse_command(command_text)
    
    def _parse_command(self, command_text):
        """Parse command text and extract scan parameters"""
        # Default parameters
        params = {
            'targets': '',
            'scan_type': 'standard',
            'custom_ports': ''
        }
        
        # Extract targets
        ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}(?:/\d{1,2})?\b'
        domain_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b'
        
        # Find IPs
        ips = re.findall(ip_pattern, command_text)
        if ips:
            params['targets'] = ','.join(ips)
        
        # Find domains if no IPs
        if not params['targets']:
            domains = re.findall(domain_pattern, command_text)
            if domains:
                params['targets'] = ','.join(domains)
        
        # Extract scan type
        if re.search(r'\b(?:quick|fast|rapid)\b', command_text, re.IGNORECASE):
            params['scan_type'] = 'quick'
        elif re.search(r'\b(?:comprehensive|full|detailed|complete)\b', command_text, re.IGNORECASE):
            params['scan_type'] = 'comprehensive'
        elif re.search(r'\bcustom\b', command_text, re.IGNORECASE):
            params['scan_type'] = 'custom'
        
        # Extract custom ports if mentioned
        port_pattern = r'ports? (?:are |is |)(?:on |at |)(\d+(?:,\s*\d+)*)'
        port_match = re.search(port_pattern, command_text, re.IGNORECASE)
        if port_match:
            params['custom_ports'] = port_match.group(1).replace(' ', '')
        
        # If no target was found, look for keywords
        if not params['targets'] and ('local' in command_text.lower() or 'localhost' in command_text.lower()):
            params['targets'] = '127.0.0.1'
        elif not params['targets'] and 'network' in command_text.lower():
            params['targets'] = '192.168.1.1-254'  # Common home network range
        
        logger.info(f"Parsed command into parameters: {params}")
        return params
    
class AgenticWorkflow:
    """Advanced agentic workflow for RAG and decision-making"""
    def __init__(self, retriever, planner, executor, memory=None):
        self.retriever = retriever
        self.planner = planner
        self.executor = executor
        self.memory = memory or []

    def run(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        # Step 1: Retrieve relevant knowledge
        retrieved_docs = self.retriever.retrieve(query, context)
        self.memory.append({'step': 'retrieve', 'docs': retrieved_docs})
        # Step 2: Plan next actions
        plan = self.planner.plan(query, retrieved_docs, context)
        self.memory.append({'step': 'plan', 'plan': plan})
        # Step 3: Execute plan
        results = self.executor.execute(plan, context)
        self.memory.append({'step': 'execute', 'results': results})
        # Step 4: Aggregate and return
        return {'retrieved': retrieved_docs, 'plan': plan, 'results': results}

# Example stub retriever, planner, executor
class SimpleRetriever:
    def retrieve(self, query, context):
        # Placeholder: return context or docs
        return context.get('docs', [])

class SimplePlanner:
    def plan(self, query, docs, context):
        # Placeholder: return a plan based on docs
        return {'action': 'analyze', 'docs': docs}

class SimpleExecutor:
    def execute(self, plan, context):
        # Placeholder: execute the plan
        return {'analysis': 'done', 'details': plan}

    def advanced_agentic_analysis(self, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Run an advanced agentic workflow (RAG) for decision-making"""
        retriever = SimpleRetriever()
        planner = SimplePlanner()
        executor = SimpleExecutor()
        workflow = AgenticWorkflow(retriever, planner, executor)
        return workflow.run(query, context)
