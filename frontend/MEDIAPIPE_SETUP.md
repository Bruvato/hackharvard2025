# MediaPipe HandLandmarker Setup

This document explains how the MediaPipe HandLandmarker is implemented in the HandSpeak AI frontend.

## Overview

The MediaPipe HandLandmarker component provides real-time hand landmark detection and visualization overlay on the camera feed. It uses Google's MediaPipe Tasks Vision library to detect and track hand landmarks.

## Implementation Details

### Key Features

- **Real-time Hand Detection**: Detects up to 2 hands simultaneously
- **Landmark Visualization**: Draws hand skeleton and landmarks on canvas overlay
- **Handedness Detection**: Distinguishes between left and right hands
- **GPU/CPU Fallback**: Automatically falls back to CPU if GPU is unavailable
- **Performance Optimized**: Uses requestAnimationFrame for smooth rendering

### Component Structure

```
MediaPipeHandLandmarker/
├── MediaPipeHandLandmarker.tsx  # Main component
├── lib/drawing-utils.ts         # Drawing utilities
└── MEDIAPIPE_SETUP.md          # This documentation
```

### Key Functions

#### `initializeMediaPipe()`

- Loads MediaPipe Tasks Vision library from CDN
- Creates HandLandmarker instance with GPU/CPU fallback
- Sets up configuration for 2 hands detection

#### `processFrame()`

- Processes each video frame for hand landmarks
- Converts MediaPipe landmarks to canvas coordinates
- Draws hand skeleton and landmarks using custom drawing utilities
- Calls `onResults` callback with detected hand data

#### Drawing Utilities

- `drawConnectors()`: Draws hand skeleton connections
- `drawLandmarks()`: Draws individual landmark points
- `HAND_CONNECTIONS`: Defines hand skeleton structure

## Configuration

### MediaPipe Settings

```typescript
const handLandmarker = await HandLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    delegate: "GPU", // Falls back to "CPU" if GPU fails
  },
  runningMode: "VIDEO", // Switches from "IMAGE" to "VIDEO" mode
  numHands: 2, // Maximum number of hands to detect
});
```

### Visual Settings

- **Left Hand**: Green color (#00FF00)
- **Right Hand**: Red color (#FF0000)
- **Connection Lines**: 5px width
- **Landmark Points**: 2px width

## Usage

### Basic Usage

```tsx
import MediaPipeHandLandmarker from "./components/MediaPipeHandLandmarker";

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);

  const handleResults = (results) => {
    console.log("Detected hands:", results.landmarks.length);
  };

  return (
    <div>
      <video ref={videoRef} />
      <canvas ref={canvasRef} />
      <MediaPipeHandLandmarker
        videoRef={videoRef}
        canvasRef={canvasRef}
        isActive={isActive}
        onResults={handleResults}
      />
    </div>
  );
}
```

### Props

| Prop        | Type                                   | Description                         |
| ----------- | -------------------------------------- | ----------------------------------- |
| `videoRef`  | `RefObject<HTMLVideoElement \| null>`  | Reference to video element          |
| `canvasRef` | `RefObject<HTMLCanvasElement \| null>` | Reference to canvas overlay         |
| `isActive`  | `boolean`                              | Whether hand detection is active    |
| `onResults` | `(results) => void`                    | Callback for hand detection results |

### Results Format

```typescript
interface HandResult {
  landmarks: Point[]; // 21 landmark points per hand
  handedness: "Left" | "Right";
  score: number; // Detection confidence (0-1)
}

interface Results {
  landmarks: HandResult[];
}
```

## Performance Considerations

### Optimization Features

1. **Frame Rate Control**: Only processes new video frames
2. **GPU Acceleration**: Uses WebGL for faster processing
3. **Efficient Drawing**: Minimizes canvas operations
4. **Memory Management**: Proper cleanup on component unmount

### Browser Compatibility

- **Chrome**: Full support with GPU acceleration
- **Firefox**: Supported with CPU fallback
- **Safari**: Supported with CPU fallback
- **Edge**: Full support with GPU acceleration

### System Requirements

- **Minimum RAM**: 4GB
- **GPU**: WebGL 2.0 support recommended
- **CPU**: Modern multi-core processor
- **Network**: Stable internet for model loading

## Troubleshooting

### Common Issues

1. **Model Loading Failed**

   - Check internet connection
   - Verify CDN accessibility
   - Try refreshing the page

2. **GPU Not Available**

   - Component automatically falls back to CPU
   - Check browser WebGL support
   - Update graphics drivers

3. **Poor Performance**

   - Close other applications
   - Ensure good lighting
   - Check system resources

4. **No Hand Detection**
   - Ensure hands are visible in frame
   - Check camera permissions
   - Verify video element is playing

### Debug Mode

Enable debug logging by checking browser console:

```javascript
// MediaPipe initialization logs
console.log("Initializing MediaPipe HandLandmarker...");
console.log("MediaPipe HandLandmarker initialized successfully");

// Hand detection logs
console.log("Hand landmarks detected:", results.landmarks.length);
console.log("Hand results:", results);
```

## Integration with Sign Language Recognition

The MediaPipe HandLandmarker provides the foundation for sign language recognition by:

1. **Landmark Extraction**: Provides 21 precise hand landmarks per hand
2. **Hand Tracking**: Maintains consistent hand identification across frames
3. **Gesture Analysis**: Enables gesture recognition algorithms to analyze hand poses
4. **Real-time Processing**: Supports live sign language translation

The detected landmarks are used by the backend sign language recognition system to classify gestures and provide text translations.

## Future Enhancements

- **Multi-hand Gestures**: Support for complex two-handed signs
- **Gesture History**: Track gesture sequences over time
- **Custom Models**: Support for domain-specific gesture recognition
- **Performance Metrics**: Real-time performance monitoring
- **Offline Mode**: Local model loading for offline operation
