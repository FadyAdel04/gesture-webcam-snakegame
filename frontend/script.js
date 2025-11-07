// script.js

let cameraStream = null;

// 1️⃣ Check Backend Connection
async function checkBackendConnection() {
  const statusElement = document.getElementById("status");

  try {
    const response = await fetch("http://localhost:5000/");
    const data = await response.json();

    console.log("✅ Backend connected:", data);
    statusElement.textContent = "✅ Backend Connected: " + data.message;
    statusElement.style.color = "#00ff99";
  } catch (error) {
    console.error("❌ Failed to connect to backend:", error);
    statusElement.textContent = "❌ Failed to connect to backend";
    statusElement.style.color = "#ff5555";
  }
}

// 2️⃣ Handle Webcam
const startCamButton = document.getElementById("startCam");
const stopCamButton = document.getElementById("stopCam");
const webcamVideo = document.getElementById("webcam");

// Open camera
startCamButton.addEventListener("click", async () => {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    webcamVideo.srcObject = cameraStream;
    webcamVideo.style.display = "block";
    startCamButton.style.display = "none";
    stopCamButton.style.display = "inline-block";
    console.log("🎥 Webcam stream started.");
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
  }
});

// Initialize
checkBackendConnection();
