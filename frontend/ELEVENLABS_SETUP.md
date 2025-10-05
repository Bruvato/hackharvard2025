# ElevenLabs Text-to-Speech Integration

This document explains how to set up and use the ElevenLabs text-to-speech feature in the HandSpeak AI application.

## Overview

The application now includes a high-quality text-to-speech feature powered by ElevenLabs API. This provides natural-sounding voice synthesis for the translation output area.

## Setup Instructions

### 1. Get ElevenLabs API Key

1. Visit [ElevenLabs](https://elevenlabs.io/)
2. Sign up for an account
3. Navigate to your profile/settings
4. Copy your API key

### 2. Configure Environment Variables

Create a `.env.local` file in the frontend directory with the following content:

```bash
# ElevenLabs Text-to-Speech API Configuration
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with your actual ElevenLabs API key.

### 3. Optional Configuration

You can also customize the voice and model settings:

```bash
# Optional: Customize voice settings
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
NEXT_PUBLIC_ELEVENLABS_MODEL_ID=eleven_monolingual_v1
```

## Features

### Speaker Button

- Located in the translation output area next to the existing "Copy Text" and "Speak" buttons
- Uses a speaker icon (Volume2) from Lucide React
- Shows loading state while processing
- Displays error states if API key is missing or request fails

### Voice Quality

- Uses ElevenLabs' high-quality neural voice synthesis
- Default voice: Rachel (21m00Tcm4TlvDq8ikWAM)
- Supports natural-sounding speech with proper intonation

### Error Handling

- Graceful fallback when API key is not configured
- Clear error messages for network issues
- Toast notifications for user feedback

## Usage

1. Start the sign language recognition
2. Let the system translate your signs to text
3. Click the speaker button (Volume2 icon) next to the translation
4. The text will be spoken using ElevenLabs' high-quality voice

## Technical Implementation

### Files Added/Modified

1. **`lib/elevenlabs-tts.ts`** - Core service for ElevenLabs API integration
2. **`components/ElevenLabsTextToSpeech.tsx`** - React component for the speaker button
3. **`app/page.tsx`** - Updated to include the new speaker button

### Key Features

- **Singleton Pattern**: Single instance of ElevenLabsTTS service
- **Error Handling**: Comprehensive error handling for API failures
- **Loading States**: Visual feedback during audio generation
- **Audio Playback**: Uses Web Audio API for high-quality playback
- **Responsive Design**: Button adapts to different screen sizes

## Troubleshooting

### Common Issues

1. **"ElevenLabs API key not configured"**

   - Make sure you've created `.env.local` with your API key
   - Restart the development server after adding environment variables

2. **"Network error" or API failures**

   - Check your internet connection
   - Verify your API key is correct
   - Check ElevenLabs service status

3. **Audio not playing**
   - Ensure your browser supports Web Audio API
   - Check browser audio permissions
   - Try refreshing the page

### Development Notes

- The component gracefully handles missing API keys
- Audio is generated on-demand for each request
- No audio caching is implemented (can be added for performance)
- The service supports custom voice and model configuration

## Cost Considerations

ElevenLabs charges based on character count. Monitor your usage in the ElevenLabs dashboard to avoid unexpected charges.

## Future Enhancements

Potential improvements that could be added:

1. **Voice Selection**: Allow users to choose from available voices
2. **Audio Caching**: Cache generated audio for repeated text
3. **Speed Control**: Allow users to adjust speech rate
4. **Voice Settings**: Expose stability and similarity boost controls
5. **Batch Processing**: Support for longer text segments
