import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react";
import { getElevenLabsTTS } from "../lib/elevenlabs-tts";
import { toast } from "sonner";

interface ElevenLabsTextToSpeechProps {
  text: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?:
    | "default"
    | "outline"
    | "secondary"
    | "destructive"
    | "ghost"
    | "link";
}

const ElevenLabsTextToSpeech: React.FC<ElevenLabsTextToSpeechProps> = ({
  text,
  className = "",
  size = "sm",
  variant = "outline",
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSpeak = useCallback(async () => {
    if (!text || text.trim().length === 0) {
      toast.error("No text to speak");
      return;
    }

    if (isPlaying) {
      // If already playing, we could implement stop functionality here
      // For now, just show a message
      toast.info("Audio is already playing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const elevenLabs = getElevenLabsTTS();
      setIsPlaying(true);

      await elevenLabs.speak(text);

      toast.success("Text spoken successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to speak text";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("ElevenLabs TTS error:", error);
    } finally {
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [text, isPlaying]);

  // Check if ElevenLabs API key is configured
  const isConfigured = !!process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;

  if (!isConfigured) {
    return (
      <Button
        disabled
        size={size}
        variant={variant}
        className={`flex items-center gap-2 border border-gray-300 bg-gray-100 text-gray-500 ${className}`}
        title="ElevenLabs API key not configured"
      >
        <AlertCircle className="h-4 w-4" />
        <span className="hidden sm:inline">TTS</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={handleSpeak}
      disabled={!text || text.trim().length === 0 || isLoading}
      size={size}
      variant={variant}
      className={`flex items-center gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 ${className}`}
      title={error ? error : "Speak text using ElevenLabs"}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="hidden sm:inline">Speaking...</span>
        </>
      ) : isPlaying ? (
        <>
          <VolumeX className="h-4 w-4" />
          <span className="hidden sm:inline">Playing</span>
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4" />
          <span className="hidden sm:inline">Speak</span>
        </>
      )}
    </Button>
  );
};

export default ElevenLabsTextToSpeech;
