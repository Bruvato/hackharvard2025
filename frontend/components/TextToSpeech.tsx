import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Volume2, VolumeX, Play, Square } from "lucide-react";

interface TextToSpeechProps {
  text: string;
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({
  text,
  voice,
  rate = 1,
  pitch = 1,
  volume = 1,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(voice || null);
  const [isSupported, setIsSupported] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check if speech synthesis is supported
  useEffect(() => {
    setIsSupported("speechSynthesis" in window);
  }, []);

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);

      // Set default voice if none selected
      if (!selectedVoice && voices.length > 0) {
        // Prefer English voices
        const englishVoice = voices.find(
          (voice) => voice.lang.startsWith("en") || voice.lang === "en-US"
        );
        setSelectedVoice(englishVoice || voices[0]);
      }
    };

    loadVoices();

    // Some browsers load voices asynchronously
    speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, [isSupported, selectedVoice]);

  // Create speech utterance
  const createUtterance = useCallback(() => {
    if (!text || !isSupported) return null;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setIsPlaying(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    return utterance;
  }, [text, selectedVoice, rate, pitch, volume, isSupported]);

  // Play/pause speech
  const toggleSpeech = () => {
    if (!isSupported) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (isPlaying && !isPaused) {
      // Pause
      speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPaused) {
      // Resume
      speechSynthesis.resume();
      setIsPaused(false);
    } else {
      // Start new speech
      speechSynthesis.cancel(); // Cancel any existing speech

      const utterance = createUtterance();
      if (utterance) {
        utteranceRef.current = utterance;
        speechSynthesis.speak(utterance);
      }
    }
  };

  // Stop speech
  const stopSpeech = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    utteranceRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  if (!isSupported) {
    return (
      <div className="text-center p-4 text-gray-500">
        <VolumeX className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Speech synthesis not supported</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Text Display */}
      <div className="min-h-[80px] p-4 bg-gray-50 rounded-lg border border-gray-200">
        {text ? (
          <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
        ) : (
          <p className="text-gray-500 italic text-center py-4 text-sm">
            No text to speak
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {/* Play/Stop Buttons */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={toggleSpeech}
            disabled={!text}
            variant={isPlaying ? "secondary" : "default"}
            size="sm"
            className="flex items-center gap-2"
          >
            {isPlaying ? (
              isPaused ? (
                <>
                  <Play className="h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" />
                  Pause
                </>
              )
            ) : (
              <>
                <Volume2 className="h-4 w-4" />
                Speak
              </>
            )}
          </Button>

          {isPlaying && (
            <Button
              onClick={stopSpeech}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        {/* Voice Selection */}
        {availableVoices.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Voice:</label>
            <select
              value={selectedVoice?.name || ""}
              onChange={(e) => {
                const voice = availableVoices.find(
                  (v) => v.name === e.target.value
                );
                setSelectedVoice(voice || null);
              }}
              className="w-full p-2 text-xs border border-gray-300 rounded-md bg-white"
              disabled={isPlaying}
            >
              {availableVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status */}
        <div className="text-center text-xs text-gray-500">
          {isPlaying && (
            <p className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              {isPaused ? "Paused" : "Speaking..."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;
