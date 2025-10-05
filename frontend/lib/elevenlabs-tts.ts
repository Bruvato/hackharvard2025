interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  modelId?: string;
  voiceSettings?: {
    stability: number;
    similarityBoost: number;
    style?: number;
    useSpeakerBoost?: boolean;
  };
}

interface ElevenLabsResponse {
  audio: ArrayBuffer;
  error?: string;
}

class ElevenLabsTTS {
  private config: ElevenLabsConfig;
  private defaultVoiceId = "21m00Tcm4TlvDq8ikWAM"; // Default voice ID (Rachel)
  private defaultModelId = "eleven_monolingual_v1";

  constructor(config: ElevenLabsConfig) {
    this.config = {
      voiceId: this.defaultVoiceId,
      modelId: this.defaultModelId,
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.5,
        style: 0.0,
        useSpeakerBoost: true,
      },
      ...config,
    };
  }

  async synthesize(text: string): Promise<ElevenLabsResponse> {
    if (!this.config.apiKey) {
      return {
        audio: new ArrayBuffer(0),
        error: "ElevenLabs API key not configured",
      };
    }

    if (!text || text.trim().length === 0) {
      return {
        audio: new ArrayBuffer(0),
        error: "No text provided for synthesis",
      };
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.config.voiceId}`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": this.config.apiKey,
          },
          body: JSON.stringify({
            text: text.trim(),
            model_id: this.config.modelId,
            voice_settings: this.config.voiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          audio: new ArrayBuffer(0),
          error: `ElevenLabs API error: ${response.status} - ${
            errorData.detail || response.statusText
          }`,
        };
      }

      const audioBuffer = await response.arrayBuffer();
      return { audio: audioBuffer };
    } catch (error) {
      console.error("ElevenLabs TTS error:", error);
      return {
        audio: new ArrayBuffer(0),
        error: `Network error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const audioBufferSource = audioContext.createBufferSource();
      const decodedAudioBuffer = await audioContext.decodeAudioData(
        audioBuffer
      );

      audioBufferSource.buffer = decodedAudioBuffer;
      audioBufferSource.connect(audioContext.destination);
      audioBufferSource.start();
    } catch (error) {
      console.error("Audio playback error:", error);
      throw new Error(
        `Failed to play audio: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async speak(text: string): Promise<void> {
    const result = await this.synthesize(text);
    if (result.error) {
      throw new Error(result.error);
    }
    await this.playAudio(result.audio);
  }

  // Get available voices (requires API key)
  async getVoices(): Promise<any[]> {
    if (!this.config.apiKey) {
      return [];
    }

    try {
      const response = await fetch("https://api.elevenlabs.io/v1/voices", {
        headers: {
          "xi-api-key": this.config.apiKey,
        },
      });

      if (!response.ok) {
        console.error("Failed to fetch voices:", response.statusText);
        return [];
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error("Error fetching voices:", error);
      return [];
    }
  }
}

// Create a singleton instance
let elevenLabsInstance: ElevenLabsTTS | null = null;

export const getElevenLabsTTS = (): ElevenLabsTTS => {
  if (!elevenLabsInstance) {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || "";
    elevenLabsInstance = new ElevenLabsTTS({ apiKey });
  }
  return elevenLabsInstance;
};

export default ElevenLabsTTS;
