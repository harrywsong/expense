# app.py
from flask import Flask, render_template
from flask_cors import CORS
import os

# Initialize Flask app and enable CORS
# The template_folder argument can be specified but is not required if the folder is named 'templates'
app = Flask(__name__)
CORS(app)

@app.route('/')
def serve_index():
    """Serves the main HTML page from the templates folder."""
    return render_template('index.html')

if __name__ == '__main__':
    # This part is for local testing. In production, a different server handles this.
    app.run(host='0.0.0.0', port=9999, debug=True)