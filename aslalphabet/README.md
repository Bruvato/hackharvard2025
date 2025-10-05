# Hand Landmark Detection with MediaPipe

This script uses MediaPipe to detect hand landmarks in images and saves the relative positions of each landmark to the wrist.

## Setup

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Place your images in the `images/` directory
2. Run the script:
```bash
python hand_detection.py
```

## Output

The script will:
- Process all images in the `images/` directory
- Detect hand landmarks using MediaPipe
- Calculate the relative position of each landmark to the wrist
- Save results to individual JSON files in the `hand_landmarks/` directory

Each output file will be named `{image_name}_hand_landmarks.json` and contain:
- Image name
- Number of hands detected
- For each hand:
  - Hand label (Left/Right)
  - Confidence score
  - All 21 landmarks with their positions and relative positions to the wrist

## Landmark Information

MediaPipe detects 21 hand landmarks:
- 0: WRIST
- 1-4: THUMB (CMC, MCP, IP, TIP)
- 5-8: INDEX_FINGER (MCP, PIP, DIP, TIP)
- 9-12: MIDDLE_FINGER (MCP, PIP, DIP, TIP)
- 13-16: RING_FINGER (MCP, PIP, DIP, TIP)
- 17-20: PINKY (MCP, PIP, DIP, TIP)

The wrist landmark (0) is used as the reference point, so its relative position is always (0, 0, 0).
