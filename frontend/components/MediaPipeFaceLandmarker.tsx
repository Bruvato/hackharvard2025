import React, { useEffect, useRef, useCallback, useState, memo } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  drawFaceConnectors,
  drawFaceLandmarks,
  FACE_CONNECTIONS,
  type Point,
} from "../lib/drawing-utils";

interface FaceResult {
  landmarks: Array<{ x: number; y: number; z?: number }>;
  score: number;
}

interface MediaPipeFaceLandmarkerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isActive: boolean;
  onResults?: (results: { landmarks: FaceResult[] }) => void;
}

const MediaPipeFaceLandmarker: React.FC<MediaPipeFaceLandmarkerProps> = memo(
  ({ videoRef, canvasRef, isActive, onResults }) => {
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const isInitializedRef = useRef(false);
    const animationFrameRef = useRef<number | undefined>(undefined);
    const lastVideoTimeRef = useRef<number>(-1);
    const runningModeRef = useRef<"IMAGE" | "VIDEO">("IMAGE");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize MediaPipe FaceLandmarker
    const initializeMediaPipe = useCallback(async () => {
      if (isInitializedRef.current) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("Initializing MediaPipe FaceLandmarker...");

        // Create the vision task fileset resolver
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );

        // Create the face landmarker
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
          vision,
          {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
              delegate: "GPU",
            },
            runningMode: runningModeRef.current,
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: false,
          }
        );

        // Try CPU delegate as fallback if GPU fails
        if (!faceLandmarkerRef.current) {
          console.warn("GPU delegate failed, falling back to CPU");
          faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "CPU",
              },
              runningMode: runningModeRef.current,
              numFaces: 1,
              outputFaceBlendshapes: false,
              outputFacialTransformationMatrixes: false,
            }
          );
        }

        console.log("MediaPipe FaceLandmarker initialized successfully");
        isInitializedRef.current = true;
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize MediaPipe FaceLandmarker:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize MediaPipe FaceLandmarker"
        );
        setIsLoading(false);
      }
    }, []);

    // Process frame for face landmarks
    const processFrame = useCallback(async () => {
      if (
        !isActive ||
        !videoRef.current ||
        !canvasRef.current ||
        !faceLandmarkerRef.current ||
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

      // Switch to video mode if needed
      if (runningModeRef.current === "IMAGE") {
        runningModeRef.current = "VIDEO";
        await faceLandmarkerRef.current.setOptions({
          runningMode: "VIDEO",
        });
      }

      // Detect face landmarks
      const startTimeMs = performance.now();
      let results;

      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);
      } else {
        return; // No new frame to process
      }

      // Clear canvas
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw results if landmarks are detected
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const faceResults: FaceResult[] = [];

        results.faceLandmarks.forEach((landmarks, faceIndex) => {
          // Use a default score of 1.0 for detected faces
          const score = 1.0;

          faceResults.push({
            landmarks: landmarks.map((landmark) => ({
              x: landmark.x,
              y: landmark.y,
              z: landmark.z || 0,
            })),
            score,
          });

          // Draw face connections and landmarks
          // MediaPipe landmarks are normalized (0-1), so multiply by canvas dimensions
          const canvasLandmarks = landmarks.map((landmark) => ({
            x: landmark.x * canvas.width,
            y: landmark.y * canvas.height,
          }));

          // Debug: Log first few landmark positions
          if (faceIndex === 0 && landmarks.length > 0) {
            console.log("First face landmark positions:", {
              original: { x: landmarks[0].x, y: landmarks[0].y },
              canvas: { x: canvasLandmarks[0].x, y: canvasLandmarks[0].y },
            });
          }

          // Draw face landmarks with enhanced visualization
          drawFaceLandmarks(ctx, canvasLandmarks, {
            color: "#00BFFF", // Deep sky blue for face landmarks
            lineWidth: 2,
            showLandmarkIds: false,
          });

          // Draw face connections
          drawFaceConnectors(ctx, canvasLandmarks, FACE_CONNECTIONS, {
            color: "#FFD700", // Gold for face connections
            lineWidth: 1,
          });
        });

        // Call onResults callback if provided
        if (onResults) {
          onResults({ landmarks: faceResults });
        }
      }

      ctx.restore();
    }, [isActive, videoRef, canvasRef, onResults]);

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
        faceLandmarkerRef.current = null;
      };
    }, []);

    // This component doesn't render anything visible - it just processes the video
    return null;
  }
);

MediaPipeFaceLandmarker.displayName = "MediaPipeFaceLandmarker";

export default MediaPipeFaceLandmarker;
