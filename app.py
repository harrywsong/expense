# app.py - Updated for Firebase integration
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
import os

# Initialize Flask app
app = Flask(__name__, template_folder='.')
CORS(app)

@app.route('/')
def serve_index():
    """Serves the main HTML page."""
    return send_from_directory('.', 'index.html')

@app.route('/style.css')
def serve_css():
    """Serves the CSS file."""
    return send_from_directory('.', 'style.css', mimetype='text/css')

@app.route('/script.js')
def serve_js():
    """Serves the main JavaScript file."""
    return send_from_directory('.', 'script.js', mimetype='application/javascript')

@app.route('/firebase-config.js')
def serve_firebase_config():
    """Serves the Firebase configuration file."""
    return send_from_directory('.', 'firebase-config.js', mimetype='application/javascript')

# Health check endpoint
@app.route('/health')
def health_check():
    """Simple health check endpoint."""
    return {'status': 'healthy', 'message': 'Korean Personal Finance App is running'}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 9999))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)