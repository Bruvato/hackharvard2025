# ASL Letter Prediction Endpoint

This document describes the new `/predict-letter` endpoint that takes hand landmark data and returns predicted ASL letters using the classifier tools.

## Endpoint Details

- **URL**: `POST /predict-letter`
- **Content-Type**: `application/json`
- **Response**: JSON with prediction results

## Request Format

The endpoint expects a JSON payload with the following structure:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "image_width": 640,
  "image_height": 480,
  "hands_detected": 1,
  "scaling_info": {
    "min_x": 0.0,
    "max_x": 640.0,
    "min_y": 0.0,
    "max_y": 480.0,
    "scale_factor": 1.0,
    "offset_x": 0.0,
    "offset_y": 0.0,
    "target_size": 2000
  },
  "hands": [
    {
      "hand_index": 0,
      "hand_label": "Right",
      "confidence": 0.95,
      "landmarks": [
        {
          "landmark_id": 0,
          "landmark_name": "WRIST",
          "x_raw": 320.0,
          "y_raw": 240.0,
          "z_raw": 0.0,
          "x_scaled": 1000.0,
          "y_scaled": 2000.0,
          "z_scaled": 0.0
        },
        {
          "landmark_id": 1,
          "landmark_name": "THUMB_CMC",
          "x_raw": 350.0,
          "y_raw": 220.0,
          "z_raw": -10.0,
          "x_scaled": 1100.0,
          "y_scaled": 1800.0,
          "z_scaled": -50.0
        }
        // ... 19 more landmarks (total of 21)
      ]
    }
  ]
}
```

### Field Descriptions

#### Top-level fields:

- `timestamp`: Optional timestamp string
- `image_width`: Width of the original image (default: 640)
- `image_height`: Height of the original image (default: 480)
- `hands_detected`: Number of hands detected (should match length of `hands` array)
- `scaling_info`: Optional scaling information for coordinate normalization
- `hands`: Array of hand data objects

#### Hand object fields:

- `hand_index`: Index of the hand (0-based)
- `hand_label`: "Left" or "Right"
- `confidence`: Detection confidence (0.0 to 1.0)
- `landmarks`: Array of 21 landmark objects

#### Landmark object fields:

- `landmark_id`: Landmark index (0-20)
- `landmark_name`: Name of the landmark (e.g., "WRIST", "THUMB_TIP")
- `x_raw`, `y_raw`, `z_raw`: Raw coordinates from MediaPipe
- `x_scaled`, `y_scaled`, `z_scaled`: Scaled coordinates for comparison

## Response Format

```json
{
  "success": true,
  "predicted_letter": "A",
  "confidence": 0.85,
  "distance": 150.5,
  "hand_label": "Right",
  "message": "Successfully predicted letter 'A'"
}
```

### Response Fields:

- `success`: Boolean indicating if prediction was successful
- `predicted_letter`: The predicted ASL letter (uppercase)
- `confidence`: Confidence score (0.0 to 1.0, higher is better)
- `distance`: RMS distance to the closest match (lower is better)
- `hand_label`: Hand label from the input data
- `message`: Human-readable status message

## Error Responses

### No hand data provided:

```json
{
  "success": false,
  "predicted_letter": null,
  "confidence": 0.0,
  "distance": null,
  "hand_label": null,
  "message": "No hand data provided"
}
```

### No ASL letter match found:

```json
{
  "success": false,
  "predicted_letter": null,
  "confidence": 0.0,
  "distance": null,
  "hand_label": null,
  "message": "No ASL letter match found"
}
```

## Usage Examples

### Python Example

```python
import requests
import json

# Sample landmark data
landmark_data = {
    "timestamp": "2024-01-01T12:00:00Z",
    "image_width": 640,
    "image_height": 480,
    "hands_detected": 1,
    "scaling_info": {
        "min_x": 0.0,
        "max_x": 640.0,
        "min_y": 0.0,
        "max_y": 480.0,
        "scale_factor": 1.0,
        "offset_x": 0.0,
        "offset_y": 0.0,
        "target_size": 2000
    },
    "hands": [
        {
            "hand_index": 0,
            "hand_label": "Right",
            "confidence": 0.95,
            "landmarks": [
                # ... 21 landmark objects
            ]
        }
    ]
}

# Make the request
response = requests.post(
    "http://localhost:8000/predict-letter",
    json=landmark_data,
    headers={"Content-Type": "application/json"}
)

if response.status_code == 200:
    result = response.json()
    print(f"Predicted letter: {result['predicted_letter']}")
    print(f"Confidence: {result['confidence']:.3f}")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

### JavaScript/Node.js Example

```javascript
const axios = require("axios");

const landmarkData = {
  timestamp: "2024-01-01T12:00:00Z",
  image_width: 640,
  image_height: 480,
  hands_detected: 1,
  scaling_info: {
    min_x: 0.0,
    max_x: 640.0,
    min_y: 0.0,
    max_y: 480.0,
    scale_factor: 1.0,
    offset_x: 0.0,
    offset_y: 0.0,
    target_size: 2000,
  },
  hands: [
    {
      hand_index: 0,
      hand_label: "Right",
      confidence: 0.95,
      landmarks: [
        // ... 21 landmark objects
      ],
    },
  ],
};

axios
  .post("http://localhost:8000/predict-letter", landmarkData)
  .then((response) => {
    const result = response.data;
    console.log(`Predicted letter: ${result.predicted_letter}`);
    console.log(`Confidence: ${result.confidence.toFixed(3)}`);
  })
  .catch((error) => {
    console.error("Error:", error.response?.data || error.message);
  });
```

## Testing

### Test Scripts

Two test scripts are provided:

1. **`test_predict_endpoint.py`**: Basic test with sample data
2. **`example_usage.py`**: Test with real landmark data from the classifier tools

### Running Tests

```bash
# Start the server
python main.py

# In another terminal, run the tests
python test_predict_endpoint.py
python example_usage.py
```

## How It Works

1. **Input Validation**: The endpoint validates the incoming landmark data structure
2. **Data Conversion**: Converts Pydantic models to the format expected by the classifier
3. **ASL Matching**: Uses `find_closest_asl_match()` from `live_hand_tracker.py` to find the closest ASL letter
4. **Confidence Calculation**: Calculates confidence based on the RMS distance to the match
5. **Response**: Returns the predicted letter with confidence and metadata

## Dependencies

The endpoint requires:

- `classifier_tools.live_hand_tracker` module
- ASL alphabet data files in `classifier_tools/hand_landmarks/`
- All 26 letters (a-z) as JSON files

## Notes

- The endpoint supports both left and right hands
- Hand orientation is considered in the matching algorithm
- Confidence scores are normalized based on expected distance ranges
- The endpoint is designed to work with MediaPipe hand landmark data
- All 21 hand landmarks are required for accurate prediction
