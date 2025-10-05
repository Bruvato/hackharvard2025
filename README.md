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

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up ElevenLabs API** (for text-to-speech):
   - Follow the [ElevenLabs Setup Guide](./ELEVENLABS_SETUP.md)
   - Create a `.env` file with your API key

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to `http://localhost:3000`

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Radix UI
- **Text-to-Speech**: ElevenLabs API
- **Icons**: Lucide React
- **Build Tool**: Vite

## API Integration

### ElevenLabs Text-to-Speech
- **6 AI voices** available (Rachel, Antoni, Domi, Bella, Elli)
- **Customizable voice settings** (stability, similarity, style)
- **Real-time audio generation** from translated text

### Camera Access
- **WebRTC getUserMedia** for camera access
- **Real-time video processing** (placeholder for ML model)
- **Permission handling** with user-friendly error messages

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production

### Project Structure
```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   └── TextToSpeech.tsx
├── App.tsx           # Main application
├── main.tsx          # Entry point
└── index.css        # Tailwind CSS
```

## Contributing

This project was built for HACKHARVARD 2025. Feel free to fork and contribute!

## License

MIT License - see LICENSE file for details.
