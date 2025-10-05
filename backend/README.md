# Sign Language Recognition Backend

A FastAPI-based backend service for real-time sign language recognition using MediaPipe.

## Features

- 🎥 **Real-time Sign Language Recognition**: Process images and video frames
- 🤖 **MediaPipe Integration**: Advanced hand landmark detection
- 🌐 **REST API**: Easy-to-use endpoints for frontend integration
- 📊 **Multiple Input Formats**: Support for file uploads and base64 encoded images
- 🔄 **Batch Processing**: Process multiple images at once
- 🎯 **Gesture Detection**: Recognize common sign language gestures

## Supported Gestures

- Hello (waving)
- Thank You
- Yes/No
- Please/Sorry
- Help
- Good/Bad
- Love

## Quick Start

### Prerequisites

- Python 3.11+
- uv package manager

### Installation

1. **Install dependencies**:

   ```bash
   cd backend
   uv sync
   ```

2. **Start the server**:

   ```bash
   uv run python main.py
   ```

3. **Access the API**:
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

## API Endpoints

### Core Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /gestures` - List supported gestures

### Recognition Endpoints

- `POST /recognize` - Upload image file for recognition
- `POST /recognize-base64` - Send base64 encoded image
- `POST /recognize-video-frame` - Process video frame data
- `POST /batch-recognize` - Process multiple images

### Example Usage

#### Upload Image File

```bash
curl -X POST "http://localhost:8000/recognize" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@image.jpg"
```

#### Send Base64 Image

```bash
curl -X POST "http://localhost:8000/recognize-base64" \
     -H "Content-Type: application/json" \
     -d '{"image": "base64_encoded_image_data"}'
```

## Response Format

```json
{
  "success": true,
  "result": {
    "landmarks": [
      {
        "x": 0.5,
        "y": 0.3,
        "z": 0.1
      }
    ],
    "gestures": [
      {
        "gesture": "hello",
        "confidence": 0.85,
        "translation": "Hello"
      }
    ],
    "confidence": 0.85,
    "num_hands": 1
  },
  "message": "Detected 1 gesture(s)"
}
```

## Development

### Running in Development Mode

```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test gestures endpoint
curl http://localhost:8000/gestures
```

## Configuration

The MediaPipe hands model can be configured in `sign_language_model.py`:

```python
self.hands = self.mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5
)
```

## Custom Gestures

You can add custom gestures by:

1. Creating a detection function in `SignLanguageRecognizer`
2. Adding it to the `sign_gestures` dictionary
3. Providing a translation in `_get_translation()`

## Integration with Frontend

This backend is designed to work with the React frontend. The frontend can:

1. Capture camera frames
2. Send them to the backend via API calls
3. Display detected gestures and translations
4. Use the results for text-to-speech functionality

## Performance Notes

- MediaPipe is optimized for real-time processing
- Hand detection works best with good lighting
- Gesture recognition accuracy improves with clear hand positioning
- Consider implementing temporal analysis for better gesture detection

## Troubleshooting

### Common Issues

1. **Camera not detected**: Ensure proper camera permissions
2. **Low confidence scores**: Check lighting and hand positioning
3. **Multiple hands**: Adjust `max_num_hands` parameter
4. **Memory issues**: Reduce image resolution or implement frame skipping

### Logs

The application logs important events and errors. Check the console output for debugging information.

## License

MIT License - see LICENSE file for details.
