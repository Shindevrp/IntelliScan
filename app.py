import os
import logging
from flask import Flask, render_template, request, jsonify, session
from utils.telemetry import setup_telemetry
from api.routes import register_api_routes

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")

# Set up OpenTelemetry
setup_telemetry(app)

# Register API routes
register_api_routes(app)

@app.route('/')
def index():
    """Main dashboard page"""
    return render_template('index.html')

@app.route('/results')
def results():
    """Results visualization page"""
    scan_id = request.args.get('scan_id', None)
    return render_template('results.html', scan_id=scan_id)

@app.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors"""
    return render_template('index.html'), 404

@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    logger.error(f"Server error: {str(e)}")
    return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
