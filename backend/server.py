"""
Flask Server with WebSocket Support for Real-time Gesture Detection
Processes webcam frames and sends direction commands (Up/Down/Left/Right)
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import cv2
import numpy as np
import base64
import time
from hand_tracker import HandTracker

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Initialize hand tracker
hand_tracker = HandTracker()

@app.route('/')
def home():
    return jsonify({"message": "Server is running!", "status": "ready"})

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print("✅ Client connected")
    emit('response', {'message': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print("❌ Client disconnected")

@socketio.on('frame')
def handle_frame(data):
    """
    Process webcam frame from client and detect gestures
    
    Args:
        data: Dictionary containing base64 encoded frame
    """
    try:
        # Decode base64 image
        image_data = data.get('image', '')
        if not image_data:
            return
        
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64 to numpy array
        nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return
        
        # Detect gesture
        direction, annotated_frame, hand_data = hand_tracker.detect_gesture(frame)
        
        # Send direction command back to client
        if direction:
            emit('gesture_command', {
                'direction': direction,
                'status': 'success',
                'timestamp': int(time.time() * 1000)  # Milliseconds timestamp
            })
            print(f"📤 Sent gesture command: {direction}")
        
        # Send hand position data for overlay drawing
        if hand_data:
            emit('hand_data', hand_data)
        
    except Exception as e:
        print(f"❌ Error processing frame: {str(e)}")
        emit('error', {'message': str(e)})

@socketio.on('start_tracking')
def handle_start_tracking():
    """Handle start tracking request"""
    print("🎯 Hand tracking started")
    emit('response', {'message': 'Hand tracking started'})

@socketio.on('stop_tracking')
def handle_stop_tracking():
    """Handle stop tracking request"""
    print("🛑 Hand tracking stopped")
    emit('response', {'message': 'Hand tracking stopped'})

if __name__ == '__main__':
    print("🚀 Starting Flask server with WebSocket support...")
    print("📡 Server running on http://localhost:5000")
    print("🔌 WebSocket ready for real-time communication")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
