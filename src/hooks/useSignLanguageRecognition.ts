/**
 * Custom hook for sign language recognition
 * Manages real-time recognition state and API calls
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  signLanguageApi,
  RecognitionResult,
  GestureResult,
} from "../services/signLanguageApi";

export interface RecognitionState {
  isProcessing: boolean;
  isBackendAvailable: boolean;
  lastResult: RecognitionResult | null;
  error: string | null;
  processingCount: number;
}

export interface RecognitionConfig {
  processingInterval: number; // milliseconds between processing frames
  confidenceThreshold: number; // minimum confidence for gesture detection
  maxProcessingRate: number; // maximum processing rate per second
}

const DEFAULT_CONFIG: RecognitionConfig = {
  processingInterval: 1000, // Process every 1 second
  confidenceThreshold: 0.6, // 60% confidence threshold
  maxProcessingRate: 2, // Max 2 requests per second
};

export function useSignLanguageRecognition(
  config: Partial<RecognitionConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const [state, setState] = useState<RecognitionState>({
    isProcessing: false,
    isBackendAvailable: false,
    lastResult: null,
    error: null,
    processingCount: 0,
  });

  const processingRef = useRef<boolean>(false);
  const lastProcessTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check backend availability on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const isAvailable = await signLanguageApi.isBackendAvailable();
        setState((prev) => ({ ...prev, isBackendAvailable: isAvailable }));
      } catch (error) {
        console.error("Backend check failed:", error);
        setState((prev) => ({ ...prev, isBackendAvailable: false }));
      }
    };

    checkBackend();
  }, []);

  // Process a single frame
  const processFrame = useCallback(
    async (canvas: HTMLCanvasElement): Promise<RecognitionResult | null> => {
      if (processingRef.current) {
        return null; // Skip if already processing
      }

      const now = Date.now();
      const timeSinceLastProcess = now - lastProcessTimeRef.current;
      const minInterval = 1000 / finalConfig.maxProcessingRate;

      if (timeSinceLastProcess < minInterval) {
        return null; // Rate limiting
      }

      processingRef.current = true;
      lastProcessTimeRef.current = now;

      try {
        setState((prev) => ({
          ...prev,
          isProcessing: true,
          error: null,
          processingCount: prev.processingCount + 1,
        }));

        const response = await signLanguageApi.processVideoFrame(canvas);

        if (response.success && response.result) {
          // Filter gestures by confidence threshold
          const filteredGestures = response.result.gestures.filter(
            (gesture) => gesture.confidence >= finalConfig.confidenceThreshold
          );

          const filteredResult = {
            ...response.result,
            gestures: filteredGestures,
            confidence:
              filteredGestures.length > 0
                ? Math.max(...filteredGestures.map((g) => g.confidence))
                : 0,
          };

          setState((prev) => ({
            ...prev,
            lastResult: filteredResult,
            isProcessing: false,
          }));

          return filteredResult;
        } else {
          throw new Error(response.message || "Recognition failed");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isProcessing: false,
        }));
        return null;
      } finally {
        processingRef.current = false;
      }
    },
    [finalConfig.confidenceThreshold, finalConfig.maxProcessingRate]
  );

  // Start continuous processing
  const startProcessing = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      intervalRef.current = setInterval(async () => {
        await processFrame(canvas);
      }, finalConfig.processingInterval);
    },
    [processFrame, finalConfig.processingInterval]
  );

  // Stop continuous processing
  const stopProcessing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({ ...prev, isProcessing: false }));
  }, []);

  // Process single image file
  const processImageFile = useCallback(
    async (file: File): Promise<RecognitionResult | null> => {
      try {
        setState((prev) => ({ ...prev, isProcessing: true, error: null }));

        const response = await signLanguageApi.recognizeFromFile(file);

        if (response.success && response.result) {
          const filteredGestures = response.result.gestures.filter(
            (gesture) => gesture.confidence >= finalConfig.confidenceThreshold
          );

          const filteredResult = {
            ...response.result,
            gestures: filteredGestures,
            confidence:
              filteredGestures.length > 0
                ? Math.max(...filteredGestures.map((g) => g.confidence))
                : 0,
          };

          setState((prev) => ({
            ...prev,
            lastResult: filteredResult,
            isProcessing: false,
          }));

          return filteredResult;
        } else {
          throw new Error(response.message || "Recognition failed");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isProcessing: false,
        }));
        return null;
      }
    },
    [finalConfig.confidenceThreshold]
  );

  // Get detected gestures from last result
  const getDetectedGestures = useCallback((): GestureResult[] => {
    return state.lastResult?.gestures || [];
  }, [state.lastResult]);

  // Get highest confidence gesture
  const getBestGesture = useCallback((): GestureResult | null => {
    const gestures = getDetectedGestures();
    if (gestures.length === 0) return null;

    return gestures.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }, [getDetectedGestures]);

  // Clear last result
  const clearResult = useCallback(() => {
    setState((prev) => ({ ...prev, lastResult: null, error: null }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,

    // Actions
    processFrame,
    startProcessing,
    stopProcessing,
    processImageFile,
    clearResult,

    // Getters
    getDetectedGestures,
    getBestGesture,

    // Config
    config: finalConfig,
  };
}
