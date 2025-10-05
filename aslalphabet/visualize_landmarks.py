import json
import os
import time
import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.collections import LineCollection

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

def draw_hand_landmarks(landmarks_data, output_path):
    """Draw hand landmarks visualization"""
    # Create figure with white background
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    ax.set_facecolor('white')
    
    # Get colors for fingers
    finger_colors = get_finger_colors()
    
    # Process each hand
    for hand in landmarks_data['hands']:
        landmarks = hand['landmarks']
        hand_label = hand['hand_label']
        
        # Create lists to store points for each finger
        finger_points = {
            'THUMB': [],
            'INDEX_FINGER': [],
            'MIDDLE_FINGER': [],
            'RING_FINGER': [],
            'PINKY': [],
            'WRIST': []
        }
        
        # Group landmarks by finger
        for landmark in landmarks:
            landmark_name = landmark['landmark_name']
            finger = get_landmark_finger(landmark_name)
            
            # Use scaled coordinates
            x = landmark['x_scaled']
            y = landmark['y_scaled']
            
            finger_points[finger].append((x, y, landmark_name))
        
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
                           color=color, linewidth=3, alpha=0.7)
        
        # Draw circles at each landmark position
        for landmark in landmarks:
            landmark_name = landmark['landmark_name']
            finger = get_landmark_finger(landmark_name)
            color = finger_colors[finger]
            
            x = landmark['x_scaled']
            y = landmark['y_scaled']
            
            # Draw circle
            circle = plt.Circle((x, y), 8, color=color, fill=True, alpha=0.8)
            ax.add_patch(circle)
            
            # Add landmark ID as text
            ax.text(x, y-15, str(landmark['landmark_id']), 
                   ha='center', va='center', fontsize=8, fontweight='bold',
                   bbox=dict(boxstyle="round,pad=0.3", facecolor='white', alpha=0.7))
    
    # Set up the plot
    target_size = landmarks_data.get('scaling_info', {}).get('target_size', 2000)
    ax.set_xlim(0, target_size)
    ax.set_ylim(0, target_size)
    ax.invert_yaxis()  # Invert Y axis to match image coordinates
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    
    # Get scaling info for title
    scaling_info = landmarks_data.get('scaling_info', {})
    scale_factor = scaling_info.get('scale_factor', 1.0)
    
    ax.set_title(f"Hand Landmarks Visualization - {landmarks_data['image_name']}\n"
                f"Hand: {hand_label if landmarks_data['hands'] else 'None detected'}\n"
                f"Scale Factor: {scale_factor:.3f} (Edge-to-Edge Scaling)", 
                fontsize=14, fontweight='bold')
    ax.set_xlabel('X Coordinate (Edge-to-Edge Scaled)', fontsize=12)
    ax.set_ylabel('Y Coordinate', fontsize=12)
    
    # Add legend
    legend_elements = []
    for finger, color in finger_colors.items():
        if finger != 'WRIST':
            legend_elements.append(plt.Line2D([0], [0], marker='o', color='w', 
                                            markerfacecolor=color, markersize=10, 
                                            label=finger.replace('_', ' ').title()))
    
    ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1, 1))
    
    # Save the visualization
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    
    print(f"Saved visualization: {output_path}")

def visualize_all_landmarks():
    """Process all landmark files and create visualizations"""
    landmarks_dir = "hand_landmarks"
    output_dir = "landmark_visualizations"
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    if not os.path.exists(landmarks_dir):
        print(f"Error: {landmarks_dir} directory not found!")
        return
    
    # Get all JSON files
    json_files = [f for f in os.listdir(landmarks_dir) if f.endswith('.json')]
    
    if not json_files:
        print(f"No JSON files found in {landmarks_dir} directory!")
        return
    
    print(f"Found {len(json_files)} landmark files to visualize...")
    
    for json_file in json_files:
        json_path = os.path.join(landmarks_dir, json_file)
        
        try:
            # Load landmark data
            with open(json_path, 'r') as f:
                landmarks_data = json.load(f)
            
            # Create output filename
            base_name = os.path.splitext(json_file)[0]
            output_filename = f"{base_name}_visualization.png"
            output_path = os.path.join(output_dir, output_filename)
            
            # Create visualization
            draw_hand_landmarks(landmarks_data, output_path)
            
        except Exception as e:
            print(f"Error processing {json_file}: {str(e)}")
    
    print(f"\nVisualization complete! Check the '{output_dir}' directory for results.")

def visualize_live_landmarks():
    """Process live landmark data from memory and create visualizations"""
    try:
        # Import the live tracker
        from live_hand_tracker import live_tracker
        
        output_dir = "live_visualizations"
        os.makedirs(output_dir, exist_ok=True)
        
        # Check if live tracker has data
        if not live_tracker.has_data():
            print("No live hand data available in memory!")
            print("Run the optimized live hand detection script first:")
            print("python live_hand_tracker.py")
            return
        
        # Get current data from live tracker
        landmarks_data = live_tracker.get_data()
        
        # Create output filename with timestamp
        timestamp_str = landmarks_data['timestamp'].replace(':', '-').replace('.', '-')
        output_filename = f"live_hand_landmarks_{timestamp_str}_visualization.png"
        output_path = os.path.join(output_dir, output_filename)
        
        # Create visualization
        draw_live_hand_landmarks(landmarks_data, output_path)
        
        print(f"Live visualization saved: {output_path}")
        print(f"Data timestamp: {landmarks_data['timestamp']}")
        print(f"Hands detected: {landmarks_data['hands_detected']}")
        
    except ImportError:
        print("Error: Could not import live_hand_tracker module.")
        print("Make sure live_hand_tracker.py is in the same directory.")
        # Fallback to file-based method
        visualize_live_landmarks_from_files()
    except Exception as e:
        print(f"Error visualizing live landmarks: {str(e)}")
        # Fallback to file-based method
        visualize_live_landmarks_from_files()

def visualize_live_landmarks_from_files():
    """Fallback method: Process live landmark files and create visualizations"""
    live_landmarks_dir = "live_landmarks"
    output_dir = "live_visualizations"
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    if not os.path.exists(live_landmarks_dir):
        print(f"Error: {live_landmarks_dir} directory not found!")
        print("Run the live hand detection script first to generate live landmark data.")
        return
    
    # Get all JSON files in live_landmarks directory
    json_files = [f for f in os.listdir(live_landmarks_dir) if f.endswith('.json')]
    
    if not json_files:
        print(f"No JSON files found in {live_landmarks_dir} directory!")
        print("Run the live hand detection script first to generate live landmark data.")
        return
    
    print(f"Found {len(json_files)} live landmark files to visualize...")
    
    for json_file in json_files:
        json_path = os.path.join(live_landmarks_dir, json_file)
        
        try:
            # Load landmark data
            with open(json_path, 'r') as f:
                landmarks_data = json.load(f)
            
            # Create output filename
            base_name = os.path.splitext(json_file)[0]
            output_filename = f"{base_name}_visualization.png"
            output_path = os.path.join(output_dir, output_filename)
            
            # Create visualization
            draw_live_hand_landmarks(landmarks_data, output_path)
            
        except Exception as e:
            print(f"Error processing {json_file}: {str(e)}")
    
    print(f"\nLive visualization complete! Check the '{output_dir}' directory for results.")

def create_realtime_visualization():
    """Create a real-time visualization that updates while live detection is running"""
    try:
        from live_hand_tracker import live_tracker
        
        if not live_tracker.has_data():
            print("No live hand data available in memory!")
            print("Start the optimized live hand detection script first:")
            print("python live_hand_tracker.py")
            return
        
        print("Creating real-time visualization...")
        print("This will create a visualization of the current live data.")
        print("Press Ctrl+C to stop.")
        
        while True:
            try:
                # Get current data
                landmarks_data = live_tracker.get_data()
                
                # Create output filename with current timestamp
                timestamp_str = landmarks_data['timestamp'].replace(':', '-').replace('.', '-')
                output_filename = f"realtime_live_landmarks_{timestamp_str}.png"
                output_path = os.path.join("live_visualizations", output_filename)
                
                # Create visualization
                draw_live_hand_landmarks(landmarks_data, output_path)
                
                print(f"Updated visualization: {output_filename}")
                print(f"Hands detected: {landmarks_data['hands_detected']}")
                
                # Wait a bit before next update
                time.sleep(2)  # Update every 2 seconds
                
            except KeyboardInterrupt:
                print("\nStopping real-time visualization...")
                break
            except Exception as e:
                print(f"Error in real-time visualization: {e}")
                time.sleep(1)
                
    except ImportError:
        print("Error: Could not import live_hand_tracker module.")
        print("Make sure live_hand_tracker.py is in the same directory.")
    except Exception as e:
        print(f"Error creating real-time visualization: {e}")

def draw_live_hand_landmarks(landmarks_data, output_path):
    """Draw live hand landmarks visualization with timestamp"""
    # Create figure with white background
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    ax.set_facecolor('white')
    
    # Get colors for fingers
    finger_colors = get_finger_colors()
    
    # Process each hand
    for hand in landmarks_data['hands']:
        landmarks = hand['landmarks']
        hand_label = hand['hand_label']
        
        # Create lists to store points for each finger
        finger_points = {
            'THUMB': [],
            'INDEX_FINGER': [],
            'MIDDLE_FINGER': [],
            'RING_FINGER': [],
            'PINKY': [],
            'WRIST': []
        }
        
        # Group landmarks by finger
        for landmark in landmarks:
            landmark_name = landmark['landmark_name']
            finger = get_landmark_finger(landmark_name)
            
            # Use scaled coordinates
            x = landmark['x_scaled']
            y = landmark['y_scaled']
            
            finger_points[finger].append((x, y, landmark_name))
        
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
                           color=color, linewidth=3, alpha=0.7)
        
        # Draw circles at each landmark position
        for landmark in landmarks:
            landmark_name = landmark['landmark_name']
            finger = get_landmark_finger(landmark_name)
            color = finger_colors[finger]
            
            x = landmark['x_scaled']
            y = landmark['y_scaled']
            
            # Draw circle
            circle = plt.Circle((x, y), 8, color=color, fill=True, alpha=0.8)
            ax.add_patch(circle)
            
            # Add landmark ID as text
            ax.text(x, y-15, str(landmark['landmark_id']), 
                   ha='center', va='center', fontsize=8, fontweight='bold',
                   bbox=dict(boxstyle="round,pad=0.3", facecolor='white', alpha=0.7))
    
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
    
    ax.set_title(f"Live Hand Landmarks Visualization\n"
                f"Hand: {hand_label if landmarks_data['hands'] else 'None detected'}\n"
                f"Scale Factor: {scale_factor:.3f} | Timestamp: {timestamp}", 
                fontsize=14, fontweight='bold')
    ax.set_xlabel('X Coordinate (Edge-to-Edge Scaled)', fontsize=12)
    ax.set_ylabel('Y Coordinate', fontsize=12)
    
    # Add legend
    legend_elements = []
    for finger, color in finger_colors.items():
        if finger != 'WRIST':
            legend_elements.append(plt.Line2D([0], [0], marker='o', color='w', 
                                            markerfacecolor=color, markersize=10, 
                                            label=finger.replace('_', ' ').title()))
    
    ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1, 1))
    
    # Save the visualization
    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight', facecolor='white')
    plt.close()
    
    print(f"Saved live visualization: {output_path}")

def visualize_specific_letter(letter):
    """Visualize landmarks for a specific letter"""
    landmarks_dir = "hand_landmarks"
    output_dir = "landmark_visualizations"
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    if not os.path.exists(landmarks_dir):
        print(f"Error: {landmarks_dir} directory not found!")
        return
    
    # Check if the specific letter file exists
    json_file = f"{letter.lower()}_hand_landmarks.json"
    json_path = os.path.join(landmarks_dir, json_file)
    
    if not os.path.exists(json_path):
        print(f"Error: {json_file} not found in {landmarks_dir} directory!")
        print("Run hand detection first to generate landmark data.")
        return
    
    print(f"Visualizing landmarks for letter: {letter.upper()}")
    
    try:
        # Load landmark data
        with open(json_path, 'r') as f:
            landmarks_data = json.load(f)
        
        # Create output filename
        output_filename = f"{letter.lower()}_hand_landmarks_visualization.png"
        output_path = os.path.join(output_dir, output_filename)
        
        # Create visualization
        draw_hand_landmarks(landmarks_data, output_path)
        
        print(f"Visualization saved: {output_path}")
        
    except Exception as e:
        print(f"Error processing {json_file}: {str(e)}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "live":
            print("Visualizing live landmarks...")
            visualize_live_landmarks()
        elif sys.argv[1] == "realtime":
            print("Creating real-time visualization...")
            create_realtime_visualization()
        elif sys.argv[1].lower() in 'abcdefghijklmnopqrstuvwxyz':
            # Visualize specific letter
            letter = sys.argv[1].lower()
            visualize_specific_letter(letter)
        else:
            print("Usage:")
            print("  python visualize_landmarks.py          # Visualize static ASL alphabet landmarks")
            print("  python visualize_landmarks.py live     # Visualize current live data")
            print("  python visualize_landmarks.py realtime # Create real-time updating visualization")
            print("  python visualize_landmarks.py a        # Visualize specific letter (a-z)")
    else:
        print("Visualizing all landmarks...")
        visualize_all_landmarks()
