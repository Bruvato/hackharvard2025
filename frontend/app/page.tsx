"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Type,
  Settings,
  Play,
  Square,
  AlertCircle,
  CheckCircle,
  Volume2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Toaster } from "../components/ui/sonner";
import TextToSpeech from "../components/TextToSpeech";
import { useSignLanguageRecognition } from "../hooks/useSignLanguageRecognition";
import { useASLPrediction } from "../hooks/useASLPrediction";
import MediaPipeHandLandmarker from "../components/MediaPipeHandLandmarker";
import PredictionDisplay from "../components/PredictionDisplay";

interface TranslationEntry {
  id: string;
  text: string;
  confidence: number;
  timestamp: Date;
}

export default function App() {
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [showHandLandmarks, setShowHandLandmarks] = useState(true);
  const [cameraState, setCameraState] = useState<{
    isActive: boolean;
    hasPermission: boolean;
    error: string | null;
    isLoading: boolean;
  }>({
    isActive: false,
    hasPermission: false,
    error: null,
    isLoading: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  // Initialize sign language recognition hook (disabled - using new prediction system)
  const {
    isProcessing: isOldProcessing,
    isBackendAvailable: isOldBackendAvailable,
    lastResult,
    error: recognitionError,
    processFrame,
    startProcessing,
    stopProcessing,
    getBestGesture,
    clearResult,
  } = useSignLanguageRecognition({
    processingInterval: 2000, // Process every 2 seconds
    confidenceThreshold: 0.7, // 70% confidence threshold
    maxProcessingRate: 1, // Max 1 request per second
  });

  // Initialize ASL prediction hook
  const {
    prediction,
    isProcessing: isPredicting,
    isBackendAvailable: isPredictionBackendAvailable,
    error: predictionError,
    processHandResults,
    clearPrediction,
    checkBackendHealth: checkPredictionBackendHealth,
  } = useASLPrediction({
    processingInterval: 1000, // Process every 1 second
    confidenceThreshold: 0.6, // 60% confidence threshold
    maxProcessingRate: 2, // Max 2 requests per second
  });

  // Use new prediction system instead of old recognition
  const isProcessing = isPredicting;
  const isBackendAvailable = isPredictionBackendAvailable;

  // Simple camera initialization
  const initializeCamera = useCallback(async () => {
    if (cameraState.isActive || cameraState.isLoading) {
      return;
    }

    setCameraState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      // Get video element (should always be available now)
      const videoElement = videoRef.current;
      if (!videoElement) {
        throw new Error("Video element not found");
      }

      videoElement.srcObject = stream;

      // Force video to be visible
      videoElement.style.display = "block";
      videoElement.style.visibility = "visible";

      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          videoElement.removeEventListener("loadedmetadata", onLoadedMetadata);
          videoElement.removeEventListener("error", onError);
          resolve();
        };

        const onError = (e: Event) => {
          console.error("Video error:", e);
          videoElement.removeEventListener("loadedmetadata", onLoadedMetadata);
          videoElement.removeEventListener("error", onError);
          reject(new Error("Video failed to load"));
        };

        videoElement.addEventListener("loadedmetadata", onLoadedMetadata);
        videoElement.addEventListener("error", onError);

        // Start playing
        videoElement.play().catch(reject);

        // Timeout after 5 seconds
        setTimeout(() => {
          videoElement.removeEventListener("loadedmetadata", onLoadedMetadata);
          videoElement.removeEventListener("error", onError);
          reject(new Error("Video load timeout"));
        }, 5000);
      });

      // Wait for video to actually load before setting state
      let retryCount = 0;
      const maxRetries = 50; // 5 seconds max

      const checkVideoReady = () => {
        if (
          videoRef.current &&
          videoRef.current.videoWidth > 0 &&
          videoRef.current.videoHeight > 0
        ) {
          setCameraState({
            isActive: true,
            hasPermission: true,
            error: null,
            isLoading: false,
          });

          // Ensure video is visible after state update
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.style.display = "block";
              videoRef.current.style.visibility = "visible";
            }
          }, 100);

          // Automatically start recognition when camera is ready
          setIsRecording(true);
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkVideoReady, 100);
        } else {
          console.error("Video failed to load after maximum retries");
          setCameraState({
            isActive: false,
            hasPermission: false,
            error: "Camera video failed to load",
            isLoading: false,
          });
        }
      };

      checkVideoReady();
    } catch (error: any) {
      console.error("Camera initialization failed:", error);

      let errorMessage = "Failed to access camera";
      if (error.name === "NotAllowedError") {
        errorMessage =
          "Camera permission denied. Please allow camera access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage =
          "No camera found. Please connect a camera and try again.";
      } else if (error.name === "NotSupportedError") {
        errorMessage = "Camera not supported. Please use a modern browser.";
      } else if (error.name === "NotReadableError") {
        errorMessage = "Camera is in use by another application.";
      } else if (error.message.includes("Video element not found")) {
        errorMessage =
          "Video element not found. Please refresh the page and try again.";
      } else {
        errorMessage = `Camera error: ${error.message}`;
      }

      setCameraState({
        isActive: false,
        hasPermission: false,
        error: errorMessage,
        isLoading: false,
      });
    }
  }, [cameraState.isActive, cameraState.isLoading]);

  // Stop camera
  const stopCamera = useCallback(() => {
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    // Cancel any ongoing animation frames
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }

    // Reset states
    setCameraState({
      isActive: false,
      hasPermission: false,
      error: null,
      isLoading: false,
    });
    setIsRecording(false);
  }, []);

  // Process video frames for gesture recognition
  const processVideoFrame = useCallback(async () => {
    if (
      !videoRef.current ||
      !canvasRef.current ||
      !isRecording ||
      !isBackendAvailable
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Process frame with real API (disabled - using new prediction system)
    // The new prediction system handles frame processing via MediaPipeHandLandmarker
    // and sends landmark data directly to /predict-letter endpoint
    try {
      // Old recognition system disabled to avoid 422 errors
      // const result = await processFrame(canvas);
      // ... old processing logic removed
      console.log(
        "Old recognition system disabled - using new prediction system"
      );
    } catch (error) {
      console.error("Frame processing failed:", error);
    }
  }, [isRecording, isBackendAvailable]); // Removed old dependencies

  // Start/stop frame processing
  useEffect(() => {
    if (isRecording && cameraState.isActive && isBackendAvailable) {
      const process = () => {
        processVideoFrame();
        animationRef.current = requestAnimationFrame(process);
      };
      animationRef.current = requestAnimationFrame(process);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    isRecording,
    cameraState.isActive,
    isBackendAvailable,
    processVideoFrame,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!cameraState.isActive) {
      initializeCamera();
      return;
    }

    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);

    if (!newRecordingState) {
      // Stop recording - also stop the camera
      setCurrentText("");
      stopCamera();
      stopProcessing();
    } else {
      // Clear current text when starting new recording
      setCurrentText("");
      clearResult();
    }
  };

  const clearHistory = useCallback(() => {
    setTranslations([]);
    setCurrentText("");
  }, []);

  // Handle MediaPipe hand landmark results
  const handleHandResults = useCallback((results: any) => {
    // You can add additional processing here if needed
    // For now, we'll just log the results for debugging
    if (results.landmarks && results.landmarks.length > 0) {
      console.log("Hand landmarks detected:", results.landmarks.length);
      console.log("Hand results:", results);
    }
  }, []);

  return (
    <div
      className="min-h-screen rounded-3xl mx-4 my-4"
      style={{
        background:
          "linear-gradient(135deg, #fce7f3 0%, #f3e8ff 25%, #e0e7ff 50%, #f0f9ff 75%, #f0fdf4 100%)",
      }}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="mb-4">
            <p className="text-sm font-normal text-gray-600 tracking-wide">
              HACKHARVARD 2025
            </p>
          </div>
          <h1
            className="font-bold text-gray-900 mb-6 tracking-tight"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "4rem",
              lineHeight: "1.1",
              fontWeight: "700",
            }}
          >
            HandSpeak AI
          </h1>
          <p
            className="text-xl text-gray-700 font-medium mb-8"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            Instant Sign Language Recognition & Translation
          </p>
        </header>

        {/* Main Content */}
        <Tabs defaultValue="translator" className="space-y-6">
          <TabsList
            className="grid w-full grid-cols-3 max-w-md mx-auto bg-white border border-gray-200 rounded-lg p-2"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <TabsTrigger
              value="translator"
              className="flex items-center gap-3 rounded-md py-6 px-4 text-lg font-semibold"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              <Camera className="h-6 w-6" />
              Translator
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex items-center gap-3 rounded-md py-6 px-4 text-lg font-semibold"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              <Type className="h-6 w-6" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-3 rounded-md py-6 px-4 text-lg font-semibold"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              <Settings className="h-6 w-6" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Translator Tab */}
          <TabsContent value="translator" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6 lg:items-stretch">
              {/* Camera Section */}
              <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
                <CardHeader>
                  <CardTitle
                    className="flex items-center gap-2 text-xl font-semibold text-gray-900"
                    style={{
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    <Camera className="h-5 w-5" />
                    Camera Feed
                    {cameraState.isActive && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {isRecording && (
                      <Badge variant="destructive" className="animate-pulse">
                        Recording
                      </Badge>
                    )}
                    {isBackendAvailable ? (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800"
                      >
                        <Wifi className="h-3 w-3 mr-1" />
                        Backend Connected
                      </Badge>
                    ) : (
                      <Badge
                        variant="destructive"
                        className="bg-red-100 text-red-800"
                      >
                        <WifiOff className="h-3 w-3 mr-1" />
                        Backend Offline
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Camera Error */}
                    {cameraState.error && (
                      <Alert className="border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          {cameraState.error}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Backend Error */}
                    {recognitionError && (
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          Recognition Error: {recognitionError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Prediction Error */}
                    {predictionError && (
                      <Alert className="border-purple-200 bg-purple-50">
                        <AlertCircle className="h-4 w-4 text-purple-600" />
                        <AlertDescription className="text-purple-800">
                          Prediction Error: {predictionError}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Backend Offline Warning */}
                    {!isBackendAvailable && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <WifiOff className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          Backend server is offline. Please start the backend
                          server to enable sign language recognition.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Camera Feed */}
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-gray-600">
                      {/* Always render video element for ref access */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                        style={{
                          display: cameraState.isActive ? "block" : "none",
                        }}
                      />
                      <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 pointer-events-none"
                        style={{
                          display:
                            showHandLandmarks && cameraState.isActive
                              ? "block"
                              : "none",
                          zIndex: 10,
                          width: "100%",
                          height: "100%",
                        }}
                      />

                      {/* Loading overlay */}
                      {cameraState.isLoading && (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-white bg-black bg-opacity-90">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                            <p
                              className="text-sm font-medium"
                              style={{
                                fontFamily:
                                  "system-ui, -apple-system, sans-serif",
                              }}
                            >
                              Initializing camera...
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Placeholder when camera not active */}
                      {!cameraState.isActive && !cameraState.isLoading && (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <div className="text-center">
                            <Camera className="h-16 w-16 mx-auto mb-4 opacity-60 text-white" />
                            <h3
                              className="text-xl mb-2 font-semibold text-white"
                              style={{
                                fontFamily:
                                  "system-ui, -apple-system, sans-serif",
                              }}
                            >
                              Camera Ready
                            </h3>
                            <p
                              className="text-sm opacity-80 text-gray-300"
                              style={{
                                fontFamily:
                                  "system-ui, -apple-system, sans-serif",
                              }}
                            >
                              Click "Start Recognition" to activate camera
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* MediaPipe Hand Landmarker */}
                    <MediaPipeHandLandmarker
                      videoRef={videoRef}
                      canvasRef={canvasRef}
                      isActive={cameraState.isActive && showHandLandmarks}
                      onResults={handleHandResults}
                      onPredictionRequest={processHandResults}
                    />

                    {/* Controls */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-center">
                        <Button
                          onClick={toggleRecording}
                          size="lg"
                          disabled={cameraState.isLoading}
                          variant={isRecording ? "destructive" : "default"}
                          className={`px-8 font-medium rounded-lg ${
                            isRecording
                              ? "bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 shadow-lg"
                              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-lg"
                          }`}
                          style={{
                            fontFamily: "system-ui, -apple-system, sans-serif",
                            minHeight: "48px",
                            minWidth: "200px",
                            color: isRecording ? "white" : "black",
                            backgroundColor: isRecording ? "#dc2626" : "white",
                            borderColor: isRecording ? "#dc2626" : "#d1d5db",
                            zIndex: 10,
                            position: "relative",
                          }}
                        >
                          {isRecording ? (
                            <>
                              <Square className="h-5 w-5 mr-2" />
                              Stop Recognition
                            </>
                          ) : (
                            <>
                              <Play className="h-5 w-5 mr-2" />
                              Start Recognition
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Hand Landmarks Toggle */}
                      {cameraState.isActive && (
                        <div className="flex justify-center">
                          <Button
                            onClick={() =>
                              setShowHandLandmarks(!showHandLandmarks)
                            }
                            size="sm"
                            variant="outline"
                            className="px-4 py-2 text-sm"
                          >
                            {showHandLandmarks ? "Hide" : "Show"} Hand Landmarks
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-center text-sm text-gray-600">
                      {cameraState.isLoading ? (
                        <p
                          style={{
                            fontFamily: "system-ui, -apple-system, sans-serif",
                          }}
                        >
                          Initializing camera...
                        </p>
                      ) : isRecording ? (
                        <p
                          className="flex items-center justify-center gap-2"
                          style={{
                            fontFamily: "system-ui, -apple-system, sans-serif",
                          }}
                        >
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                          {isBackendAvailable
                            ? "Processing ASL letter predictions..."
                            : "Camera active, but backend offline"}
                        </p>
                      ) : cameraState.isActive ? (
                        <p
                          style={{
                            fontFamily: "system-ui, -apple-system, sans-serif",
                          }}
                        >
                          Camera ready.{" "}
                          {isBackendAvailable
                            ? 'Click "Start Recognition" to begin ASL letter prediction.'
                            : "Backend offline - start backend server first."}
                        </p>
                      ) : (
                        <p
                          style={{
                            fontFamily: "system-ui, -apple-system, sans-serif",
                          }}
                        >
                          Click "Start Recognition" to activate camera and begin
                          ASL letter prediction.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ASL Letter Prediction */}
              <PredictionDisplay
                prediction={prediction}
                isProcessing={isPredicting}
                isBackendAvailable={isPredictionBackendAvailable}
                className="mb-4"
              />

              {/* Translation Output */}
              <div className="space-y-4 h-full flex flex-col">
                {/* Current Translation */}
                <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
                  <CardHeader>
                    <CardTitle
                      className="flex items-center gap-2 text-xl font-semibold text-gray-900"
                      style={{
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      <Type className="h-5 w-5" />
                      Current Translation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[120px] p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {currentText ? (
                        <div className="space-y-2">
                          <p
                            className="text-lg text-gray-900 leading-relaxed font-medium"
                            style={{
                              fontFamily:
                                "system-ui, -apple-system, sans-serif",
                            }}
                          >
                            {currentText}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigator.clipboard.writeText(currentText)
                            }
                          >
                            Copy Text
                          </Button>
                        </div>
                      ) : (
                        <p
                          className="text-gray-500 italic text-center py-4 font-medium"
                          style={{
                            fontFamily: "system-ui, -apple-system, sans-serif",
                          }}
                        >
                          Start recognition to see translations appear here...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Text-to-Speech Section */}
                <Card className="bg-white border border-gray-200 shadow-sm rounded-lg flex-1">
                  <CardHeader>
                    <CardTitle
                      className="flex items-center gap-2 text-xl font-semibold text-gray-900"
                      style={{
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      <Volume2 className="h-5 w-5" />
                      Text-to-Speech
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TextToSpeech text={currentText} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Translation History - Full Width at Bottom */}
            <div className="mt-6">
              <Card className="bg-white border border-gray-200 shadow-sm rounded-lg">
                <CardHeader>
                  <CardTitle
                    className="flex items-center justify-between text-xl font-semibold text-gray-900"
                    style={{
                      fontFamily: "system-ui, -apple-system, sans-serif",
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      Translation History ({translations.length})
                    </span>
                    {translations.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearHistory}
                      >
                        Clear
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {translations.slice(0, 10).map((translation) => (
                      <div
                        key={translation.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-medium text-gray-900"
                            style={{
                              fontFamily:
                                "system-ui, -apple-system, sans-serif",
                            }}
                          >
                            {translation.text}
                          </span>
                          <Badge variant="outline">
                            {Math.round(translation.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {translation.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                    {translations.length === 0 && (
                      <p
                        className="text-gray-500 italic text-center py-4 font-medium"
                        style={{
                          fontFamily: "system-ui, -apple-system, sans-serif",
                        }}
                      >
                        No translations yet. Start recognition to see results.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Translation History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {translations.map((translation) => (
                    <div
                      key={translation.id}
                      className="p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium">
                          {translation.text}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {Math.round(translation.confidence * 100)}%
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {translation.timestamp.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {translations.length === 0 && (
                    <p className="text-gray-500 italic text-center py-8">
                      No translation history yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="mb-2">Sign Language Translator Settings:</p>
                  <ul className="space-y-1 text-xs text-gray-500">
                    <li>• Camera resolution: 1280x720 (adjustable)</li>
                    <li>• Processing delay: ~50ms per frame</li>
                    <li>• Memory usage: Optimized for real-time processing</li>
                    <li>
                      • Browser compatibility: Chrome, Firefox, Safari, Edge
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Toaster />
    </div>
  );
}
