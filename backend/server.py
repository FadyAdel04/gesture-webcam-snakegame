from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({"message": "Server is running!"})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
