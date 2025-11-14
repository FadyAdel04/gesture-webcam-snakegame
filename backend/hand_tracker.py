"""
Hand Tracking Module with MediaPipe
Detects hand gestures and outputs direction commands (Up/Down/Left/Right)
"""

import cv2
import mediapipe as mp
import numpy as np


class HandTracker:
    def __init__(self, max_num_hands=1, min_detection_confidence=0.7, min_tracking_confidence=0.5):
        """
        Initialize MediaPipe Hand Tracking
        
        Args:
            max_num_hands: Maximum number of hands to detect
            min_detection_confidence: Minimum confidence for hand detection
            min_tracking_confidence: Minimum confidence for hand tracking
        """
        self.mp_hands = mp.solutions.hands
        self.mp_draw = mp.solutions.drawing_utils
        self.hands = self.mp_hands.Hands(
            max_num_hands=max_num_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        
        # Gesture detection parameters
        self.previous_direction = None
        self.direction_threshold = 0.15  # Minimum movement to trigger direction change
        self.stable_frames = 0
        self.stable_threshold = 5  # Frames needed for stable gesture
        
    def detect_gesture(self, frame):
        """
        Process frame and detect hand gesture direction
        
        Args:
            frame: BGR frame from webcam
            
        Returns:
            direction: "Up", "Down", "Left", "Right", or None
            annotated_frame: Frame with hand landmarks drawn
        """
        # Convert BGR to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(frame_rgb)
        
        direction = None
        annotated_frame = frame.copy()
        
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                # Draw hand landmarks
                self.mp_draw.draw_landmarks(
                    annotated_frame, 
                    hand_landmarks, 
                    self.mp_hands.HAND_CONNECTIONS
                )
                
                # Get key landmarks for direction detection
                landmarks = hand_landmarks.landmark
                h, w, _ = frame.shape
                
                # Use index finger pointing direction for gesture detection
                # This is more intuitive: point up/down/left/right with index finger
                wrist = landmarks[0]
                index_mcp = landmarks[5]  # Index finger MCP (base)
                index_tip = landmarks[8]  # Index finger tip
                
                # Calculate direction vector from wrist to index tip
                # This represents where the finger is pointing
                dx = index_tip.x - wrist.x
                dy = index_tip.y - wrist.y
                
                # Also check if index finger is extended (distance from MCP to tip)
                index_length = ((index_tip.x - index_mcp.x)**2 + (index_tip.y - index_mcp.y)**2)**0.5
                
                # Only detect direction if finger is extended enough (pointing gesture)
                if index_length > 0.08:  # Finger is extended
                    abs_dx = abs(dx)
                    abs_dy = abs(dy)
                    
                    # Determine direction based on dominant axis
                    if abs_dy > abs_dx:
                        # Vertical pointing
                        if dy < -self.direction_threshold:  # Pointing up (y decreases upward)
                            direction = "Up"
                        elif dy > self.direction_threshold:  # Pointing down
                            direction = "Down"
                    else:
                        # Horizontal pointing
                        if dx < -self.direction_threshold:  # Pointing left
                            direction = "Left"
                        elif dx > self.direction_threshold:  # Pointing right
                            direction = "Right"
                
                # Draw direction text on frame
                if direction:
                    cv2.putText(
                        annotated_frame,
                        f"Direction: {direction}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 255, 0),
                        2
                    )
        
        return direction, annotated_frame
    
    def cleanup(self):
        """Release resources"""
        if hasattr(self, 'hands'):
            self.hands.close()

