"""
Configuration settings for the AI-powered scanner application
"""
import os

# Network Scanner Configuration
SCAN_TIMEOUT = 5  # Default timeout in seconds
DEFAULT_PORTS = [21, 22, 25, 53, 80, 443, 445, 3306, 3389, 8080]  # Common ports to scan
MAX_CONCURRENT_SCANS = 50  # Maximum number of concurrent scans
SCAN_RESULTS_DIR = "scan_results"  # Directory to store scan results

# AI Agent Configuration
AGENT_MODEL_PATH = os.path.join("models", "agent_model.pkl")
ANOMALY_MODEL_PATH = os.path.join("models", "anomaly_model.pkl")
CONFIDENCE_THRESHOLD = 0.7  # Confidence threshold for anomaly detection

# Voice Recognition Configuration
VOICE_COMMAND_TIMEOUT = 5  # Timeout for voice command recording in seconds
VOICE_RECOGNITION_LANGUAGE = "en-US"  # Default language for speech recognition

# OpenTelemetry Configuration
OTEL_SERVICE_NAME = "ai-scanner"
OTEL_EXPORTER_ENDPOINT = os.environ.get("OTEL_EXPORTER", "http://localhost:4317")

# Scan Types
SCAN_TYPES = {
    "quick": {
        "name": "Quick Scan",
        "description": "Fast scan of common ports",
        "ports": [22, 80, 443],
        "timeout": 2
    },
    "standard": {
        "name": "Standard Scan",
        "description": "Standard scan of common services",
        "ports": [21, 22, 25, 53, 80, 443, 445, 3306, 3389, 8080],
        "timeout": 5
    },
    "comprehensive": {
        "name": "Comprehensive Scan",
        "description": "Detailed scan of extended port range",
        "ports": list(range(1, 1025)),
        "timeout": 10
    },
    "custom": {
        "name": "Custom Scan",
        "description": "Scan with custom parameters",
        "ports": [],
        "timeout": 5
    }
}
