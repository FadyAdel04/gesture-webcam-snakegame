// script.js

let cameraStream = null;
let socket = null;
let frameInterval = null;
let isTracking = false;

// 1️⃣ Initialize Socket.IO Connection
function initializeSocket() {
  socket = io('http://localhost:5000');

  socket.on('connect', () => {
    console.log('✅ WebSocket connected');
    updateStatus('✅ Connected to server (WebSocket ready)', '#00ff99');
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
    updateStatus('❌ Disconnected from server', '#ff5555');
  });

  socket.on('gesture_command', (data) => {
    console.log('📥 Received gesture command:', data);
    displayGesture(data.direction);
  });

  socket.on('annotated_frame', (data) => {
    // Optional: Display annotated frame if needed
    // const img = document.createElement('img');
    // img.src = data.image;
    // document.body.appendChild(img);
  });

  socket.on('response', (data) => {
    console.log('📨 Server response:', data.message);
  });

  socket.on('error', (data) => {
    console.error('❌ Server error:', data.message);
    updateStatus('❌ Error: ' + data.message, '#ff5555');
  });
}

// 2️⃣ Check Backend Connection (HTTP)
async function checkBackendConnection() {
  const statusElement = document.getElementById("status");

  try {
    const response = await fetch("http://localhost:5000/");
    const data = await response.json();

    console.log("✅ Backend connected:", data);
    updateStatus("✅ Backend Connected: " + data.message, "#00ff99");
  } catch (error) {
    console.error("❌ Failed to connect to backend:", error);
    updateStatus("❌ Failed to connect to backend", "#ff5555");
  }
}

function updateStatus(message, color) {
  const statusElement = document.getElementById("status");
  statusElement.textContent = message;
  statusElement.style.color = color;
}

// 3️⃣ Handle Webcam
const startCamButton = document.getElementById("startCam");
const stopCamButton = document.getElementById("stopCam");
const webcamVideo = document.getElementById("webcam");
const canvas = document.getElementById("canvas");

// Open camera
startCamButton.addEventListener("click", async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 640, 
        height: 480 
      } 
    });
    webcamVideo.srcObject = cameraStream;
    webcamVideo.style.display = "block";
    startCamButton.style.display = "none";
    stopCamButton.style.display = "inline-block";
    console.log("🎥 Webcam stream started.");
    
    // Start sending frames to server
    startFrameCapture();
    isTracking = true;
    
    if (socket && socket.connected) {
      socket.emit('start_tracking');
    }
  } catch (error) {
    alert("❌ Could not access webcam. Please allow camera permissions.");
    console.error("Webcam error:", error);
  }
});

// Close camera
stopCamButton.addEventListener("click", () => {
  if (cameraStream) {
    const tracks = cameraStream.getTracks();
    tracks.forEach(track => track.stop());
    webcamVideo.srcObject = null;
    webcamVideo.style.display = "none";
    startCamButton.style.display = "inline-block";
    stopCamButton.style.display = "none";
    console.log("🛑 Webcam stopped.");
    
    // Stop sending frames
    stopFrameCapture();
    isTracking = false;
    
    if (socket && socket.connected) {
      socket.emit('stop_tracking');
    }
  }
});

// 4️⃣ Capture and Send Frames
function startFrameCapture() {
  // Set canvas dimensions to match video
  canvas.width = webcamVideo.videoWidth || 640;
  canvas.height = webcamVideo.videoHeight || 480;
  
  // Capture frames at ~15 FPS (every ~66ms) for better performance
  frameInterval = setInterval(() => {
    if (webcamVideo.readyState === webcamVideo.HAVE_ENOUGH_DATA && isTracking) {
      captureAndSendFrame();
    }
  }, 66); // ~15 FPS
}

function stopFrameCapture() {
  if (frameInterval) {
    clearInterval(frameInterval);
    frameInterval = null;
  }
}

function captureAndSendFrame() {
  if (!socket || !socket.connected) {
    return;
  }

  try {
    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.7);
    
    // Send frame to server via WebSocket
    socket.emit('frame', { image: imageData });
  } catch (error) {
    console.error('Error capturing frame:', error);
  }
}

// 5️⃣ Display Gesture Commands
const gestureDisplay = document.getElementById("gestureDisplay");
const gestureHistory = document.getElementById("gestureHistory");
let gestureHistoryList = [];

function displayGesture(direction) {
  if (!direction) return;
  
  // Update main display
  gestureDisplay.textContent = direction;
  gestureDisplay.className = 'gesture-display active';
  
  // Add to history (keep last 10)
  const timestamp = new Date().toLocaleTimeString();
  gestureHistoryList.unshift({ direction, timestamp });
  if (gestureHistoryList.length > 10) {
    gestureHistoryList.pop();
  }
  
  // Update history display
  updateGestureHistory();
  
  // Reset animation
  setTimeout(() => {
    gestureDisplay.className = 'gesture-display';
  }, 200);
}

function updateGestureHistory() {
  if (gestureHistoryList.length === 0) {
    gestureHistory.innerHTML = '<p style="color: #888;">No gestures detected yet</p>';
    return;
  }
  
  const historyHTML = gestureHistoryList
    .map(item => `<div class="history-item">${item.direction} <span class="timestamp">${item.timestamp}</span></div>`)
    .join('');
  gestureHistory.innerHTML = historyHTML;
}

// Initialize
initializeSocket();
checkBackendConnection();

