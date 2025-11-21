"""
Test script for gesture detection
Run this to test hand tracking and gesture detection locally
"""

import cv2
from hand_tracker import HandTracker

def main():
    print("🎯 Starting gesture detection test...")
    print("📋 Instructions:")
    print("   - Point your index finger Up/Down/Left/Right")
    print("   - Press 'q' to quit")
    
    cap = cv2.VideoCapture(0)
    tracker = HandTracker()
    
    if not cap.isOpened():
        print("❌ Cannot access webcam")
        return
    
    print("✅ Webcam opened. Starting detection...")
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            continue
        
        # Detect gesture
        direction, annotated_frame = tracker.detect_gesture(frame)
        
        # Display result
        if direction:
            print(f"📤 Detected gesture: {direction}")
            cv2.putText(
                annotated_frame,
                f"Gesture: {direction}",
                (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 0),
                2
            )
        else:
            cv2.putText(
                annotated_frame,
                "No gesture detected",
                (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2
            )
        
        cv2.imshow('Gesture Detection Test', annotated_frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    tracker.cleanup()
    cv2.destroyAllWindows()
    print("✅ Test completed")

if __name__ == '__main__':
    main()



