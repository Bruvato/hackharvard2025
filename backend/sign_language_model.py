"""
Sign Language Recognition using MediaPipe
This module provides hand landmark detection and basic sign language recognition
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import List, Tuple, Dict, Optional
import json
import os

class SignLanguageRecognizer:
    def __init__(self):
        """Initialize the MediaPipe hands model for sign language recognition"""
        self.mp_hands = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles
        
        # Initialize hands model with specific parameters for sign language
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,  # Support both hands
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        )
        
        # Basic sign language gestures mapping
        self.sign_gestures = {
            'hello': self._detect_hello,
            'thank_you': self._detect_thank_you,
            'yes': self._detect_yes,
            'no': self._detect_no,
            'please': self._detect_please,
            'sorry': self._detect_sorry,
            'help': self._detect_help,
            'good': self._detect_good,
            'bad': self._detect_bad,
            'love': self._detect_love
        }
        
        # Load custom gesture data if available
        self.custom_gestures = self._load_custom_gestures()
    
    def _load_custom_gestures(self) -> Dict:
        """Load custom gesture patterns from file"""
        custom_file = "custom_gestures.json"
        if os.path.exists(custom_file):
            try:
                with open(custom_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading custom gestures: {e}")
        return {}
    
    def process_frame(self, frame: np.ndarray) -> Dict:
        """
        Process a single frame and return hand landmarks and detected gestures
        
        Args:
            frame: Input image frame (BGR format)
            
        Returns:
            Dictionary containing landmarks and detected gestures
        """
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the frame
        results = self.hands.process(rgb_frame)
        
        response = {
            'landmarks': [],
            'gestures': [],
            'confidence': 0.0,
            'num_hands': 0
        }
        
        if results.multi_hand_landmarks:
            response['num_hands'] = len(results.multi_hand_landmarks)
            
            for hand_landmarks in results.multi_hand_landmarks:
                # Extract landmark coordinates
                landmarks = []
                for landmark in hand_landmarks.landmark:
                    landmarks.append({
                        'x': landmark.x,
                        'y': landmark.y,
                        'z': landmark.z
                    })
                
                response['landmarks'].append(landmarks)
                
                # Detect gestures for this hand
                gestures = self._detect_gestures(landmarks)
                response['gestures'].extend(gestures)
        
        # Calculate overall confidence
        if response['gestures']:
            response['confidence'] = max(gesture.get('confidence', 0) for gesture in response['gestures'])
        
        return response
    
    def _detect_gestures(self, landmarks: List[Dict]) -> List[Dict]:
        """Detect gestures from hand landmarks"""
        detected_gestures = []
        
        for gesture_name, detector_func in self.sign_gestures.items():
            try:
                confidence = detector_func(landmarks)
                if confidence > 0.6:  # Threshold for gesture detection
                    detected_gestures.append({
                        'gesture': gesture_name,
                        'confidence': confidence,
                        'translation': self._get_translation(gesture_name)
                    })
            except Exception as e:
                print(f"Error detecting {gesture_name}: {e}")
        
        return detected_gestures
    
    def _get_translation(self, gesture: str) -> str:
        """Get text translation for detected gesture"""
        translations = {
            'hello': 'Hello',
            'thank_you': 'Thank you',
            'yes': 'Yes',
            'no': 'No',
            'please': 'Please',
            'sorry': 'Sorry',
            'help': 'Help',
            'good': 'Good',
            'bad': 'Bad',
            'love': 'Love'
        }
        return translations.get(gesture, gesture.replace('_', ' ').title())
    
    # Gesture detection methods based on hand landmark positions
    def _detect_hello(self, landmarks: List[Dict]) -> float:
        """Detect waving gesture (hello)"""
        # Check if hand is raised and fingers are extended
        wrist = landmarks[0]
        middle_finger_tip = landmarks[12]
        index_finger_tip = landmarks[8]
        
        # Hand should be raised (wrist y < finger tips y)
        if wrist['y'] < middle_finger_tip['y'] and wrist['y'] < index_finger_tip['y']:
            return 0.8
        return 0.0
    
    def _detect_thank_you(self, landmarks: List[Dict]) -> float:
        """Detect thank you gesture (hand to chin)"""
        wrist = landmarks[0]
        middle_finger_tip = landmarks[12]
        
        # Hand should be near face area
        if wrist['y'] < 0.3 and abs(wrist['x'] - 0.5) < 0.3:
            return 0.7
        return 0.0
    
    def _detect_yes(self, landmarks: List[Dict]) -> float:
        """Detect yes gesture (nodding motion)"""
        # This would require temporal analysis, simplified for now
        thumb_tip = landmarks[4]
        index_tip = landmarks[8]
        
        # Thumb and index finger extended
        if thumb_tip['x'] > index_tip['x']:
            return 0.6
        return 0.0
    
    def _detect_no(self, landmarks: List[Dict]) -> float:
        """Detect no gesture (shaking motion)"""
        # Simplified detection based on finger positions
        middle_tip = landmarks[12]
        ring_tip = landmarks[16]
        
        # Fingers close together
        distance = abs(middle_tip['x'] - ring_tip['x'])
        if distance < 0.05:
            return 0.6
        return 0.0
    
    def _detect_please(self, landmarks: List[Dict]) -> float:
        """Detect please gesture (circular motion)"""
        wrist = landmarks[0]
        middle_tip = landmarks[12]
        
        # Hand in center area
        if 0.3 < wrist['x'] < 0.7 and 0.3 < wrist['y'] < 0.7:
            return 0.5
        return 0.0
    
    def _detect_sorry(self, landmarks: List[Dict]) -> float:
        """Detect sorry gesture (hand on chest)"""
        wrist = landmarks[0]
        
        # Hand near chest area
        if wrist['y'] > 0.4 and 0.2 < wrist['x'] < 0.8:
            return 0.6
        return 0.0
    
    def _detect_help(self, landmarks: List[Dict]) -> float:
        """Detect help gesture (raised hand)"""
        wrist = landmarks[0]
        middle_tip = landmarks[12]
        
        # Hand raised high
        if wrist['y'] < 0.2 and middle_tip['y'] < wrist['y']:
            return 0.7
        return 0.0
    
    def _detect_good(self, landmarks: List[Dict]) -> float:
        """Detect good gesture (thumbs up)"""
        thumb_tip = landmarks[4]
        thumb_ip = landmarks[3]
        
        # Thumb extended upward
        if thumb_tip['y'] < thumb_ip['y']:
            return 0.8
        return 0.0
    
    def _detect_bad(self, landmarks: List[Dict]) -> float:
        """Detect bad gesture (thumbs down)"""
        thumb_tip = landmarks[4]
        thumb_ip = landmarks[3]
        
        # Thumb extended downward
        if thumb_tip['y'] > thumb_ip['y']:
            return 0.8
        return 0.0
    
    def _detect_love(self, landmarks: List[Dict]) -> float:
        """Detect love gesture (heart shape)"""
        # This would require both hands, simplified for single hand
        middle_tip = landmarks[12]
        ring_tip = landmarks[16]
        
        # Fingers close together forming heart
        distance = abs(middle_tip['x'] - ring_tip['x'])
        if distance < 0.03:
            return 0.6
        return 0.0
    
    def draw_landmarks(self, frame: np.ndarray, landmarks: List[Dict]) -> np.ndarray:
        """Draw hand landmarks on the frame"""
        # Convert landmarks back to MediaPipe format for drawing
        mp_landmarks = []
        for landmark_dict in landmarks:
            landmark = self.mp_hands.HandLandmark()
            landmark.x = landmark_dict['x']
            landmark.y = landmark_dict['y']
            landmark.z = landmark_dict['z']
            mp_landmarks.append(landmark)
        
        # Create a temporary hand landmarks object for drawing
        class TempHandLandmarks:
            def __init__(self, landmarks):
                self.landmark = landmarks
        
        temp_hand = TempHandLandmarks(mp_landmarks)
        
        # Draw landmarks
        self.mp_drawing.draw_landmarks(
            frame,
            temp_hand,
            self.mp_hands.HAND_CONNECTIONS,
            self.mp_drawing_styles.get_default_hand_landmarks_style(),
            self.mp_drawing_styles.get_default_hand_connections_style()
        )
        
        return frame
    
    def close(self):
        """Close the MediaPipe hands model"""
        self.hands.close()
