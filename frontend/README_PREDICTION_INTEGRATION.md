# ASL Letter Prediction Integration

This document describes the integration of the ASL letter prediction functionality with the frontend webcam interface.

## Overview

The frontend now includes real-time ASL letter prediction using hand landmark data from the webcam. When you show your hand to the camera, the system will:

1. Detect hand landmarks using MediaPipe
2. Send landmark data to the backend `/predict-letter` endpoint
3. Display the predicted ASL letter with confidence score

## Components Added

### 1. Prediction Service (`lib/prediction-service.ts`)

- Handles API calls to the backend prediction endpoint
- Converts MediaPipe landmarks to backend format
- Includes rate limiting and error handling

### 2. Prediction Display Component (`components/PredictionDisplay.tsx`)

- Shows predicted letters with confidence scores
- Displays processing status and error messages
- Provides visual feedback for prediction quality

### 3. ASL Prediction Hook (`hooks/useASLPrediction.ts`)

- Manages prediction state and logic
- Handles rate limiting and backend health checks
- Processes hand results from MediaPipe

### 4. Updated MediaPipe Component

- Modified to send landmark data for prediction
- Maintains existing hand landmark visualization
- Integrates seamlessly with existing functionality

## How It Works

1. **Camera Activation**: When you start the camera, MediaPipe begins detecting hand landmarks
2. **Landmark Processing**: Every second (configurable), the system sends landmark data to the backend
3. **Prediction**: The backend compares landmarks against ASL alphabet data and returns the closest match
4. **Display**: The predicted letter is shown with confidence score and additional metadata

## Features

- **Real-time Prediction**: Updates every 1 second while hands are detected
- **Confidence Scoring**: Shows prediction confidence with color-coded badges
- **Error Handling**: Displays connection errors and prediction failures
- **Rate Limiting**: Prevents excessive API calls (max 2 requests per second)
- **Backend Health**: Checks if the prediction backend is available

## Configuration

The prediction system can be configured in the `useASLPrediction` hook:

```typescript
const {
  prediction,
  isProcessing,
  isBackendAvailable,
  error,
  processHandResults,
  clearPrediction,
  checkBackendHealth,
} = useASLPrediction({
  processingInterval: 1000, // Process every 1 second
  confidenceThreshold: 0.6, // 60% confidence threshold
  maxProcessingRate: 2, // Max 2 requests per second
});
```

## UI Layout

The prediction display appears in the right column of the translator tab, between the camera feed and the translation output. It shows:

- **Large Letter Display**: The predicted ASL letter in large, bold text
- **Confidence Badge**: Color-coded confidence level (High/Medium/Low)
- **Distance Score**: RMS distance to the closest match
- **Hand Information**: Which hand was detected (Left/Right)
- **Status Messages**: Success/error messages

## Error States

The system handles several error conditions:

1. **Backend Offline**: Shows warning when prediction backend is unavailable
2. **No Hand Detected**: Displays instruction to show hand to camera
3. **Low Confidence**: Still shows prediction but with low confidence badge
4. **Network Errors**: Shows specific error messages for connection issues

## Performance Considerations

- **Rate Limiting**: Prevents overwhelming the backend with requests
- **Confidence Filtering**: Only processes hands with sufficient confidence
- **Efficient Updates**: Only updates UI when predictions change
- **Memory Management**: Properly cleans up resources on component unmount

## Testing

To test the prediction functionality:

1. Start the backend server: `python main.py` (in backend directory)
2. Start the frontend: `npm run dev` (in frontend directory)
3. Open the app and go to the Translator tab
4. Click "Start Recognition" to activate the camera
5. Show your hand to the camera and make ASL letters
6. Watch the prediction display for real-time letter recognition

## Troubleshooting

### Backend Not Available

- Ensure the backend server is running on `http://localhost:8000`
- Check that the `/predict-letter` endpoint is accessible
- Verify the ASL alphabet data files are present in `backend/classifier_tools/hand_landmarks/`

### No Predictions Showing

- Make sure your hand is clearly visible in the camera
- Check that hand landmarks are being detected (green/red dots on hand)
- Verify the confidence threshold isn't too high
- Ensure the backend is processing requests successfully

### Poor Prediction Accuracy

- Ensure good lighting conditions
- Keep your hand centered in the camera view
- Make clear, distinct ASL letter shapes
- Check that the hand landmarks are being detected accurately

## Future Enhancements

Potential improvements for the prediction system:

1. **Multi-hand Support**: Process both hands simultaneously
2. **Gesture Sequences**: Recognize sequences of letters to form words
3. **Custom Training**: Allow users to train custom gestures
4. **Offline Mode**: Cache predictions for offline use
5. **Performance Optimization**: Reduce processing latency
6. **Accessibility**: Add audio feedback for predictions
