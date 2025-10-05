import { useState, useCallback, useRef, useEffect } from "react";

interface GestureResult {
  translation: string;
  confidence: number;
  gesture: string;
}

interface RecognitionResult {
  gestures: GestureResult[];
  processingTime: number;
  timestamp: Date;
}

interface UseSignLanguageRecognitionOptions {
  processingInterval?: number;
  confidenceThreshold?: number;
  maxProcessingRate?: number;
  backendUrl?: string;
}

interface UseSignLanguageRecognitionReturn {
  isProcessing: boolean;
  isBackendAvailable: boolean;
  lastResult: RecognitionResult | null;
  error: string | null;
  processFrame: (
    canvas: HTMLCanvasElement
  ) => Promise<RecognitionResult | null>;
  startProcessing: () => void;
  stopProcessing: () => void;
  getBestGesture: () => GestureResult | null;
  clearResult: () => void;
}

export function useSignLanguageRecognition(
  options: UseSignLanguageRecognitionOptions = {}
): UseSignLanguageRecognitionReturn {
  const {
    processingInterval = 2000,
    confidenceThreshold = 0.7,
    maxProcessingRate = 1,
    backendUrl = "http://localhost:8000",
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lastProcessTimeRef = useRef<number>(0);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check backend availability
  const checkBackendAvailability = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: "GET",
        timeout: 5000,
      } as RequestInit & { timeout: number });

      setIsBackendAvailable(response.ok);
      if (!response.ok) {
        setError("Backend server is not responding correctly");
      } else {
        setError(null);
      }
    } catch (err) {
      setIsBackendAvailable(false);
      setError("Backend server is offline or unreachable");
    }
  }, [backendUrl]);

  // Process a single frame
  const processFrame = useCallback(
    async (canvas: HTMLCanvasElement): Promise<RecognitionResult | null> => {
      if (!isBackendAvailable) {
        return null;
      }

      const now = Date.now();
      const timeSinceLastProcess = now - lastProcessTimeRef.current;
      const minInterval = 1000 / maxProcessingRate;

      if (timeSinceLastProcess < minInterval) {
        return null;
      }

      lastProcessTimeRef.current = now;

      try {
        setIsProcessing(true);
        setError(null);

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to convert canvas to blob"));
              }
            },
            "image/jpeg",
            0.8
          );
        });

        // Create form data
        const formData = new FormData();
        formData.append("image", blob, "frame.jpg");

        // Send request to backend
        const response = await fetch(`${backendUrl}/recognize`, {
          method: "POST",
          body: formData,
          timeout: 10000,
        } as RequestInit & { timeout: number });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: RecognitionResult = await response.json();

        // Filter results by confidence threshold
        const filteredGestures = result.gestures.filter(
          (gesture) => gesture.confidence >= confidenceThreshold
        );

        const filteredResult: RecognitionResult = {
          ...result,
          gestures: filteredGestures,
        };

        setLastResult(filteredResult);
        return filteredResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Recognition failed: ${errorMessage}`);
        console.error("Frame processing error:", err);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [isBackendAvailable, confidenceThreshold, maxProcessingRate, backendUrl]
  );

  // Start processing
  const startProcessing = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    const process = () => {
      checkBackendAvailability();
      processingTimeoutRef.current = setTimeout(process, processingInterval);
    };

    process();
  }, [checkBackendAvailability, processingInterval]);

  // Stop processing
  const stopProcessing = useCallback(() => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  }, []);

  // Get the best gesture from last result
  const getBestGesture = useCallback((): GestureResult | null => {
    if (!lastResult || lastResult.gestures.length === 0) {
      return null;
    }

    return lastResult.gestures.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }, [lastResult]);

  // Clear result
  const clearResult = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  // Check backend availability on mount and periodically
  useEffect(() => {
    checkBackendAvailability();
    const interval = setInterval(checkBackendAvailability, 10000); // Check every 10 seconds

    return () => {
      clearInterval(interval);
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [checkBackendAvailability]);

  return {
    isProcessing,
    isBackendAvailable,
    lastResult,
    error,
    processFrame,
    startProcessing,
    stopProcessing,
    getBestGesture,
    clearResult,
  };
}
