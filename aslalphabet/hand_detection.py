import cv2
import mediapipe as mp
import os
import json
import numpy as np
import math

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
        print("Warning: Could not find wrist or index finger tip landmarks for rotation normalization")
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
        
        # Update relative coordinates
        landmark["relative_to_wrist_scaled"]["x"] = float(rotated_x)
        landmark["relative_to_wrist_scaled"]["y"] = float(rotated_y)
    
    return landmarks_data

def detect_hands_and_save_landmarks():
    """
    Detect hand landmarks in all images in the images/ directory
    and save relative positions to individual files.
    """
    # Initialize MediaPipe hands
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    
    # Create hands object with configuration
    hands = mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    # Get all image files in the images directory
    images_dir = "images"
    if not os.path.exists(images_dir):
        print(f"Error: {images_dir} directory not found!")
        return
    
    image_files = [f for f in os.listdir(images_dir) 
                   if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff'))]
    
    if not image_files:
        print(f"No image files found in {images_dir} directory!")
        return
    
    print(f"Found {len(image_files)} image files to process...")
    
    for image_file in image_files:
        image_path = os.path.join(images_dir, image_file)
        print(f"Processing: {image_file}")
        
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            print(f"Warning: Could not read {image_file}")
            continue
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Get image dimensions
        h, w, c = image.shape
        
        # Process the image
        results = hands.process(image_rgb)
        
        # Prepare data structure for this image
        image_data = {
            "image_name": image_file,
            "original_width": w,
            "original_height": h,
            "hands_detected": 0,
            "hands": []
        }
        
        if results.multi_hand_landmarks:
            image_data["hands_detected"] = len(results.multi_hand_landmarks)
            
            # First pass: collect all landmark positions to calculate bounding box
            all_x_coords = []
            all_y_coords = []
            
            for hand_landmarks in results.multi_hand_landmarks:
                for landmark in hand_landmarks.landmark:
                    x = landmark.x * w
                    y = landmark.y * h
                    all_x_coords.append(x)
                    all_y_coords.append(y)
            
            # Calculate bounding box and scaling factors
            if all_x_coords and all_y_coords:
                min_x, max_x = min(all_x_coords), max(all_x_coords)
                min_y, max_y = min(all_y_coords), max(all_y_coords)
                
                # Add some padding (10% of the range)
                x_range = max_x - min_x
                y_range = max_y - min_y
                padding_x = x_range * 0.1
                padding_y = y_range * 0.1
                
                min_x -= padding_x
                max_x += padding_x
                min_y -= padding_y
                max_y += padding_y
                
                # Target coordinate system (2000x2000)
                target_size = 2000
                
                # Calculate scale factors to fit within target size
                scale_x = target_size / (max_x - min_x) if (max_x - min_x) > 0 else 1
                scale_y = target_size / (max_y - min_y) if (max_y - min_y) > 0 else 1
                
                # Use the smaller scale factor to maintain aspect ratio
                scale_factor = min(scale_x, scale_y)
                
                # Calculate offset to center the landmarks
                scaled_width = (max_x - min_x) * scale_factor
                scaled_height = (max_y - min_y) * scale_factor
                offset_x = (target_size - scaled_width) / 2
                offset_y = (target_size - scaled_height) / 2
                
                image_data["scaling_info"] = {
                    "min_x": min_x,
                    "max_x": max_x,
                    "min_y": min_y,
                    "max_y": max_y,
                    "scale_factor": scale_factor,
                    "offset_x": offset_x,
                    "offset_y": offset_y,
                    "target_size": target_size
                }
            else:
                # Fallback scaling if no landmarks found
                scale_factor = 1.0
                offset_x = 0.0
                offset_y = 0.0
                image_data["scaling_info"] = {
                    "min_x": 0,
                    "max_x": w,
                    "min_y": 0,
                    "max_y": h,
                    "scale_factor": scale_factor,
                    "offset_x": offset_x,
                    "offset_y": offset_y,
                    "target_size": 2000
                }
            
            for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
                # Get hand classification (left/right)
                hand_classification = results.multi_handedness[hand_idx]
                hand_label = hand_classification.classification[0].label
                confidence = hand_classification.classification[0].score
                
                # Extract landmark positions
                landmarks = []
                wrist_position = None
                
                for idx, landmark in enumerate(hand_landmarks.landmark):
                    # Get pixel coordinates
                    x = landmark.x * w
                    y = landmark.y * h
                    z = landmark.z * w  # MediaPipe uses z relative to wrist
                    
                    # Apply edge-to-edge scaling
                    scaling_info = image_data["scaling_info"]
                    scale_factor = scaling_info["scale_factor"]
                    offset_x = scaling_info["offset_x"]
                    offset_y = scaling_info["offset_y"]
                    
                    # Scale and center the coordinates
                    x_scaled = (x - scaling_info["min_x"]) * scale_factor + offset_x
                    y_scaled = (y - scaling_info["min_y"]) * scale_factor + offset_y
                    z_scaled = z * scale_factor  # Z scaling without offset
                    
                    landmark_data = {
                        "landmark_id": idx,
                        "landmark_name": mp_hands.HandLandmark(idx).name,
                        "x_original": float(x),
                        "y_original": float(y),
                        "z_original": float(z),
                        "x_scaled": float(x_scaled),
                        "y_scaled": float(y_scaled),
                        "z_scaled": float(z_scaled)
                    }
                    
                    # Store wrist position (landmark 0) for reference
                    if idx == 0:  # Wrist landmark
                        wrist_position = (x, y, z)
                        wrist_position_scaled = (x_scaled, y_scaled, z_scaled)
                        landmark_data["relative_to_wrist_original"] = {
                            "x": 0.0,
                            "y": 0.0,
                            "z": 0.0
                        }
                        landmark_data["relative_to_wrist_scaled"] = {
                            "x": 0.0,
                            "y": 0.0,
                            "z": 0.0
                        }
                    else:
                        # Calculate relative position to wrist (both original and scaled)
                        if wrist_position is not None:
                            # Original coordinates relative to wrist
                            rel_x = x - wrist_position[0]
                            rel_y = y - wrist_position[1]
                            rel_z = z - wrist_position[2]
                            
                            # Scaled coordinates relative to wrist
                            rel_x_scaled = x_scaled - wrist_position_scaled[0]
                            rel_y_scaled = y_scaled - wrist_position_scaled[1]
                            rel_z_scaled = z_scaled - wrist_position_scaled[2]
                            
                            landmark_data["relative_to_wrist_original"] = {
                                "x": float(rel_x),
                                "y": float(rel_y),
                                "z": float(rel_z)
                            }
                            landmark_data["relative_to_wrist_scaled"] = {
                                "x": float(rel_x_scaled),
                                "y": float(rel_y_scaled),
                                "z": float(rel_z_scaled)
                            }
                    
                    landmarks.append(landmark_data)
                
                # Apply rotation normalization using arctangent formula
                landmarks = normalize_hand_rotation(landmarks)
                
                # Store hand data
                hand_data = {
                    "hand_index": hand_idx,
                    "hand_label": hand_label,
                    "confidence": float(confidence),
                    "landmarks": landmarks
                }
                
                image_data["hands"].append(hand_data)
        
        # Save data to file
        output_filename = f"{os.path.splitext(image_file)[0]}_hand_landmarks.json"
        output_path = os.path.join("hand_landmarks", output_filename)
        
        # Create output directory if it doesn't exist
        os.makedirs("hand_landmarks", exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(image_data, f, indent=2)
        
        print(f"Saved landmarks for {image_file} to {output_path}")
    
    # Clean up
    hands.close()
    print("Processing complete!")

def detect_hands_for_specific_letter(letter):
    """Detect hand landmarks for a specific letter image"""
    # Initialize MediaPipe hands
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    
    # Create hands object with configuration
    hands = mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    
    # Check if the specific letter image exists
    images_dir = "images"
    image_file = f"{letter.lower()}.jpg"
    image_path = os.path.join(images_dir, image_file)
    
    if not os.path.exists(image_path):
        print(f"Error: {image_file} not found in {images_dir} directory!")
        hands.close()
        return
    
    print(f"Processing specific letter: {letter.upper()}")
    
    # Read the image
    image = cv2.imread(image_path)
    if image is None:
        print(f"Warning: Could not read {image_file}")
        hands.close()
        return
    
    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Get image dimensions
    h, w, c = image.shape
    
    # Process the image
    results = hands.process(image_rgb)
    
    # Prepare data structure for this image
    image_data = {
        "image_name": image_file,
        "original_width": w,
        "original_height": h,
        "hands_detected": 0,
        "hands": []
    }
    
    if results.multi_hand_landmarks:
        image_data["hands_detected"] = len(results.multi_hand_landmarks)
        
        # First pass: collect all landmark positions to calculate bounding box
        all_x_coords = []
        all_y_coords = []
        
        for hand_landmarks in results.multi_hand_landmarks:
            for landmark in hand_landmarks.landmark:
                x = landmark.x * w
                y = landmark.y * h
                all_x_coords.append(x)
                all_y_coords.append(y)
        
        # Calculate bounding box and scaling factors
        if all_x_coords and all_y_coords:
            min_x, max_x = min(all_x_coords), max(all_x_coords)
            min_y, max_y = min(all_y_coords), max(all_y_coords)
            
            # Add some padding (10% of the range)
            x_range = max_x - min_x
            y_range = max_y - min_y
            padding_x = x_range * 0.1
            padding_y = y_range * 0.1
            
            min_x -= padding_x
            max_x += padding_x
            min_y -= padding_y
            max_y += padding_y
            
            # Target coordinate system (2000x2000)
            target_size = 2000
            
            # Calculate scale factors to fit within target size
            scale_x = target_size / (max_x - min_x) if (max_x - min_x) > 0 else 1
            scale_y = target_size / (max_y - min_y) if (max_y - min_y) > 0 else 1
            
            # Use the smaller scale factor to maintain aspect ratio
            scale_factor = min(scale_x, scale_y)
            
            # Calculate offset to center the landmarks
            scaled_width = (max_x - min_x) * scale_factor
            scaled_height = (max_y - min_y) * scale_factor
            offset_x = (target_size - scaled_width) / 2
            offset_y = (target_size - scaled_height) / 2
            
            image_data["scaling_info"] = {
                "min_x": min_x,
                "max_x": max_x,
                "min_y": min_y,
                "max_y": max_y,
                "scale_factor": scale_factor,
                "offset_x": offset_x,
                "offset_y": offset_y,
                "target_size": target_size
            }
        else:
            # Fallback scaling if no landmarks found
            scale_factor = 1.0
            offset_x = 0.0
            offset_y = 0.0
            image_data["scaling_info"] = {
                "min_x": 0,
                "max_x": w,
                "min_y": 0,
                "max_y": h,
                "scale_factor": scale_factor,
                "offset_x": offset_x,
                "offset_y": offset_y,
                "target_size": 2000
            }
        
        for hand_idx, hand_landmarks in enumerate(results.multi_hand_landmarks):
            # Get hand classification (left/right)
            hand_classification = results.multi_handedness[hand_idx]
            hand_label = hand_classification.classification[0].label
            confidence = hand_classification.classification[0].score
            
            # Extract landmark positions
            landmarks = []
            wrist_position = None
            
            for idx, landmark in enumerate(hand_landmarks.landmark):
                # Get pixel coordinates
                x = landmark.x * w
                y = landmark.y * h
                z = landmark.z * w  # MediaPipe uses z relative to wrist
                
                # Apply edge-to-edge scaling
                scaling_info = image_data["scaling_info"]
                scale_factor = scaling_info["scale_factor"]
                offset_x = scaling_info["offset_x"]
                offset_y = scaling_info["offset_y"]
                
                # Scale and center the coordinates
                x_scaled = (x - scaling_info["min_x"]) * scale_factor + offset_x
                y_scaled = (y - scaling_info["min_y"]) * scale_factor + offset_y
                z_scaled = z * scale_factor  # Z scaling without offset
                
                landmark_data = {
                    "landmark_id": idx,
                    "landmark_name": mp_hands.HandLandmark(idx).name,
                    "x_original": float(x),
                    "y_original": float(y),
                    "z_original": float(z),
                    "x_scaled": float(x_scaled),
                    "y_scaled": float(y_scaled),
                    "z_scaled": float(z_scaled)
                }
                
                # Store wrist position (landmark 0) for reference
                if idx == 0:  # Wrist landmark
                    wrist_position = (x, y, z)
                    wrist_position_scaled = (x_scaled, y_scaled, z_scaled)
                    landmark_data["relative_to_wrist_original"] = {
                        "x": 0.0,
                        "y": 0.0,
                        "z": 0.0
                    }
                    landmark_data["relative_to_wrist_scaled"] = {
                        "x": 0.0,
                        "y": 0.0,
                        "z": 0.0
                    }
                else:
                    # Calculate relative position to wrist (both original and scaled)
                    if wrist_position is not None:
                        # Original coordinates relative to wrist
                        rel_x = x - wrist_position[0]
                        rel_y = y - wrist_position[1]
                        rel_z = z - wrist_position[2]
                        
                        # Scaled coordinates relative to wrist
                        rel_x_scaled = x_scaled - wrist_position_scaled[0]
                        rel_y_scaled = y_scaled - wrist_position_scaled[1]
                        rel_z_scaled = z_scaled - wrist_position_scaled[2]
                        
                        landmark_data["relative_to_wrist_original"] = {
                            "x": float(rel_x),
                            "y": float(rel_y),
                            "z": float(rel_z)
                        }
                        landmark_data["relative_to_wrist_scaled"] = {
                            "x": float(rel_x_scaled),
                            "y": float(rel_y_scaled),
                            "z": float(rel_z_scaled)
                        }
                
                landmarks.append(landmark_data)
            
            # Apply rotation normalization using arctangent formula
            landmarks = normalize_hand_rotation(landmarks)
            
            # Store hand data
            hand_data = {
                "hand_index": hand_idx,
                "hand_label": hand_label,
                "confidence": float(confidence),
                "landmarks": landmarks
            }
            
            image_data["hands"].append(hand_data)
    
    # Save data to file
    output_filename = f"{letter.lower()}_hand_landmarks.json"
    output_path = os.path.join("hand_landmarks", output_filename)
    
    # Create output directory if it doesn't exist
    os.makedirs("hand_landmarks", exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(image_data, f, indent=2)
    
    print(f"Saved landmarks for {letter.upper()} to {output_path}")
    
    # Clean up
    hands.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Process specific letter
        letter = sys.argv[1].lower()
        if letter in 'abcdefghijklmnopqrstuvwxyz':
            print(f"Processing specific letter: {letter.upper()}")
            detect_hands_for_specific_letter(letter)
        else:
            print("Invalid letter. Please use a letter from a-z.")
    else:
        # Process all letters
        detect_hands_and_save_landmarks()
