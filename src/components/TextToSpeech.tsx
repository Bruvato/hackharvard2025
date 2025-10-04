import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, Play, Square } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface TextToSpeechProps {
  text: string;
}

interface VoiceSettings {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

const VOICE_OPTIONS = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'Female' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'Male' },
  { id: 'AZnzlk1XvdvUeBn84Ebh', name: 'Domi', gender: 'Male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Female' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Antoni', gender: 'Male' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', gender: 'Female' }
];

export default function TextToSpeech({ text }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Default to Rachel
    stability: 0.5,
    similarityBoost: 0.5,
    style: 0.0,
    useSpeakerBoost: true
  });
  // ElevenLabs API Key - Replace with your actual API key
  const apiKey = 'YOUR_ELEVENLABS_API_KEY_HERE';
  const audioRef = useRef<HTMLAudioElement | null>(null);


  const speakText = async () => {
    if (!text.trim()) {
      setError('Please enter some text to convert to speech');
      return;
    }

    if (!apiKey.trim() || apiKey === 'YOUR_ELEVENLABS_API_KEY_HERE') {
      setError('Please configure your ElevenLabs API key in the code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceSettings.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: voiceSettings.stability,
            similarity_boost: voiceSettings.similarityBoost,
            style: voiceSettings.style,
            use_speaker_boost: voiceSettings.useSpeakerBoost
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }

    } catch (err: any) {
      console.error('TTS Error:', err);
      setError(`Text-to-speech failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
  };

  const selectedVoice = VOICE_OPTIONS.find(v => v.id === voiceSettings.voiceId);

  return (
    <div className="space-y-4">
      {/* Playing Status */}
      {isPlaying && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Playing audio...</span>
        </div>
      )}
        {/* Error Display */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}


        {/* Voice Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Voice Selection
          </label>
          <div className="grid grid-cols-3 gap-2">
            {VOICE_OPTIONS.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setVoiceSettings(prev => ({ ...prev, voiceId: voice.id }))}
                className={`p-2 text-xs rounded-lg border transition-colors ${
                  voiceSettings.voiceId === voice.id
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-sm">{voice.name}</div>
                <div className="text-gray-500 text-xs">{voice.gender}</div>
              </button>
            ))}
          </div>
          {selectedVoice && (
            <p className="text-sm text-gray-600">
              Selected: <span className="font-medium">{selectedVoice.name}</span> ({selectedVoice.gender})
            </p>
          )}
        </div>


        {/* Controls */}
        <div className="flex justify-center gap-2 mt-4">
          {!isPlaying ? (
            <Button
              onClick={speakText}
              disabled={isLoading || !text.trim()}
              size="lg"
              className="px-8 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg"
              style={{ 
                fontFamily: 'system-ui, -apple-system, sans-serif',
                minHeight: '48px',
                minWidth: '200px'
              }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Converting...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Speak Text
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopSpeaking}
              variant="destructive"
              size="lg"
              className="px-8"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop Speaking
            </Button>
          )}
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          onEnded={handleAudioEnd}
          style={{ display: 'none' }}
        />
    </div>
  );
}
