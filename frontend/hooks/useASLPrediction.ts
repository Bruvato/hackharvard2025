import { useState, useCallback, useRef, useEffect } from "react";
import {
  predictionService,
  PredictionResponse,
} from "../lib/prediction-service";

interface HandResult {
  landmarks: Array<{ x: number; y: number; z?: number }>;
  handedness: "Left" | "Right";
  score: number;
}

interface UseASLPredictionOptions {
  processingInterval?: number; // ms between predictions
  confidenceThreshold?: number; // minimum confidence to show prediction
  maxProcessingRate?: number; // max requests per second
}

interface UseASLPredictionReturn {
  prediction: PredictionResponse | null;
  isProcessing: boolean;
  isBackendAvailable: boolean;
  error: string | null;
  processHandResults: (
    results: { landmarks: HandResult[] },
    imageWidth: number,
    imageHeight: number
  ) => void;
  clearPrediction: () => void;
  checkBackendHealth: () => Promise<void>;
}

export const useASLPrediction = (
  options: UseASLPredictionOptions = {}
): UseASLPredictionReturn => {
  const {
    processingInterval = 1000, // 1 second default
    confidenceThreshold = 0.5, // 50% confidence threshold
    maxProcessingRate = 2, // max 2 requests per second
  } = options;

  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastProcessTimeRef = useRef<number>(0);
  const requestCountRef = useRef<number>(0);
  const requestWindowRef = useRef<number>(Date.now());

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = useCallback(async () => {
    try {
      const isAvailable = await predictionService.checkBackendHealth();
      setIsBackendAvailable(isAvailable);
      if (!isAvailable) {
        setError("Backend server is not available");
      } else {
        setError(null);
      }
    } catch (err) {
      setIsBackendAvailable(false);
      setError("Failed to connect to backend server");
    }
  }, []);

  const processHandResults = useCallback(
    async (
      results: { landmarks: HandResult[] },
      imageWidth: number,
      imageHeight: number
    ) => {
      // Check if backend is available
      if (!isBackendAvailable) {
        return;
      }

      // Check if we have hand landmarks
      if (!results.landmarks || results.landmarks.length === 0) {
        return;
      }

      // Rate limiting
      const now = Date.now();

      // Reset request count if window has passed
      if (now - requestWindowRef.current >= 1000) {
        requestCountRef.current = 0;
        requestWindowRef.current = now;
      }

      // Check if we've exceeded the rate limit
      if (requestCountRef.current >= maxProcessingRate) {
        return;
      }

      // Check if enough time has passed since last processing
      if (now - lastProcessTimeRef.current < processingInterval) {
        return;
      }

      // Get the first hand (we'll focus on single hand for now)
      const hand = results.landmarks[0];

      // Check if hand confidence is above threshold
      if (hand.score < confidenceThreshold) {
        return;
      }

      try {
        setIsProcessing(true);
        setError(null);
        requestCountRef.current++;

        const result = await predictionService.predictLetter(
          hand.landmarks,
          hand.handedness,
          hand.score,
          0, // hand index
          imageWidth,
          imageHeight
        );

        if (result) {
          setPrediction(result);
          lastProcessTimeRef.current = now;
        }
      } catch (err) {
        console.error("Error processing hand results:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setIsProcessing(false);
      }
    },
    [
      isBackendAvailable,
      processingInterval,
      confidenceThreshold,
      maxProcessingRate,
    ]
  );

  const clearPrediction = useCallback(() => {
    setPrediction(null);
    setError(null);
  }, []);

  return {
    prediction,
    isProcessing,
    isBackendAvailable,
    error,
    processHandResults,
    clearPrediction,
    checkBackendHealth,
  };
};
