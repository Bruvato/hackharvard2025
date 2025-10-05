# HandSpeak AI Frontend

A modern React/Next.js frontend for real-time sign language recognition and translation.

## Features

- **Real-time Camera Feed**: Live video capture with hand landmark detection
- **Sign Language Recognition**: Integration with backend AI for gesture recognition
- **Text-to-Speech**: Built-in speech synthesis for translated text
- **Translation History**: Track and manage past translations
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Theme Support**: Light/dark mode with system preference detection

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Lucide React** - Icons
- **Sonner** - Toast notifications

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Camera access (for sign language recognition)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Backend Integration

The frontend expects a backend server running on `http://localhost:8000` with the following endpoints:

- `GET /health` - Health check
- `POST /recognize` - Sign language recognition

## Usage

1. **Camera Setup**: Click "Start Recognition" to activate your camera
2. **Sign Recognition**: Perform sign language gestures in front of the camera
3. **View Translations**: See real-time translations appear in the current translation panel
4. **Text-to-Speech**: Use the TTS feature to hear translated text
5. **History**: View past translations in the History tab

## Components

### Core Components

- **App** (`app/page.tsx`) - Main application component
- **TextToSpeech** - Speech synthesis component
- **MediaPipeHandLandmarker** - Hand landmark detection (mock implementation)

### UI Components

- **Button** - Customizable button component
- **Card** - Container component
- **Badge** - Status indicators
- **Alert** - Error and warning messages
- **Tabs** - Tabbed navigation

### Hooks

- **useSignLanguageRecognition** - Manages sign language recognition logic

## Configuration

The application can be configured through the `useSignLanguageRecognition` hook:

```typescript
const recognition = useSignLanguageRecognition({
  processingInterval: 2000, // Process every 2 seconds
  confidenceThreshold: 0.7, // 70% confidence threshold
  maxProcessingRate: 1, // Max 1 request per second
  backendUrl: "http://localhost:8000",
});
```

## Development

### Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── TextToSpeech.tsx  # TTS component
│   └── MediaPipeHandLandmarker.tsx
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
└── README.md
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### Camera Issues

- Ensure camera permissions are granted
- Try refreshing the page
- Check if another application is using the camera

### Backend Connection

- Verify backend server is running on port 8000
- Check network connectivity
- Review browser console for error messages

### Performance

- Close other applications using the camera
- Ensure good lighting for better recognition
- Use a modern browser for optimal performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of HackHarvard 2025.
