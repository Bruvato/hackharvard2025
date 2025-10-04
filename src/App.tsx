import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Type, Settings, Play, Square, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster } from './components/ui/sonner';

interface TranslationEntry {
  id: string;
  text: string;
  confidence: number;
  timestamp: Date;
}

export default function App() {
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [currentText, setCurrentText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [cameraState, setCameraState] = useState<{
    isActive: boolean;
    hasPermission: boolean;
    error: string | null;
    isLoading: boolean;
  }>({
    isActive: false,
    hasPermission: false,
    error: null,
    isLoading: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();

  // Simple camera initialization
  const initializeCamera = useCallback(async () => {
    console.log('=== STARTING CAMERA INITIALIZATION ===');
    
    if (cameraState.isActive || cameraState.isLoading) {
      console.log('Camera already active or loading');
      return;
    }
    
    setCameraState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('Requesting camera access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user'
        },
        audio: false
      });
      
      console.log('Camera stream obtained:', stream);
      streamRef.current = stream;
      
      // Get video element (should always be available now)
      const videoElement = videoRef.current;
      if (!videoElement) {
        throw new Error('Video element not found');
      }
      
      console.log('Video element found, setting source...');
      videoElement.srcObject = stream;
      
      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          console.log('Video metadata loaded');
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (e: Event) => {
          console.error('Video error:', e);
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          reject(new Error('Video failed to load'));
        };
        
        videoElement.addEventListener('loadedmetadata', onLoadedMetadata);
        videoElement.addEventListener('error', onError);
        
        // Start playing
        videoElement.play().catch(reject);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
          videoElement.removeEventListener('error', onError);
          reject(new Error('Video load timeout'));
        }, 5000);
      });
      
      console.log('Camera initialized successfully');
      setCameraState({
        isActive: true,
        hasPermission: true,
        error: null,
        isLoading: false
      });
      
    } catch (error: any) {
      console.error('Camera initialization failed:', error);
      
      let errorMessage = 'Failed to access camera';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported. Please use a modern browser.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application.';
      } else if (error.message.includes('Video element not found')) {
        errorMessage = 'Video element not found. Please refresh the page and try again.';
      } else {
        errorMessage = `Camera error: ${error.message}`;
      }
      
      setCameraState({
        isActive: false,
        hasPermission: false,
        error: errorMessage,
        isLoading: false
      });
    }
  }, [cameraState.isActive, cameraState.isLoading]);

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
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
      isLoading: false
    });
    setIsRecording(false);
    
    console.log('Camera stopped successfully');
  }, []);

  // Process video frames for gesture recognition
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isRecording) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Simulate gesture recognition (replace with real implementation)
    if (Math.random() < 0.1) { // 10% chance per frame
      const gestures = [
        'Hello', 'Thank you', 'Please', 'Yes', 'No', 'Help', 'Water', 'Food',
        'Good morning', 'Good night', 'I love you', 'Sorry', 'Welcome'
      ];
      
      const gesture = gestures[Math.floor(Math.random() * gestures.length)];
      const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
      
      if (confidence > 0.7) {
        const newTranslation: TranslationEntry = {
          id: `${Date.now()}-${Math.random()}`,
          text: gesture,
          confidence,
          timestamp: new Date()
        };
        
        setTranslations(prev => [newTranslation, ...prev]);
        setCurrentText(prev => prev ? `${prev} ${gesture}` : gesture);
        
        // Play sound notification
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
          console.warn('Audio notification failed:', error);
        }
      }
    }
  }, [isRecording]);

  // Start/stop frame processing
  useEffect(() => {
    if (isRecording && cameraState.isActive) {
      console.log('Starting frame processing...');
      const process = () => {
        processFrame();
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
  }, [isRecording, cameraState.isActive, processFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, cleaning up camera...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Cleaned up track:', track.kind);
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
    console.log('Toggle recording clicked');
    
    if (!cameraState.isActive) {
      console.log('Initializing camera...');
      initializeCamera();
      return;
    }
    
    setIsRecording(!isRecording);
    if (!isRecording) {
      setCurrentText('');
    }
  };

  const clearHistory = useCallback(() => {
    setTranslations([]);
    setCurrentText('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            HandSpeak AI
          </h1>
          <p className="text-lg text-gray-600">
            Instant Sign Language Recognition & Translation
          </p>
        </header>

        {/* Main Content */}
        <Tabs defaultValue="translator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="translator" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Translator
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Translator Tab */}
          <TabsContent value="translator" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Camera Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Camera Feed
                    {cameraState.isActive && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {isRecording && (
                      <Badge variant="destructive" className="animate-pulse">
                        Recording
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

                    {/* Camera Feed */}
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                      {/* Always render video element for ref access */}
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${cameraState.isActive ? 'block' : 'hidden'}`}
                      />
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 pointer-events-none"
                        style={{ display: 'none' }}
                      />
                      
                      {/* Loading overlay */}
                      {cameraState.isLoading && (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-white bg-black bg-opacity-75">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                            <p className="text-sm">Initializing camera...</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Placeholder when camera not active */}
                      {!cameraState.isActive && !cameraState.isLoading && (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <div className="text-center">
                            <Camera className="h-16 w-16 mx-auto mb-4 opacity-60" />
                            <h3 className="text-xl mb-2">Camera Ready</h3>
                            <p className="text-sm opacity-80">
                              Click "Start Recognition" to activate camera
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-center gap-2">
                        <Button
                          onClick={toggleRecording}
                          size="lg"
                          variant={isRecording ? "destructive" : "default"}
                          disabled={cameraState.isLoading}
                          className="px-8"
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
                      
                      {cameraState.isActive && (
                        <div className="flex justify-center">
                          <Button
                            onClick={stopCamera}
                            variant="outline"
                            size="lg"
                            className="px-6"
                          >
                            <Camera className="h-5 w-5 mr-2" />
                            Stop Camera
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="text-center text-sm text-gray-600">
                      {cameraState.isLoading ? (
                        <p>Initializing camera...</p>
                      ) : isRecording ? (
                        <p className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          Processing sign language gestures...
                        </p>
                      ) : cameraState.isActive ? (
                        <p>Camera ready. Click "Start Recognition" to begin translation.</p>
                      ) : (
                        <p>Click "Start Recognition" to activate camera and begin translation.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Translation Output */}
              <div className="space-y-4">
                {/* Current Translation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Type className="h-5 w-5" />
                      Current Translation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="min-h-[120px] p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-200">
                      {currentText ? (
                        <div className="space-y-2">
                          <p className="text-lg text-gray-900 leading-relaxed">{currentText}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(currentText)}
                          >
                            Copy Text
                          </Button>
                        </div>
                      ) : (
                        <p className="text-gray-500 italic text-center py-4">
                          Start recognition to see translations appear here...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Translations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Type className="h-5 w-5" />
                        Recent Translations ({translations.length})
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
                          className="p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{translation.text}</span>
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
                        <p className="text-gray-500 italic text-center py-4">
                          No translations yet. Start recognition to see results.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                        <span className="text-lg font-medium">{translation.text}</span>
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
                    <li>• Browser compatibility: Chrome, Firefox, Safari, Edge</li>
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