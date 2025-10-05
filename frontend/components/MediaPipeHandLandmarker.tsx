import React, { useEffect, useRef, useCallback, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  drawConnectors,
  drawLandmarks,
  drawEnhancedHandLandmarks,
  HAND_CONNECTIONS,
  type Point,
} from "../lib/drawing-utils";

interface HandResult {
  landmarks: Array<{ x: number; y: number; z?: number }>;
  handedness: "Left" | "Right";
  score: number;
}

interface MediaPipeHandLandmarkerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  onResults?: (results: { landmarks: HandResult[] }) => void;
  onPredictionRequest?: (
    results: { landmarks: HandResult[] },
    imageWidth: number,
    imageHeight: number
  ) => void;
}

const MediaPipeHandLandmarker: React.FC<MediaPipeHandLandmarkerProps> = ({
  videoRef,
  canvasRef,
  isActive,
  onResults,
  onPredictionRequest,
}) => {
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const isInitializedRef = useRef(false);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastVideoTimeRef = useRef<number>(-1);
  const runningModeRef = useRef<"IMAGE" | "VIDEO">("IMAGE");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize MediaPipe HandLandmarker
  const initializeMediaPipe = useCallback(async () => {
    if (isInitializedRef.current) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log("Initializing MediaPipe HandLandmarker...");

      // Create the vision task fileset resolver
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      // Create the hand landmarker
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU",
          },
          runningMode: runningModeRef.current,
          numHands: 2,
        }
      );

      // Try CPU delegate as fallback if GPU fails
      if (!handLandmarkerRef.current) {
        console.warn("GPU delegate failed, falling back to CPU");
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
              delegate: "CPU",
            },
            runningMode: runningModeRef.current,
            numHands: 2,
          }
        );
      }

      console.log("MediaPipe HandLandmarker initialized successfully");
      isInitializedRef.current = true;
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to initialize MediaPipe:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initialize MediaPipe"
      );
      setIsLoading(false);
    }
  }, []);

  // Process frame for hand landmarks
  const processFrame = useCallback(async () => {
    if (
      !isActive ||
      !videoRef.current ||
      !canvasRef.current ||
      !handLandmarkerRef.current ||
      !isInitializedRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Calculate the actual display size of the video (accounting for object-contain)
    const videoAspectRatio = video.videoWidth / video.videoHeight;
    const containerAspectRatio = video.clientWidth / video.clientHeight;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider than container - fit to width
      displayWidth = video.clientWidth;
      displayHeight = video.clientWidth / videoAspectRatio;
      offsetX = 0;
      offsetY = (video.clientHeight - displayHeight) / 2;
    } else {
      // Video is taller than container - fit to height
      displayWidth = video.clientHeight * videoAspectRatio;
      displayHeight = video.clientHeight;
      offsetX = (video.clientWidth - displayWidth) / 2;
      offsetY = 0;
    }

    // Set canvas size to match the actual video display area
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.style.left = `${offsetX}px`;
    canvas.style.top = `${offsetY}px`;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Debug: Log dimensions to help troubleshoot positioning
    console.log("Video dimensions:", {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      clientWidth: video.clientWidth,
      clientHeight: video.clientHeight,
      videoAspectRatio,
      containerAspectRatio,
      displayWidth,
      displayHeight,
      offsetX,
      offsetY,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      canvasStyleWidth: canvas.style.width,
      canvasStyleHeight: canvas.style.height,
    });

    // Switch to video mode if needed
    if (runningModeRef.current === "IMAGE") {
      runningModeRef.current = "VIDEO";
      await handLandmarkerRef.current.setOptions({
        runningMode: "VIDEO",
      });
    }

    // Detect hand landmarks
    const startTimeMs = performance.now();
    let results;

    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;
      results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);
    } else {
      return; // No new frame to process
    }

    // Clear canvas
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw results if landmarks are detected
    if (results.landmarks && results.landmarks.length > 0) {
      const handResults: HandResult[] = [];

      results.landmarks.forEach((landmarks, handIndex) => {
        // Get handedness information first
        let handedness = results.handednesses[handIndex][0].displayName as
          | "Left"
          | "Right";
        const score = results.handednesses[handIndex][0].score;

        // Correct hand label (MediaPipe labels are reversed when camera is not flipped)
        // This matches the backend logic exactly
        if (handedness === "Left") {
          handedness = "Right";
        } else if (handedness === "Right") {
          handedness = "Left";
        }

        handResults.push({
          landmarks: landmarks.map((landmark) => ({
            x: landmark.x,
            y: landmark.y,
            z: landmark.z || 0, // Include z coordinate for 3D processing
          })),
          handedness,
          score,
        });

        // Draw hand connections and landmarks
        // MediaPipe landmarks are normalized (0-1), so multiply by canvas dimensions
        const canvasLandmarks = landmarks.map((landmark) => ({
          x: landmark.x * canvas.width,
          y: landmark.y * canvas.height,
        }));

        // Debug: Log first few landmark positions
        if (handIndex === 0 && landmarks.length > 0) {
          console.log("First landmark positions:", {
            original: { x: landmarks[0].x, y: landmarks[0].y },
            canvas: { x: canvasLandmarks[0].x, y: canvasLandmarks[0].y },
            handedness,
          });
        }

        // Use enhanced drawing that matches backend visualization
        drawEnhancedHandLandmarks(ctx, canvasLandmarks, {
          color: handedness === "Left" ? "#00FF00" : "#FF0000",
          lineWidth: 3, // Slightly thicker for better visibility
          showLandmarkIds: false, // Set to true for debugging
          showFingerColors: true,
          handLabel: handedness,
        });
      });

      // Call onResults callback if provided
      if (onResults) {
        onResults({ landmarks: handResults });
      }

      // Call onPredictionRequest callback if provided
      if (onPredictionRequest) {
        onPredictionRequest(
          { landmarks: handResults },
          canvas.width,
          canvas.height
        );
      }
    }

    ctx.restore();
  }, [isActive, videoRef, canvasRef, onResults, onPredictionRequest]);

  // Start/stop processing loop
  useEffect(() => {
    if (isActive && isInitializedRef.current && !isLoading) {
      const animate = () => {
        processFrame();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, processFrame, isLoading]);

  // Initialize MediaPipe when component mounts
  useEffect(() => {
    initializeMediaPipe();
  }, [initializeMediaPipe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      isInitializedRef.current = false;
      handLandmarkerRef.current = null;
    };
  }, []);

  // This component doesn't render anything visible - it just processes the video
  return null;
};

export default MediaPipeHandLandmarker;
