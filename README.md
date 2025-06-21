# High-Speed AI-Powered Scanner with AI Agents

## Overview
This project is a high-speed, AI-powered network scanner that leverages advanced AI agents, anomaly detection, and observability to deliver rapid, intelligent, and scalable network analysis. The system is designed for real-time data processing, automated decision-making, and enhanced security insights, making it ideal for modern cybersecurity challenges.

---

## Features
- **AI Agent Layer:** Advanced agentic workflow (RAG-style) for optimizing scan strategies and analyzing results.
- **Network Scanning:** Uses Scapy for packet-level scanning and is extensible to alternative high-speed frameworks.
- **Anomaly Detection:** Machine learning and rule-based models for detecting unusual network patterns and vulnerabilities.
- **Telemetry & Observability:** Integrated with OpenTelemetry for real-time monitoring and performance tracking.
- **User Dashboard:** Interactive web dashboard for scan control, visualization, and reporting.
- **API Layer:** RESTful API endpoints for scan management, results retrieval, and voice/text command processing.
- **Voice Command Support:** Accepts and processes voice commands for hands-free operation.
- **Cloud Ready:** Designed for easy deployment to cloud infrastructure for scalability.
- **Security Recommendations:** Provides actionable security insights based on scan results.
- **Extensible Architecture:** Modular codebase for easy addition of new scanning techniques, AI models, or integrations.

---

## Project Structure & Key Files

```
IntelliScan/
├── app.py                # Flask app entry point, initializes app and routes
├── main.py               # Main script to run the application
├── config.py             # Configuration variables and constants
├── pyproject.toml        # Python project metadata and dependencies
├── api/
│   └── routes.py         # API endpoints for scan, results, and commands
├── scanner/
│   ├── ai_agent.py       # AI agent with advanced agentic workflow (RAG, planning, execution)
│   ├── anomaly_detection.py # ML and rule-based anomaly detection
│   └── network_scanner.py   # Scapy-based and alternative network scanning
├── utils/
│   ├── scanner_utils.py  # Utility functions for scanning
│   ├── telemetry.py      # OpenTelemetry setup and tracing utilities
│   └── voice_processor.py# Voice command processing (SpeechRecognition)
├── static/
│   ├── css/              # Custom CSS for dashboard UI
│   └── js/               # JavaScript for dashboard interactivity
├── templates/
│   ├── index.html        # Main dashboard page
│   ├── layout.html       # Base HTML layout
│   └── results.html      # Scan results visualization
└── scan_results/         # Stores scan result JSON files
```

---

## File & Module Details

### app.py
- Initializes the Flask app, configures extensions, and registers API routes.

### main.py
- Main entry point to run the application.

### config.py
- Stores configuration constants (e.g., model paths, thresholds).

### api/routes.py
- Defines REST API endpoints for:
  - `/api/scan` (start a scan)
  - `/api/scan/<scan_id>/status` (check scan status)
  - `/api/scan/<scan_id>/results` (get results)
  - `/api/voice-command` and `/api/text-command` (process commands)

### scanner/ai_agent.py
- Implements the `ScannerAgent` class with:
  - **Advanced Agentic Workflow:** Modular RAG-style pipeline (Retriever, Planner, Executor) for intelligent scan optimization and result analysis.
  - Methods for optimizing scan parameters, analyzing results, and interpreting commands.

### scanner/anomaly_detection.py
- Implements the `AnomalyDetector` class:
  - Loads ML models or uses rule-based logic to detect anomalies in scan results.
  - Methods for identifying unusual port combinations, vulnerabilities, and network patterns.

### scanner/network_scanner.py
- Implements the `NetworkScanner` class:
  - Uses Scapy for TCP SYN scans.
  - Stub for integrating alternative high-speed scanning frameworks (e.g., masscan, nmap).

### utils/scanner_utils.py
- Helper functions for scanning and data processing.

### utils/telemetry.py
- Sets up OpenTelemetry tracing and monitoring for observability.

### utils/voice_processor.py
- Processes voice commands using the SpeechRecognition library.

### static/css/ & static/js/
- Frontend assets for the dashboard UI and interactivity.

### templates/
- Jinja2 HTML templates for the web dashboard and results display.

### scan_results/
- Stores output JSON files for each scan session.

---

## How to Use

### 1. Install Dependencies
Ensure you have Python 3.8+ and pip. Install dependencies:
```sh
pip install -r requirements.txt
```
Or, if using `pyproject.toml`:
```sh
pip install .
```

### 2. Run the Application
```sh
python main.py
```
The web dashboard will be available at `http://localhost:5000`.

### 3. Start a Scan
- Use the dashboard or send a POST request to `/api/scan` with target parameters.
- Monitor scan status and view results via the dashboard or API.

### 4. Voice/Text Commands
- Use the dashboard or API endpoints to submit voice or text commands for scan control.

### 5. Observability
- OpenTelemetry traces are available for monitoring and debugging.

---

## Technologies & Techniques
- **AI Agents:** Modular agentic workflow (Retriever, Planner, Executor, Memory)
- **Machine Learning:** Anomaly detection using ML models and heuristics
- **Network Scanning:** Scapy (packet crafting), extensible to masscan/nmap
- **Observability:** OpenTelemetry for tracing and monitoring
- **Web Framework:** Flask (API, dashboard)
- **Voice Processing:** SpeechRecognition for voice command input

---

## For New Developers
- Start by reading `app.py` and `main.py` to understand the app flow.
- Explore `scanner/ai_agent.py` for the agentic workflow and decision logic.
- Review `scanner/anomaly_detection.py` and `scanner/network_scanner.py` for core scanning and analysis logic.
- Use the dashboard for interactive control, or the API for automation.
- All modules are documented and modular for easy extension.

---

## Author
shinde vinayak rao patil
