# app.py
from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
import os

# Initialize Flask app
app = Flask(__name__, template_folder='templates')
CORS(app)

@app.route('/')
def serve_index():
    """Serves the main HTML page from templates folder."""
    return render_template('index.html')

@app.route('/style.css')
def serve_css():
    """Serves the CSS file from templates folder."""
    return send_from_directory('templates', 'style.css', mimetype='text/css')

@app.route('/script.js')
def serve_js():
    """Serves the JavaScript file from templates folder."""
    return send_from_directory('templates', 'script.js', mimetype='application/javascript')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=9999, debug=True)