import cv2
import mediapipe as mp
import json
import time
import numpy as np
import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.backends.backend_agg import FigureCanvasAgg
from datetime import datetime
import math

class LiveHandTracker:
    """Class to store and manage live hand landmark data in memory"""
    
    def __init__(self):
        self.landmarks_data = None
        self.scaling_info = None
        self.timestamp = None
        self.hands_detected = 0
        self.image_width = 640
        self.image_height = 480
        self._lock = False  # Simple lock for thread safety
    
    def update(self, hands_data, scaling_info, image_width=640, image_height=480):
        """Update the live hand landmark data"""
        if self._lock:
            return  # Skip update if locked
        
        self.landmarks_data = hands_data
        self.scaling_info = scaling_info
        self.timestamp = datetime.now().isoformat()
        self.hands_detected = len(hands_data)
        self.image_width = image_width
        self.image_height = image_height
    
    def get_data(self):
        """Get the current hand landmark data"""
        return {
            "timestamp": self.timestamp,
            "image_width": self.image_width,
            "image_height": self.image_height,
            "hands_detected": self.hands_detected,
            "scaling_info": self.scaling_info,
            "hands": self.landmarks_data
        }
    
    def export_to_json(self, filepath=None):
        """Export current data to JSON file (optional)"""
        if filepath is None:
            os.makedirs("live_landmarks", exist_ok=True)
            filepath = os.path.join("live_landmarks", "live_hand_landmarks.json")
        
        try:
            with open(filepath, "w") as f:
                json.dump(self.get_data(), f, indent=2)
            return True
        except Exception as e:
            print(f"Error exporting to JSON: {e}")
            return False
    
    def has_data(self):
        """Check if there's valid data available"""
        return self.landmarks_data is not None and self.timestamp is not None
    
    def get_latest_landmarks(self):
        """Get the latest landmarks data"""
        return self.landmarks_data
    
    def get_latest_scaling_info(self):
        """Get the latest scaling information"""
        return self.scaling_info

def get_finger_colors():
    """Define colors for each finger and thumb"""
    return {
        'THUMB': '#FF6B6B',      # Red
        'INDEX_FINGER': '#4ECDC4',  # Teal
        'MIDDLE_FINGER': '#45B7D1', # Blue
        'RING_FINGER': '#96CEB4',   # Green
        'PINKY': '#FFEAA7',         # Yellow
        'WRIST': '#DDA0DD'          # Plum
    }

def get_landmark_finger(landmark_name):
    """Determine which finger a landmark belongs to"""
    if 'WRIST' in landmark_name:
        return 'WRIST'
    elif 'THUMB' in landmark_name:
        return 'THUMB'
    elif 'INDEX_FINGER' in landmark_name:
        return 'INDEX_FINGER'
    elif 'MIDDLE_FINGER' in landmark_name:
        return 'MIDDLE_FINGER'
    elif 'RING_FINGER' in landmark_name:
        return 'RING_FINGER'
    elif 'PINKY' in landmark_name:
        return 'PINKY'
    else:
        return 'WRIST'

def create_landmark_visualization(landmarks_data, width=400, height=400, is_match=False):
    """Create a matplotlib visualization of hand landmarks and convert to OpenCV format"""
    # Create figure
    fig, ax = plt.subplots(1, 1, figsize=(width/100, height/100), dpi=100)
    ax.set_facecolor('white')
    
    # Get colors for fingers
    finger_colors = get_finger_colors()
    
    # Process each hand
    for hand in landmarks_data['hands']:
        landmarks = hand['landmarks']
        hand_label = hand['hand_label']
        
        # Mirror left hand landmarks horizontally for better comparison
        if hand_label == "Left" and not is_match:
            # Create mirrored landmarks
            mirrored_landmarks = []
            for landmark in landmarks:
                mirrored_landmark = landmark.copy()
                # Mirror x-coordinate: x_mirrored = target_size - x_original
                target_size = landmarks_data.get('scaling_info', {}).get('target_size', 2000)
                if target_size:
                    mirrored_landmark['x_scaled'] = target_size - landmark['x_scaled']
                mirrored_landmarks.append(mirrored_landmark)
            landmarks = mirrored_landmarks
        
        # Draw connections between landmarks for each finger
        finger_connections = {
            'THUMB': [0, 1, 2, 3, 4],  # WRIST -> THUMB_CMC -> THUMB_MCP -> THUMB_IP -> THUMB_TIP
            'INDEX_FINGER': [0, 5, 6, 7, 8],  # WRIST -> INDEX_MCP -> INDEX_PIP -> INDEX_DIP -> INDEX_TIP
            'MIDDLE_FINGER': [0, 9, 10, 11, 12],  # WRIST -> MIDDLE_MCP -> MIDDLE_PIP -> MIDDLE_DIP -> MIDDLE_TIP
            'RING_FINGER': [0, 13, 14, 15, 16],  # WRIST -> RING_MCP -> RING_PIP -> RING_DIP -> RING_TIP
            'PINKY': [0, 17, 18, 19, 20]  # WRIST -> PINKY_MCP -> PINKY_PIP -> PINKY_DIP -> PINKY_TIP
        }
        
        # Draw finger connections
        for finger, connection_indices in finger_connections.items():
            if finger == 'WRIST':
                continue
                
            color = finger_colors[finger]
            points = []
            
            for idx in connection_indices:
                if idx < len(landmarks):
                    landmark = landmarks[idx]
                    x = landmark['x_scaled']
                    y = landmark['y_scaled']
                    points.append([x, y])
            
            if len(points) > 1:
                # Draw lines connecting finger joints
                for i in range(len(points) - 1):
                    ax.plot([points[i][0], points[i+1][0]], 
                           [points[i][1], points[i+1][1]], 
                           color=color, linewidth=2, alpha=0.8)
        
        # Draw circles at each landmark position
        for landmark in landmarks:
            landmark_name = landmark['landmark_name']
            finger = get_landmark_finger(landmark_name)
            color = finger_colors[finger]
            
            x = landmark['x_scaled']
            y = landmark['y_scaled']
            
            # Draw circle
            circle = plt.Circle((x, y), 4, color=color, fill=True, alpha=0.9)
            ax.add_patch(circle)
            
            # Add landmark ID as text
            ax.text(x, y-8, str(landmark['landmark_id']), 
                   ha='center', va='center', fontsize=6, fontweight='bold',
                   bbox=dict(boxstyle="round,pad=0.2", facecolor='white', alpha=0.8))
    
    # Set up the plot
    scaling_info = landmarks_data.get('scaling_info', {})
    if scaling_info is None:
        scaling_info = {}
    target_size = scaling_info.get('target_size', 2000)
    ax.set_xlim(0, target_size)
    ax.set_ylim(0, target_size)
    ax.invert_yaxis()  # Invert Y axis to match image coordinates
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    
    # Get scaling info for title
    scale_factor = scaling_info.get('scale_factor', 1.0)
    timestamp = landmarks_data.get('timestamp', 'Unknown')
    
    # Get hand label for title
    hand_label = "None detected"
    if landmarks_data['hands']:
        hand_label = landmarks_data['hands'][0]['hand_label']
    
    # For match visualization, always show "Right Hand Match"
    if is_match:
        title_hand_label = "Right Hand Match"
    else:
        title_hand_label = f"{hand_label} Hand"
    
    ax.set_title(f"Live Hand Landmarks\n{title_hand_label}\nScale: {scale_factor:.2f}", 
                fontsize=10, fontweight='bold')
    ax.set_xlabel('X (Scaled)', fontsize=8)
    ax.set_ylabel('Y (Scaled)', fontsize=8)
    
    # Remove ticks for cleaner look
    ax.set_xticks([])
    ax.set_yticks([])
    
    # Convert matplotlib figure to OpenCV format
    canvas = FigureCanvasAgg(fig)
    canvas.draw()
    buf = canvas.buffer_rgba()
    img_array = np.asarray(buf)
    
    # Convert RGBA to BGR for OpenCV
    img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGBA2BGR)
    
    plt.close(fig)  # Close figure to free memory
    
    return img_bgr

# Global instance for easy access
live_tracker = LiveHandTracker()

# Global variables for ASL alphabet data
asl_alphabet_data = {}
asl_letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

def load_asl_alphabet_data():
    """Load all ASL alphabet landmark data"""
    global asl_alphabet_data
    
    landmarks_dir = "hand_landmarks"
    if not os.path.exists(landmarks_dir):
        print(f"Warning: {landmarks_dir} directory not found!")
        return
    
    print("Loading ASL alphabet data...")
    for letter in asl_letters:
        json_file = f"{letter}_hand_landmarks.json"
        json_path = os.path.join(landmarks_dir, json_file)
        
        if os.path.exists(json_path):
            try:
                with open(json_path, 'r') as f:
                    data = json.load(f)
                    asl_alphabet_data[letter] = data
            except Exception as e:
                print(f"Error loading {json_file}: {e}")
        else:
            print(f"Warning: {json_file} not found!")
    
    print(f"Loaded {len(asl_alphabet_data)} ASL letters")

def calculate_rms_distance(live_landmarks, asl_landmarks):
    """Calculate RMS distance between live and ASL landmarks"""
    if not live_landmarks or not asl_landmarks:
        return float('inf')
    
    # Get the first hand from both datasets
    live_hand = live_landmarks[0] if live_landmarks else None
    asl_hand = asl_landmarks['hands'][0] if asl_landmarks['hands'] else None
    
    if not live_hand or not asl_hand:
        return float('inf')
    
    live_points = live_hand['landmarks']
    asl_points = asl_hand['landmarks']
    
    if len(live_points) != len(asl_points):
        return float('inf')
    
    # Calculate RMS distance using scaled coordinates
    total_distance_squared = 0
    valid_points = 0
    
    for i in range(len(live_points)):
        live_x = live_points[i]['x_scaled']
        live_y = live_points[i]['y_scaled']
        asl_x = asl_points[i]['x_scaled']
        asl_y = asl_points[i]['y_scaled']
        
        # Calculate Euclidean distance
        distance_squared = (live_x - asl_x)**2 + (live_y - asl_y)**2
        total_distance_squared += distance_squared
        valid_points += 1
    
    if valid_points == 0:
        return float('inf')
    
    # Calculate RMS
    rms_distance = math.sqrt(total_distance_squared / valid_points)
    return rms_distance

def find_closest_asl_match(live_landmarks_data):
    """Find the closest ASL letter match for live landmarks, considering hand orientation"""
    if not live_landmarks_data or not live_landmarks_data['hands']:
        return None, float('inf'), None
    
    best_match = None
    best_distance = float('inf')
    best_hand_label = None
    
    # Get the live hand label
    live_hand_label = live_landmarks_data['hands'][0]['hand_label'] if live_landmarks_data['hands'] else None
    
    for letter, asl_data in asl_alphabet_data.items():
        # Get ASL hand label
        asl_hand_label = asl_data['hands'][0]['hand_label'] if asl_data['hands'] else None
        
        # Calculate distance
        distance = calculate_rms_distance(live_landmarks_data['hands'], asl_data)
        
        # Prefer matches with same hand orientation, but don't exclude others
        adjusted_distance = distance
        if live_hand_label and asl_hand_label and live_hand_label != asl_hand_label:
            # Add penalty for different hand orientations
            adjusted_distance = distance * 1.1  # 10% penalty
        
        if adjusted_distance < best_distance:
            best_distance = adjusted_distance
            best_match = letter
            best_hand_label = asl_hand_label
    
    return best_match, best_distance, best_hand_label

def calculate_edge_to_edge_scaling(landmarks, image_width, image_height):
    """Calculate edge-to-edge scaling parameters for landmarks"""
    if not landmarks:
        return None
    
    # Extract all x and y coordinates
    all_x_coords = []
    all_y_coords = []
    
    for landmark in landmarks:
        x = landmark.x * image_width
        y = landmark.y * image_height
        all_x_coords.append(x)
        all_y_coords.append(y)
    
    if not all_x_coords or not all_y_coords:
        return None
    
    # Calculate bounding box
    min_x, max_x = min(all_x_coords), max(all_x_coords)
    min_y, max_y = min(all_y_coords), max(all_y_coords)
    
    # Add padding (10% of the range)
    x_range = max_x - min_x
    y_range = max_y - min_y
    padding_x = x_range * 0.1 if x_range > 0 else 10
    padding_y = y_range * 0.1 if y_range > 0 else 10
    
    min_x -= padding_x
    max_x += padding_x
    min_y -= padding_y
    max_y += padding_y
    
    # Target coordinate system
    target_size = 2000
    
    # Calculate scale factors
    scale_x = target_size / (max_x - min_x) if (max_x - min_x) > 0 else 1
    scale_y = target_size / (max_y - min_y) if (max_y - min_y) > 0 else 1
    
    # Use smaller scale factor to maintain aspect ratio
    scale_factor = min(scale_x, scale_y)
    
    # Calculate centering offsets
    scaled_width = (max_x - min_x) * scale_factor
    scaled_height = (max_y - min_y) * scale_factor
    offset_x = (target_size - scaled_width) / 2
    offset_y = (target_size - scaled_height) / 2
    
    return {
        "min_x": min_x,
        "max_x": max_x,
        "min_y": min_y,
        "max_y": max_y,
        "scale_factor": scale_factor,
        "offset_x": offset_x,
        "offset_y": offset_y,
        "target_size": target_size
    }

def normalize_hand_rotation(landmarks_data):
    """
    Normalize hand orientation using rotation angle calculated as:
    arctan((yposition(node9)-yposition(node0))/(xposition(node9)-xposition(node0)))
    """
    # Find wrist (landmark 0) and index finger tip (landmark 9) positions
    wrist_landmark = None
    index_tip_landmark = None
    
    for landmark in landmarks_data:
        if landmark["landmark_id"] == 0:  # Wrist
            wrist_landmark = landmark
        elif landmark["landmark_id"] == 9:  # Index finger tip
            index_tip_landmark = landmark
    
    if wrist_landmark is None or index_tip_landmark is None:
        return landmarks_data
    
    # Get scaled coordinates
    wrist_x = wrist_landmark["x_scaled"]
    wrist_y = wrist_landmark["y_scaled"]
    index_x = index_tip_landmark["x_scaled"]
    index_y = index_tip_landmark["y_scaled"]
    
    # Calculate rotation angle using the provided formula
    dx = index_x - wrist_x
    dy = index_y - wrist_y
    
    if dx == 0 and dy == 0:
        # Index finger tip is at wrist position, no rotation needed
        return landmarks_data
    
    rotation_angle = math.atan2(dy, dx)
    target_angle = -math.pi / 2  # vertical (up)
    rotation_to_vertical = target_angle - rotation_angle
    
    # Apply rotation to all landmarks using wrist as origin
    cos_angle = math.cos(rotation_to_vertical)
    sin_angle = math.sin(rotation_to_vertical)
    
    for landmark in landmarks_data:
        # Get coordinates relative to wrist
        rel_x = landmark["x_scaled"] - wrist_x
        rel_y = landmark["y_scaled"] - wrist_y
        
        # Apply rotation
        rotated_x = rel_x * cos_angle - rel_y * sin_angle
        rotated_y = rel_x * sin_angle + rel_y * cos_angle
        
        # Move the whole hand so wrist is at (1000, 2000)
        landmark["x_scaled"] = float(rotated_x + 1000)
        landmark["y_scaled"] = float(rotated_y + 2000)
    
    return landmarks_data

def process_landmarks(hand_landmarks, hand_classification, image_width, image_height, scaling_info):
    """Process hand landmarks and apply scaling"""
    landmarks_data = []
    
    for idx, landmark in enumerate(hand_landmarks.landmark):
        # Get raw pixel coordinates
        x_raw = landmark.x * image_width
        y_raw = landmark.y * image_height
        z_raw = landmark.z * image_width  # MediaPipe uses z relative to wrist
        
        # Apply edge-to-edge scaling
        if scaling_info:
            x_scaled = (x_raw - scaling_info["min_x"]) * scaling_info["scale_factor"] + scaling_info["offset_x"]
            y_scaled = (y_raw - scaling_info["min_y"]) * scaling_info["scale_factor"] + scaling_info["offset_y"]
            z_scaled = z_raw * scaling_info["scale_factor"]
        else:
            x_scaled = x_raw
            y_scaled = y_raw
            z_scaled = z_raw
        
        landmark_data = {
            "landmark_id": idx,
            "landmark_name": mp.solutions.hands.HandLandmark(idx).name,
            "x_raw": float(x_raw),
            "y_raw": float(y_raw),
            "z_raw": float(z_raw),
            "x_scaled": float(x_scaled),
            "y_scaled": float(y_scaled),
            "z_scaled": float(z_scaled)
        }
        
        landmarks_data.append(landmark_data)
    
    # Apply rotation normalization
    landmarks_data = normalize_hand_rotation(landmarks_data)
    
    return landmarks_data

def main():
    """Main function to run optimized live hand detection"""
    # Initialize MediaPipe hands
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    
    # Create hands object for video processing
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    # Initialize camera
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open camera")
        return
    
    # Set camera resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    # Load ASL alphabet data
    load_asl_alphabet_data()
    
    print("Optimized live hand detection with ASL recognition started!")
    print("Press 'q' to quit")
    print("Press 's' to save current frame to JSON")
    print("Data is stored in memory for maximum speed")
    print("Triple-view display: Camera feed + Live landmarks + Best ASL match")
    
    frame_count = 0
    last_export_time = time.time()
    last_viz_update = time.time()
    last_comparison = time.time()
    viz_update_interval = 0.1  # Update visualization every 100ms
    comparison_interval = 0.5  # Compare with ASL letters every 500ms
    
    # Variables for ASL matching
    current_match = None
    current_distance = float('inf')
    match_viz_image = None
    last_detected_sign = None
    
    # Variables for text input
    detected_text = ""
    text_history = []
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Error: Could not read frame from camera")
                break
            
            # Keep frame in original orientation to match images
            # frame = cv2.flip(frame, 1)  # Removed flip to match image orientation
            
            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process the frame
            results = hands.process(frame_rgb)
            
            # Get frame dimensions
            h, w, c = frame.shape
            
            # Prepare hands data
            hands_data = []
            all_landmarks = []
            
            if results.multi_hand_landmarks:
                for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                    # Get hand classification
                    hand_classification = results.multi_handedness[hand_idx]
                    hand_label = hand_classification.classification[0].label
                    confidence = hand_classification.classification[0].score
                    
                    # Correct hand label (MediaPipe labels are reversed when camera is not flipped)
                    if hand_label == "Left":
                        hand_label = "Right"
                    elif hand_label == "Right":
                        hand_label = "Left"
                    
                    # Collect landmarks for scaling calculation
                    all_landmarks.extend(hand_landmarks.landmark)
                    
                    # Store hand data temporarily
                    hands_data.append({
                        "hand_index": hand_idx,
                        "hand_label": hand_label,
                        "confidence": float(confidence),
                        "landmarks": hand_landmarks.landmark
                    })
            
            # Calculate edge-to-edge scaling
            scaling_info = calculate_edge_to_edge_scaling(all_landmarks, w, h)
            
            # Process landmarks with scaling
            processed_hands_data = []
            if results.multi_hand_landmarks:
                for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                    # Get hand classification
                    hand_classification = results.multi_handedness[hand_idx]
                    hand_label = hand_classification.classification[0].label
                    confidence = hand_classification.classification[0].score
                    
                    # Correct hand label (MediaPipe labels are reversed when camera is not flipped)
                    if hand_label == "Left":
                        hand_label = "Right"
                    elif hand_label == "Right":
                        hand_label = "Left"
                    
                    processed_landmarks = process_landmarks(
                        hand_landmarks, 
                        hand_label, 
                        w, h, 
                        scaling_info
                    )
                    
                    processed_hand = {
                        "hand_index": hand_idx,
                        "hand_label": hand_label,
                        "confidence": float(confidence),
                        "landmarks": processed_landmarks
                    }
                    
                    processed_hands_data.append(processed_hand)
            
            # Update live tracker (in-memory, very fast!)
            live_tracker.update(processed_hands_data, scaling_info, w, h)
            
            # Don't draw landmarks on camera frame - keep it clean
            # Landmarks will be shown in the visualization panel instead
            
            # Add info text to frame
            info_text = f"Hands detected: {len(processed_hands_data)}"
            if scaling_info:
                info_text += f" | Scale: {scaling_info['scale_factor']:.2f}"
            info_text += " | In-Memory Storage"
            
            cv2.putText(frame, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, "Press 'q' to quit, 's' to save JSON", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Create triple-view display with ASL recognition
            current_time = time.time()
            
            # Perform ASL comparison periodically
            if current_time - last_comparison >= comparison_interval and live_tracker.has_data():
                try:
                    landmarks_data = live_tracker.get_data()
                    best_match, best_distance, best_hand_label = find_closest_asl_match(landmarks_data)
                    
                    if best_match:
                        # Only update if the detected sign has changed
                        if best_match != last_detected_sign:
                            current_match = best_match
                            current_distance = best_distance
                            last_detected_sign = best_match
                            
                            # Create visualization of the best match only when sign changes
                            if best_match in asl_alphabet_data:
                                match_viz_image = create_landmark_visualization(asl_alphabet_data[best_match], width=400, height=400, is_match=True)
                            
                            # Get live hand label
                            live_hand_label = landmarks_data['hands'][0]['hand_label'] if landmarks_data['hands'] else 'Unknown'
                            
                            # Print enhanced match info only when sign changes
                            hand_match_info = ""
                            if live_hand_label and best_hand_label:
                                if live_hand_label == best_hand_label:
                                    hand_match_info = f" (Same hand: {live_hand_label})"
                                else:
                                    hand_match_info = f" (Live: {live_hand_label}, ASL: {best_hand_label})"
                            
                            print(f"Sign changed to: '{best_match.upper()}' (RMS: {best_distance:.2f}){hand_match_info}")
                        else:
                            # Update distance but keep same match
                            current_distance = best_distance
                    
                    last_comparison = current_time
                except Exception as e:
                    print(f"Error in ASL comparison: {e}")
            
            # Always try to show triple-view if we have data, otherwise show single view
            if live_tracker.has_data():
                try:
                    # Update visualization periodically
                    if current_time - last_viz_update >= viz_update_interval:
                        # Create landmark visualization
                        landmarks_data = live_tracker.get_data()
                        viz_image = create_landmark_visualization(landmarks_data, width=400, height=400)
                        
                        # Resize camera frame to match visualization height
                        frame_resized = cv2.resize(frame, (int(frame.shape[1] * 400 / frame.shape[0]), 400))
                        
                        # Create triple-view display
                        if match_viz_image is not None:
                            # Triple-view: Camera + Live landmarks + Best match
                            triple_view = np.hstack([frame_resized, viz_image, match_viz_image])
                            
                            # Add separator lines
                            cv2.line(triple_view, (frame_resized.shape[1], 0), (frame_resized.shape[1], 400), (255, 255, 255), 2)
                            cv2.line(triple_view, (frame_resized.shape[1] + viz_image.shape[1], 0), (frame_resized.shape[1] + viz_image.shape[1], 400), (255, 255, 255), 2)
                            
                            # Add match info with hand information
                            if current_match:
                                # Get live hand label
                                live_hand_label = "Unknown"
                                if live_tracker.has_data():
                                    landmarks_data = live_tracker.get_data()
                                    if landmarks_data['hands']:
                                        live_hand_label = landmarks_data['hands'][0]['hand_label']
                                
                                match_text = f"Match: {current_match.upper()} (RMS: {current_distance:.1f})"
                                hand_text = f"Live: {live_hand_label} Hand"
                                text_display = f"Text: '{detected_text}'"
                                
                                cv2.putText(triple_view, match_text, (10, 320), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                                cv2.putText(triple_view, hand_text, (10, 340), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)
                                cv2.putText(triple_view, text_display, (10, 360), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
                                
                                # Add instructions
                                cv2.putText(triple_view, "SPACE: Add letter | R: Reset | B: Backspace | Q: Quit", (10, 380), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                        else:
                            # Dual-view: Camera + Live landmarks (fallback)
                            triple_view = np.hstack([frame_resized, viz_image])
                            cv2.line(triple_view, (frame_resized.shape[1], 0), (frame_resized.shape[1], 400), (255, 255, 255), 2)
                            
                            # Add text display to dual-view
                            text_display = f"Text: '{detected_text}'"
                            cv2.putText(triple_view, text_display, (10, 360), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
                            cv2.putText(triple_view, "SPACE: Add letter | R: Reset | B: Backspace | Q: Quit", (10, 380), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                        
                        last_viz_update = current_time
                    
                    # Display the triple-view (reuse previous visualization if not updating)
                    if 'triple_view' in locals():
                        cv2.imshow('Live Hand Detection + ASL Recognition', triple_view)
                    else:
                        # First time - create initial visualization
                        landmarks_data = live_tracker.get_data()
                        viz_image = create_landmark_visualization(landmarks_data, width=400, height=400)
                        frame_resized = cv2.resize(frame, (int(frame.shape[1] * 400 / frame.shape[0]), 400))
                        
                        if match_viz_image is not None:
                            triple_view = np.hstack([frame_resized, viz_image, match_viz_image])
                            cv2.line(triple_view, (frame_resized.shape[1], 0), (frame_resized.shape[1], 400), (255, 255, 255), 2)
                            cv2.line(triple_view, (frame_resized.shape[1] + viz_image.shape[1], 0), (frame_resized.shape[1] + viz_image.shape[1], 400), (255, 255, 255), 2)
                        else:
                            triple_view = np.hstack([frame_resized, viz_image])
                            cv2.line(triple_view, (frame_resized.shape[1], 0), (frame_resized.shape[1], 400), (255, 255, 255), 2)
                        
                        cv2.imshow('Live Hand Detection + ASL Recognition', triple_view)
                        last_viz_update = current_time
                    
                except Exception as e:
                    print(f"Error creating visualization: {e}")
                    # Fallback to single camera view
                    cv2.imshow('Live Hand Detection', frame)
            else:
                # Display single camera view when no hand data available
                cv2.imshow('Live Hand Detection', frame)
            
            # Check for key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                # Export current frame to JSON
                if live_tracker.export_to_json():
                    print(f"Exported current frame to JSON at {live_tracker.timestamp}")
                else:
                    print("Failed to export to JSON")
            elif key == ord(' '):  # Spacebar pressed
                # Add current match to text
                if current_match:
                    detected_text += current_match.upper()
                    text_history.append(current_match.upper())
                    print(f"Added '{current_match.upper()}' to text. Current text: '{detected_text}'")
                else:
                    print("No match detected to add to text")
            elif key == ord('r'):  # Reset text
                detected_text = ""
                text_history = []
                print("Text reset")
            elif key == ord('b'):  # Backspace (remove last character)
                if detected_text:
                    removed_char = detected_text[-1]
                    detected_text = detected_text[:-1]
                    if text_history:
                        text_history.pop()
                    print(f"Removed '{removed_char}'. Current text: '{detected_text}'")
                else:
                    print("No text to remove")
            
            frame_count += 1
    
    except KeyboardInterrupt:
        print("\nStopping optimized live hand detection...")
    
    finally:
        # Cleanup
        cap.release()
        cv2.destroyAllWindows()
        hands.close()
        print(f"Optimized live hand detection stopped. Processed {frame_count} frames.")

if __name__ == "__main__":
    main()
