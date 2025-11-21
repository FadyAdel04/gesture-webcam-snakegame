// script.js

let cameraStream = null;
let socket = null;
let frameInterval = null;
let isTracking = false;
let snakeGame = null;

// Latency monitoring
let gestureTimestamps = [];
let latencyStats = {
  min: Infinity,
  max: 0,
  avg: 0,
  count: 0
};

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
    const receiveTime = Date.now();
    console.log('📥 Received gesture command:', data);
    
    // Calculate latency if timestamp is provided
    if (data.timestamp) {
      const latency = receiveTime - data.timestamp;
      updateLatencyStats(latency);
    }
    
    displayGesture(data.direction);
    
    // Send direction to Snake game (invert left/right for mirrored camera)
    if (snakeGame && snakeGame.gameRunning) {
      const invertedDirection = invertLeftRight(data.direction);
      snakeGame.handleDirection(invertedDirection);
    }
  });

  socket.on('hand_data', (data) => {
    // Draw lines on overlay canvas based on hand position data
    drawHandLines(data);
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
const overlayCanvas = document.getElementById("overlayCanvas");
const overlayCtx = overlayCanvas.getContext('2d');

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
    
    // Wait for video metadata to set overlay canvas size
    webcamVideo.addEventListener('loadedmetadata', () => {
      const videoWidth = webcamVideo.videoWidth || 640;
      const videoHeight = webcamVideo.videoHeight || 480;
      
      // Set canvas to match video dimensions
      overlayCanvas.width = videoWidth;
      overlayCanvas.height = videoHeight;
      
      // Match canvas display size to video display size
      const videoRect = webcamVideo.getBoundingClientRect();
      overlayCanvas.style.width = webcamVideo.offsetWidth + 'px';
      overlayCanvas.style.height = webcamVideo.offsetHeight + 'px';
      overlayCanvas.style.display = 'block';
    });
    
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
    overlayCanvas.style.display = "none";
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
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

// 6️⃣ Draw Hand Lines on Overlay
function drawHandLines(handData) {
  if (!handData || !overlayCanvas || !webcamVideo) return;
  
  // Clear previous drawing
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  
  const { wrist_x, wrist_y, movement_dx, movement_dy, hand_scale_pixels, has_previous_pos, frame_width, frame_height } = handData;
  
  // Scale coordinates to match overlay canvas size
  const scaleX = overlayCanvas.width / frame_width;
  const scaleY = overlayCanvas.height / frame_height;
  const scaledWristX = wrist_x * scaleX;
  const scaledWristY = wrist_y * scaleY;
  const scaledHandScale = hand_scale_pixels * Math.min(scaleX, scaleY);
  
  // Calculate line properties (smaller lines - scale with hand size)
  const lineLength = Math.max(40, scaledHandScale * 1.5);
  const lineThickness = Math.max(2, scaledHandScale * 0.2);
  
  // Draw horizontal line (green for right, red for left)
  if (has_previous_pos && Math.abs(movement_dx) > 0.01) {
    if (movement_dx > 0) {
      // Moving right - green arrow
      drawArrow(overlayCtx, scaledWristX, scaledWristY, scaledWristX + lineLength, scaledWristY, '#00ff00', lineThickness);
    } else {
      // Moving left - red arrow
      drawArrow(overlayCtx, scaledWristX, scaledWristY, scaledWristX - lineLength, scaledWristY, '#ff0000', lineThickness);
    }
  } else {
    // No movement - gray line
    overlayCtx.strokeStyle = '#808080';
    overlayCtx.lineWidth = lineThickness;
    overlayCtx.beginPath();
    overlayCtx.moveTo(scaledWristX - lineLength / 2, scaledWristY);
    overlayCtx.lineTo(scaledWristX + lineLength / 2, scaledWristY);
    overlayCtx.stroke();
  }
  
  // Draw vertical line (green for up, red for down)
  if (has_previous_pos && Math.abs(movement_dy) > 0.01) {
    if (movement_dy < 0) {
      // Moving up - green arrow
      drawArrow(overlayCtx, scaledWristX, scaledWristY, scaledWristX, scaledWristY - lineLength, '#00ff00', lineThickness);
    } else {
      // Moving down - red arrow
      drawArrow(overlayCtx, scaledWristX, scaledWristY, scaledWristX, scaledWristY + lineLength, '#ff0000', lineThickness);
    }
  } else {
    // No movement - gray line
    overlayCtx.strokeStyle = '#808080';
    overlayCtx.lineWidth = lineThickness;
    overlayCtx.beginPath();
    overlayCtx.moveTo(scaledWristX, scaledWristY - lineLength / 2);
    overlayCtx.lineTo(scaledWristX, scaledWristY + lineLength / 2);
    overlayCtx.stroke();
  }
  
  // Draw joint points to show hand detection
  if (handData.joints && handData.joints.length > 0) {
    handData.joints.forEach(joint => {
      const jointX = joint.x * scaleX;
      const jointY = joint.y * scaleY;
      drawJointPoint(overlayCtx, jointX, jointY, joint.type);
    });
  }
}

function drawJointPoint(ctx, x, y, type) {
  // Different sizes and colors for different joint types
  let radius = 3;
  let color = '#00ff99'; // Green for detection
  let glowRadius = 1.5;
  
  if (type === 'wrist') {
    radius = 5; // Larger for wrist (main detection point)
    glowRadius = 2;
    color = '#00ff99';
  } else if (type === 'index_tip' || type === 'middle_tip' || type === 'ring_tip' || type === 'pinky_tip' || type === 'thumb_tip') {
    radius = 4; // Medium for finger tips
    glowRadius = 1.5;
    color = '#00ccff'; // Cyan for finger tips
  } else if (type === 'mcp') {
    radius = 3; // Smaller for MCP joints
    glowRadius = 1;
    color = '#00ff99';
  }
  
  // Draw outer glow
  ctx.beginPath();
  ctx.arc(x, y, radius + glowRadius, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(0, 255, 153, 0.25)';
  ctx.fill();
  
  // Draw main point
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  
  // Draw inner highlight for better visibility
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.4, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
}

function drawArrow(ctx, fromX, fromY, toX, toY, color, lineWidth) {
  const headlen = Math.max(8, lineWidth * 3); // Smaller arrowhead proportional to line width
  const angle = Math.atan2(toY - fromY, toX - fromX);
  
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  
  // Draw arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headlen * Math.cos(angle - Math.PI / 6),
    toY - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headlen * Math.cos(angle + Math.PI / 6),
    toY - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}

// 7️⃣ Initialize Snake Game
function initializeSnakeGame() {
  const snakeCanvas = document.getElementById('snakeCanvas');
  if (!snakeCanvas) {
    console.error('Snake canvas not found');
    return;
  }
  
  // Calculate responsive canvas size
  const getCanvasSize = () => {
    const maxWidth = Math.min(400, window.innerWidth - 100);
    const maxHeight = Math.min(400, window.innerHeight - 300);
    const size = Math.min(maxWidth, maxHeight);
    return Math.max(300, Math.min(400, size)); // Clamp between 300 and 400
  };
  
  const canvasSize = getCanvasSize();
  snakeGame = new SnakeGame('snakeCanvas', canvasSize, canvasSize);
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (snakeGame && !snakeGame.gameRunning) {
        const newSize = getCanvasSize();
        snakeGame.canvas.width = newSize;
        snakeGame.canvas.height = newSize;
        snakeGame.tileCount = newSize / snakeGame.gridSize;
        snakeGame.draw();
      }
    }, 250);
  });
  
  // Set up callbacks
  snakeGame.onScoreUpdate = (score) => {
    updateGameStatus(`Score: ${score} - Keep going!`);
  };
  
  snakeGame.onGameOver = (score) => {
    updateGameStatus(`Game Over! Final Score: ${score}. Press "Reset Game" to play again.`);
    document.getElementById('startGame').style.display = 'none';
    document.getElementById('resetGame').style.display = 'inline-block';
  };
  
  // Game control buttons
  const startGameBtn = document.getElementById('startGame');
  const resetGameBtn = document.getElementById('resetGame');
  
  startGameBtn.addEventListener('click', () => {
    snakeGame.start();
    startGameBtn.style.display = 'none';
    resetGameBtn.style.display = 'inline-block';
    updateGameStatus('Countdown starting... Get ready!');
    
    // Update status during countdown
    const countdownCheck = setInterval(() => {
      if (!snakeGame.gameRunning) {
        clearInterval(countdownCheck);
        return;
      }
      if (snakeGame.countdown > 0) {
        updateGameStatus(`Game starts in ${snakeGame.countdown}...`);
      } else if (snakeGame.gameStarted) {
        updateGameStatus('Game Started! Use hand gestures to control the snake.');
        clearInterval(countdownCheck);
      }
    }, 100);
  });
  
  resetGameBtn.addEventListener('click', () => {
    snakeGame.reset();
    resetGameBtn.style.display = 'none';
    startGameBtn.style.display = 'inline-block';
    updateGameStatus('Game Reset! Press "Start Game" to begin.');
  });
}

function updateGameStatus(message) {
  const gameStatus = document.getElementById('gameStatus');
  if (gameStatus) {
    gameStatus.textContent = message;
  }
}

// 8️⃣ Latency Monitoring
function updateLatencyStats(latency) {
  latencyStats.count++;
  latencyStats.min = Math.min(latencyStats.min, latency);
  latencyStats.max = Math.max(latencyStats.max, latency);
  
  // Calculate running average
  latencyStats.avg = ((latencyStats.avg * (latencyStats.count - 1)) + latency) / latencyStats.count;
  
  // Update UI
  updateLatencyDisplay();
  
  // Log every 10 gestures
  if (latencyStats.count % 10 === 0) {
    console.log(`📊 Latency Stats - Min: ${latencyStats.min}ms, Max: ${latencyStats.max}ms, Avg: ${latencyStats.avg.toFixed(2)}ms`);
  }
}

function updateLatencyDisplay() {
  const minEl = document.getElementById('latencyMin');
  const maxEl = document.getElementById('latencyMax');
  const avgEl = document.getElementById('latencyAvg');
  const countEl = document.getElementById('latencyCount');
  
  if (minEl) minEl.textContent = latencyStats.min === Infinity ? '-' : latencyStats.min;
  if (maxEl) maxEl.textContent = latencyStats.max === 0 ? '-' : latencyStats.max;
  if (avgEl) avgEl.textContent = latencyStats.count === 0 ? '-' : latencyStats.avg.toFixed(1);
  if (countEl) countEl.textContent = latencyStats.count;
}

// 🔟 Invert Left/Right for mirrored camera
function invertLeftRight(direction) {
  // Invert left and right because camera view is mirrored
  if (direction === 'Left') {
    return 'Right';
  } else if (direction === 'Right') {
    return 'Left';
  }
  // Up and Down remain the same
  return direction;
}

// 9️⃣ Keyboard Controls (for testing without camera)
function setupKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    if (!snakeGame || !snakeGame.gameRunning) return;
    
    if (!snakeGame.gameStarted) return; // Don't accept input during countdown
    
    let direction = null;
    switch(e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        direction = 'Up';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        direction = 'Down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        direction = 'Left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        direction = 'Right';
        break;
    }
    
    if (direction) {
      e.preventDefault();
      snakeGame.handleDirection(direction);
      displayGesture(direction);
    }
  });
}

// Initialize
initializeSocket();
checkBackendConnection();
initializeSnakeGame();
setupKeyboardControls();



