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
        
        # Previous hand position for movement tracking
        self.previous_wrist_pos = None
        
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
        hand_data = None
        
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
                
                # Convert normalized coordinates to pixel coordinates
                wrist_x = int(wrist.x * w)
                wrist_y = int(wrist.y * h)
                
                # Calculate hand size for scaling lines (distance from wrist to middle finger MCP)
                middle_mcp = landmarks[9]
                hand_scale = ((wrist.x - middle_mcp.x)**2 + (wrist.y - middle_mcp.y)**2)**0.5
                hand_scale_pixels = int(hand_scale * max(w, h))
                
                # Calculate direction vector from wrist to index tip
                # This represents where the finger is pointing
                dx = index_tip.x - wrist.x
                dy = index_tip.y - wrist.y
                
                # Also check if index finger is extended (distance from MCP to tip)
                index_length = ((index_tip.x - index_mcp.x)**2 + (index_tip.y - index_mcp.y)**2)**0.5
                
                # Calculate movement from previous frame (before updating)
                movement_dx = 0
                movement_dy = 0
                has_previous_pos = self.previous_wrist_pos is not None
                if has_previous_pos:
                    movement_dx = wrist.x - self.previous_wrist_pos[0]
                    movement_dy = wrist.y - self.previous_wrist_pos[1]
                
                # Draw green and red lines to show hand movement
                # Line length scales with hand size
                line_length = max(80, hand_scale_pixels * 3)
                line_thickness = max(3, int(hand_scale_pixels * 0.4))
                
                # Always draw lines when hand is detected
                # Horizontal line (green for right movement, red for left movement)
                if has_previous_pos and abs(movement_dx) > 0.01:  # Significant horizontal movement
                    if movement_dx > 0:
                        # Moving right - green arrow line
                        cv2.arrowedLine(
                            annotated_frame,
                            (wrist_x, wrist_y),
                            (wrist_x + line_length, wrist_y),
                            (0, 255, 0),  # Green
                            line_thickness,
                            tipLength=0.3
                        )
                    else:
                        # Moving left - red arrow line
                        cv2.arrowedLine(
                            annotated_frame,
                            (wrist_x, wrist_y),
                            (wrist_x - line_length, wrist_y),
                            (0, 0, 255),  # Red
                            line_thickness,
                            tipLength=0.3
                        )
                else:
                    # No significant movement or first frame - draw neutral gray line
                    cv2.line(
                        annotated_frame,
                        (wrist_x - line_length // 2, wrist_y),
                        (wrist_x + line_length // 2, wrist_y),
                        (128, 128, 128),  # Gray
                        line_thickness
                    )
                
                # Vertical line (green for up movement, red for down movement)
                if has_previous_pos and abs(movement_dy) > 0.01:  # Significant vertical movement
                    if movement_dy < 0:
                        # Moving up - green line
                        cv2.arrowedLine(
                            annotated_frame,
                            (wrist_x, wrist_y),
                            (wrist_x, wrist_y - line_length),
                            (0, 255, 0),  # Green
                            line_thickness,
                            tipLength=0.3
                        )
                    else:
                        # Moving down - red line
                        cv2.arrowedLine(
                            annotated_frame,
                            (wrist_x, wrist_y),
                            (wrist_x, wrist_y + line_length),
                            (0, 0, 255),  # Red
                            line_thickness,
                            tipLength=0.3
                        )
                else:
                    # No significant movement or first frame - draw neutral gray line
                    cv2.line(
                        annotated_frame,
                        (wrist_x, wrist_y - line_length // 2),
                        (wrist_x, wrist_y + line_length // 2),
                        (128, 128, 128),  # Gray
                        line_thickness
                    )
                
                # Get key joint positions for visualization
                # Finger tips
                thumb_tip = landmarks[4]
                index_tip = landmarks[8]
                middle_tip = landmarks[12]
                ring_tip = landmarks[16]
                pinky_tip = landmarks[20]
                
                # Key joints (MCP joints)
                index_mcp = landmarks[5]
                middle_mcp = landmarks[9]
                ring_mcp = landmarks[13]
                pinky_mcp = landmarks[17]
                
                # Store hand data for frontend overlay
                hand_data = {
                    'wrist_x': wrist_x,
                    'wrist_y': wrist_y,
                    'movement_dx': movement_dx,
                    'movement_dy': movement_dy,
                    'hand_scale_pixels': hand_scale_pixels,
                    'has_previous_pos': has_previous_pos,
                    'frame_width': w,
                    'frame_height': h,
                    'joints': [
                        {'x': int(wrist.x * w), 'y': int(wrist.y * h), 'type': 'wrist'},
                        {'x': int(thumb_tip.x * w), 'y': int(thumb_tip.y * h), 'type': 'thumb_tip'},
                        {'x': int(index_tip.x * w), 'y': int(index_tip.y * h), 'type': 'index_tip'},
                        {'x': int(middle_tip.x * w), 'y': int(middle_tip.y * h), 'type': 'middle_tip'},
                        {'x': int(ring_tip.x * w), 'y': int(ring_tip.y * h), 'type': 'ring_tip'},
                        {'x': int(pinky_tip.x * w), 'y': int(pinky_tip.y * h), 'type': 'pinky_tip'},
                        {'x': int(index_mcp.x * w), 'y': int(index_mcp.y * h), 'type': 'mcp'},
                        {'x': int(middle_mcp.x * w), 'y': int(middle_mcp.y * h), 'type': 'mcp'},
                        {'x': int(ring_mcp.x * w), 'y': int(ring_mcp.y * h), 'type': 'mcp'},
                        {'x': int(pinky_mcp.x * w), 'y': int(pinky_mcp.y * h), 'type': 'mcp'}
                    ]
                }
                
                # Update previous position after all drawing is complete
                self.previous_wrist_pos = (wrist.x, wrist.y)
                
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
        else:
            # Reset previous position when hand is not detected
            self.previous_wrist_pos = None
        
        return direction, annotated_frame, hand_data
    
    def cleanup(self):
        """Release resources"""
        if hasattr(self, 'hands'):
            self.hands.close()

