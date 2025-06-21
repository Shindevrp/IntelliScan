"""
API routes for the AI-powered scanner
"""
import json
import uuid
import logging
from flask import request, jsonify, session
from scanner.network_scanner import NetworkScanner
from scanner.ai_agent import ScannerAgent
from utils.voice_processor import process_voice_command
from utils.scanner_utils import parse_target_input, get_scan_history, save_scan_result
from config import SCAN_TYPES

# Configure logging
logger = logging.getLogger(__name__)

# Initialize scanner and AI agent
network_scanner = NetworkScanner()
scanner_agent = ScannerAgent()

def register_api_routes(app):
    """Register all API routes with the Flask app"""
    
    @app.route('/api/scan', methods=['POST'])
    def start_scan():
        """Start a new network scan"""
        try:
            data = request.json
            
            # Generate a unique scan ID
            scan_id = str(uuid.uuid4())
            
            # Get scan parameters
            targets = data.get('targets', '')
            scan_type = data.get('scan_type', 'standard')
            custom_ports = data.get('custom_ports', '')
            
            # Use AI agent to optimize scan parameters
            optimized_params = scanner_agent.optimize_scan_parameters(
                targets=targets,
                scan_type=scan_type,
                custom_ports=custom_ports
            )
            
            # Process targets
            processed_targets = parse_target_input(optimized_params['targets'])
            
            if not processed_targets:
                return jsonify({
                    'status': 'error',
                    'message': 'No valid targets specified'
                }), 400
            
            # Get scan configuration based on scan type
            scan_config = SCAN_TYPES.get(optimized_params['scan_type'], SCAN_TYPES['standard'])
            
            # Use custom ports if provided and scan type is custom
            if optimized_params['scan_type'] == 'custom' and optimized_params['custom_ports']:
                try:
                    scan_ports = [int(p.strip()) for p in optimized_params['custom_ports'].split(',') if p.strip()]
                except ValueError:
                    return jsonify({
                        'status': 'error',
                        'message': 'Invalid port specification'
                    }), 400
            else:
                scan_ports = scan_config['ports']
            
            # Start scan in background
            network_scanner.start_scan(
                scan_id=scan_id,
                targets=processed_targets,
                ports=scan_ports,
                timeout=scan_config['timeout']
            )
            
            return jsonify({
                'status': 'success',
                'message': 'Scan started',
                'scan_id': scan_id,
                'targets': processed_targets,
                'ports': scan_ports,
                'scan_type': optimized_params['scan_type']
            })
            
        except Exception as e:
            logger.error(f"Error starting scan: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Error starting scan: {str(e)}'
            }), 500
    
    @app.route('/api/scan/<scan_id>/status', methods=['GET'])
    def scan_status(scan_id):
        """Get the status of a running scan"""
        try:
            status = network_scanner.get_scan_status(scan_id)
            if status:
                return jsonify(status)
            return jsonify({
                'status': 'error',
                'message': 'Scan not found'
            }), 404
        except Exception as e:
            logger.error(f"Error getting scan status: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Error getting scan status: {str(e)}'
            }), 500
    
    @app.route('/api/scan/<scan_id>/results', methods=['GET'])
    def scan_results(scan_id):
        """Get the results of a completed scan"""
        try:
            results = network_scanner.get_scan_results(scan_id)
            if results:
                # Enhance results with AI agent insights
                enhanced_results = scanner_agent.analyze_scan_results(results)
                return jsonify(enhanced_results)
            return jsonify({
                'status': 'error',
                'message': 'Scan results not found'
            }), 404
        except Exception as e:
            logger.error(f"Error getting scan results: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Error getting scan results: {str(e)}'
            }), 500
    
    @app.route('/api/voice-command', methods=['POST'])
    def process_voice():
        """Process voice command and convert to scan parameters"""
        try:
            audio_data = request.files.get('audio')
            
            if not audio_data:
                return jsonify({
                    'status': 'error',
                    'message': 'No audio data provided'
                }), 400
            
            # Process voice command
            command_text = process_voice_command(audio_data)
            
            if not command_text:
                return jsonify({
                    'status': 'error',
                    'message': 'Could not understand voice command'
                }), 400
            
            # Use AI agent to interpret the command
            scan_params = scanner_agent.interpret_voice_command(command_text)
            
            return jsonify({
                'status': 'success',
                'command_text': command_text,
                'scan_params': scan_params
            })
            
        except Exception as e:
            logger.error(f"Error processing voice command: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Error processing voice command: {str(e)}'
            }), 500
    
    @app.route('/api/text-command', methods=['POST'])
    def process_text():
        """Process text command and convert to scan parameters"""
        try:
            data = request.json
            command_text = data.get('command', '')
            
            if not command_text:
                return jsonify({
                    'status': 'error',
                    'message': 'No command text provided'
                }), 400
            
            # Use AI agent to interpret the command
            scan_params = scanner_agent.interpret_text_command(command_text)
            
            return jsonify({
                'status': 'success',
                'command_text': command_text,
                'scan_params': scan_params
            })
            
        except Exception as e:
            logger.error(f"Error processing text command: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Error processing text command: {str(e)}'
            }), 500
    
    @app.route('/api/scan-types', methods=['GET'])
    def get_scan_types():
        """Get available scan types"""
        return jsonify(SCAN_TYPES)
    
    @app.route('/api/scan-history', methods=['GET'])
    def scan_history():
        """Get scan history"""
        try:
            history = get_scan_history()
            return jsonify({
                'status': 'success',
                'history': history
            })
        except Exception as e:
            logger.error(f"Error getting scan history: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Error getting scan history: {str(e)}'
            }), 500
