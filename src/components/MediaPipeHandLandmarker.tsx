import React, { useRef, useEffect, useCallback, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

interface MediaPipeHandLandmarkerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  onResults?: (results: any) => void;
}

// Hand connections for drawing skeleton - matching MediaPipe example
const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
  [0, 17], // Palm
];

// Drawing functions matching MediaPipe example exactly
const drawConnectors = (
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  connections: number[][],
  style: { color: string; lineWidth: number }
) => {
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.lineWidth;
  ctx.beginPath();

  connections.forEach(([start, end]) => {
    const startPoint = landmarks[start];
    const endPoint = landmarks[end];

    ctx.moveTo(
      startPoint.x * ctx.canvas.width,
      startPoint.y * ctx.canvas.height
    );
    ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
  });

  ctx.stroke();
};

const drawLandmarks = (
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  style: { color: string; lineWidth: number }
) => {
  ctx.fillStyle = style.color;
  ctx.lineWidth = style.lineWidth;

  landmarks.forEach((landmark) => {
    const x = landmark.x * ctx.canvas.width;
    const y = landmark.y * ctx.canvas.height;

    ctx.beginPath();
    ctx.arc(x, y, style.lineWidth, 0, 2 * Math.PI);
    ctx.fill();
  });
};

export const MediaPipeHandLandmarker: React.FC<
  MediaPipeHandLandmarkerProps
> = ({ videoRef, canvasRef, isActive, onResults }) => {
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastVideoTimeRef = useRef<number>(-1);

  // Initialize MediaPipe HandLandmarker
  const initializeHandLandmarker = useCallback(async () => {
    if (handLandmarkerRef.current || isLoading) return;

    setIsLoading(true);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      handLandmarkerRef.current = await HandLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU", // Use GPU for better performance like the example
          },
          runningMode: "VIDEO",
          numHands: 2,
        }
      );

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize HandLandmarker:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Process video frame and draw landmarks - optimized like the example
  const processFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !canvas || !handLandmarker || !isInitialized) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match video dimensions like the example
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Process frame
    const startTimeMs = performance.now();
    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;

      try {
        const results = handLandmarker.detectForVideo(video, startTimeMs);

        // Clear canvas and draw landmarks
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.landmarks) {
          for (const landmarks of results.landmarks) {
            // Draw connections - exact colors from example
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
              color: "#00FF00", // Green connections like in example
              lineWidth: 5,
            });

            // Draw landmarks - exact colors from example
            drawLandmarks(ctx, landmarks, {
              color: "#FF0000", // Red landmarks like in example
              lineWidth: 2,
            });
          }
        }
        ctx.restore();

        // Call onResults callback
        if (onResults) {
          onResults(results);
        }
      } catch (error) {
        console.error("Error processing frame:", error);
      }
    }
  }, [videoRef, canvasRef, isInitialized, onResults]);

  // Animation loop - optimized like the example
  const animate = useCallback(() => {
    if (isActive && isInitialized) {
      processFrame();
      requestAnimationFrame(animate);
    }
  }, [isActive, isInitialized, processFrame]);

  // Initialize when component mounts
  useEffect(() => {
    initializeHandLandmarker();
  }, [initializeHandLandmarker]);

  // Start/stop animation loop
  useEffect(() => {
    if (isActive && isInitialized) {
      animate();
    }
  }, [isActive, isInitialized, animate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  return null; // This component doesn't render anything directly
};

export default MediaPipeHandLandmarker;
