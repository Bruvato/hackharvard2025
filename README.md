# HandSpeak AI - Sign Language Recognition & Translation

A real-time sign language recognition and translation application built for HACKHARVARD 2025.

## Features

- 🎥 **Real-time Camera Processing**: Live sign language recognition using your webcam
- 🔊 **Text-to-Speech**: Convert translated text to speech using ElevenLabs AI voices
- 📝 **Translation History**: Keep track of all your translations
- 🎨 **Modern UI**: Clean, accessible interface built with React and Tailwind CSS

## Quick Start

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Bruvato/hackharvard2025.git
   cd hackharvard2025
   ```

2. **Install frontend dependencies**:

   ```bash
   npm install
   ```

3. **Set up the backend** (Sign Language Recognition):

   ```bash
   cd backend
   uv sync
   ```

4. **Set up ElevenLabs API** (for text-to-speech):

   - Follow the [ElevenLabs Setup Guide](./ELEVENLABS_SETUP.md)
   - Create a `.env` file with your API key

5. **Start the backend server**:

   ```bash
   cd backend
   ./start.sh
   ```

6. **Start the frontend** (in a new terminal):

   ```bash
   npm run dev
   ```

7. **Open your browser** and navigate to `http://localhost:3000`

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: FastAPI + MediaPipe + Python 3.11
- **Sign Language Recognition**: MediaPipe Hands
- **Styling**: Tailwind CSS + Radix UI
- **Text-to-Speech**: ElevenLabs API
- **Icons**: Lucide React
- **Build Tools**: Vite (frontend), uv (backend)

## API Integration

### Sign Language Recognition Backend

- **MediaPipe Hands** for hand landmark detection
- **Real-time gesture recognition** with configurable confidence thresholds
- **REST API endpoints** for image and video frame processing
- **Batch processing** support for multiple images
- **Health monitoring** and error handling

### ElevenLabs Text-to-Speech

- **6 AI voices** available (Rachel, Antoni, Domi, Bella, Elli)
- **Customizable voice settings** (stability, similarity, style)
- **Real-time audio generation** from translated text

### Camera Access

- **WebRTC getUserMedia** for camera access
- **Real-time video processing** with MediaPipe integration
- **Permission handling** with user-friendly error messages
- **Backend connectivity** monitoring and status indicators

## Development

### Available Scripts

- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `cd backend && ./start.sh` - Start backend server
- `./test_backend.sh` - Test backend API endpoints

### Project Structure

```
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   └── App.tsx            # Main application
├── backend/               # Python FastAPI backend
│   ├── main.py            # FastAPI server
│   ├── sign_language_model.py  # MediaPipe integration
│   ├── start.sh           # Backend startup script
│   └── pyproject.toml      # Python dependencies
└── README.md              # This file
```

## Contributing

This project was built for HACKHARVARD 2025. Feel free to fork and contribute!

## License

MIT License - see LICENSE file for details.
