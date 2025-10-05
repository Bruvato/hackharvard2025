/**
 * Sign Language Recognition API Service
 * Handles communication with the FastAPI backend
 */

const API_BASE_URL = "http://localhost:8000";

export interface GestureResult {
  gesture: string;
  confidence: number;
  translation: string;
}

export interface RecognitionResult {
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
  }>;
  gestures: GestureResult[];
  confidence: number;
  num_hands: number;
}

export interface ApiResponse {
  success: boolean;
  result: RecognitionResult;
  message: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface GesturesResponse {
  gestures: string[];
  translations: Record<string, string>;
}

class SignLanguageApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if the backend API is healthy
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Health check failed:", error);
      throw new Error("Backend API is not available");
    }
  }

  /**
   * Get list of supported gestures
   */
  async getSupportedGestures(): Promise<GesturesResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/gestures`);
      if (!response.ok) {
        throw new Error(`Failed to get gestures: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get supported gestures:", error);
      throw new Error("Failed to load supported gestures");
    }
  }

  /**
   * Recognize sign language from image file
   */
  async recognizeFromFile(file: File): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${this.baseUrl}/recognize`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Recognition failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("File recognition failed:", error);
      throw new Error("Failed to recognize sign language from image");
    }
  }

  /**
   * Recognize sign language from base64 encoded image
   */
  async recognizeFromBase64(imageData: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/recognize-base64`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error(`Recognition failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Base64 recognition failed:", error);
      throw new Error("Failed to recognize sign language from image data");
    }
  }

  /**
   * Recognize sign language from canvas element
   */
  async recognizeFromCanvas(canvas: HTMLCanvasElement): Promise<ApiResponse> {
    try {
      // Convert canvas to base64
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      const base64Data = imageData.split(",")[1]; // Remove data:image/jpeg;base64, prefix

      return await this.recognizeFromBase64(base64Data);
    } catch (error) {
      console.error("Canvas recognition failed:", error);
      throw new Error("Failed to recognize sign language from canvas");
    }
  }

  /**
   * Process video frame for real-time recognition
   */
  async processVideoFrame(canvas: HTMLCanvasElement): Promise<ApiResponse> {
    try {
      return await this.recognizeFromCanvas(canvas);
    } catch (error) {
      console.error("Video frame processing failed:", error);
      throw new Error("Failed to process video frame");
    }
  }

  /**
   * Batch process multiple images
   */
  async batchRecognize(files: File[]): Promise<{
    success: boolean;
    total_files: number;
    results: Array<{
      filename: string;
      success: boolean;
      result?: RecognitionResult;
      error?: string;
    }>;
  }> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${this.baseUrl}/batch-recognize`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Batch recognition failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Batch recognition failed:", error);
      throw new Error("Failed to process multiple images");
    }
  }

  /**
   * Convert image file to base64
   */
  static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64Data = result.split(",")[1]; // Remove data:image/jpeg;base64, prefix
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Capture frame from video element
   */
  static captureVideoFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  /**
   * Check if backend is available
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
export const signLanguageApi = new SignLanguageApiService();

// Export the class for custom instances
export default SignLanguageApiService;
