/**
 * Service for calling the ASL letter prediction endpoint
 */

export interface LandmarkData {
  landmark_id: number;
  landmark_name: string;
  x_raw: number;
  y_raw: number;
  z_raw: number;
  x_scaled: number;
  y_scaled: number;
  z_scaled: number;
}

export interface HandData {
  hand_index: number;
  hand_label: string;
  confidence: number;
  landmarks: LandmarkData[];
}

export interface LandmarkRequest {
  timestamp?: string;
  image_width: number;
  image_height: number;
  hands_detected: number;
  scaling_info?: {
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;
    scale_factor: number;
    offset_x: number;
    offset_y: number;
    target_size: number;
  };
  hands: HandData[];
}

export interface PredictionResponse {
  success: boolean;
  predicted_letter: string | null;
  confidence: number;
  distance: number;
  hand_label: string | null;
  message: string;
}

class PredictionService {
  private baseUrl: string;
  private isProcessing: boolean = false;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 500; // Minimum 500ms between requests

  constructor(baseUrl: string = "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }

  /**
   * Calculate edge-to-edge scaling parameters for landmarks (matches backend logic)
   */
  private calculateEdgeToEdgeScaling(
    landmarks: Array<{ x: number; y: number; z?: number }>,
    imageWidth: number,
    imageHeight: number
  ) {
    if (!landmarks || landmarks.length === 0) {
      return null;
    }

    // Extract all x and y coordinates
    const allXCoords: number[] = [];
    const allYCoords: number[] = [];

    landmarks.forEach((landmark) => {
      const x = landmark.x * imageWidth;
      const y = landmark.y * imageHeight;
      allXCoords.push(x);
      allYCoords.push(y);
    });

    if (allXCoords.length === 0 || allYCoords.length === 0) {
      return null;
    }

    // Calculate bounding box
    const minX = Math.min(...allXCoords);
    const maxX = Math.max(...allXCoords);
    const minY = Math.min(...allYCoords);
    const maxY = Math.max(...allYCoords);

    // Add padding (10% of the range)
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const paddingX = xRange * 0.1 || 10;
    const paddingY = yRange * 0.1 || 10;

    const paddedMinX = minX - paddingX;
    const paddedMaxX = maxX + paddingX;
    const paddedMinY = minY - paddingY;
    const paddedMaxY = maxY + paddingY;

    // Target coordinate system
    const targetSize = 2000;

    // Calculate scale factors
    const scaleX = targetSize / (paddedMaxX - paddedMinX) || 1;
    const scaleY = targetSize / (paddedMaxY - paddedMinY) || 1;

    // Use smaller scale factor to maintain aspect ratio
    const scaleFactor = Math.min(scaleX, scaleY);

    // Calculate centering offsets
    const scaledWidth = (paddedMaxX - paddedMinX) * scaleFactor;
    const scaledHeight = (paddedMaxY - paddedMinY) * scaleFactor;
    const offsetX = (targetSize - scaledWidth) / 2;
    const offsetY = (targetSize - scaledHeight) / 2;

    return {
      min_x: paddedMinX,
      max_x: paddedMaxX,
      min_y: paddedMinY,
      max_y: paddedMaxY,
      scale_factor: scaleFactor,
      offset_x: offsetX,
      offset_y: offsetY,
      target_size: targetSize,
    };
  }

  /**
   * Normalize hand rotation using wrist-to-index-tip angle (matches backend logic)
   */
  private normalizeHandRotation(landmarksData: LandmarkData[]): LandmarkData[] {
    // Find wrist (landmark 0) and index finger tip (landmark 8) positions
    const wristLandmark = landmarksData.find((l) => l.landmark_id === 0);
    const indexTipLandmark = landmarksData.find((l) => l.landmark_id === 8);

    if (!wristLandmark || !indexTipLandmark) {
      return landmarksData;
    }

    // Get scaled coordinates
    const wristX = wristLandmark.x_scaled;
    const wristY = wristLandmark.y_scaled;
    const indexX = indexTipLandmark.x_scaled;
    const indexY = indexTipLandmark.y_scaled;

    // Calculate rotation angle using the provided formula
    const dx = indexX - wristX;
    const dy = indexY - wristY;

    if (dx === 0 && dy === 0) {
      // Index finger tip is at wrist position, no rotation needed
      return landmarksData;
    }

    const rotationAngle = Math.atan2(dy, dx);
    const targetAngle = -Math.PI / 2; // vertical (up)
    const rotationToVertical = targetAngle - rotationAngle;

    // Apply rotation to all landmarks using wrist as origin
    const cosAngle = Math.cos(rotationToVertical);
    const sinAngle = Math.sin(rotationToVertical);

    return landmarksData.map((landmark) => {
      // Get coordinates relative to wrist
      const relX = landmark.x_scaled - wristX;
      const relY = landmark.y_scaled - wristY;

      // Apply rotation
      const rotatedX = relX * cosAngle - relY * sinAngle;
      const rotatedY = relX * sinAngle + relY * cosAngle;

      // Move the whole hand so wrist is at (1000, 2000)
      return {
        ...landmark,
        x_scaled: rotatedX + 1000,
        y_scaled: rotatedY + 2000,
      };
    });
  }

  /**
   * Convert MediaPipe landmarks to the format expected by the backend
   * Now includes the same scaling and rotation logic as the backend
   */
  private convertMediaPipeLandmarks(
    landmarks: Array<{ x: number; y: number; z?: number }>,
    handedness: string,
    confidence: number,
    handIndex: number,
    imageWidth: number,
    imageHeight: number
  ): HandData {
    const landmarkNames = [
      "WRIST",
      "THUMB_CMC",
      "THUMB_MCP",
      "THUMB_IP",
      "THUMB_TIP",
      "INDEX_FINGER_MCP",
      "INDEX_FINGER_PIP",
      "INDEX_FINGER_DIP",
      "INDEX_FINGER_TIP",
      "MIDDLE_FINGER_MCP",
      "MIDDLE_FINGER_PIP",
      "MIDDLE_FINGER_DIP",
      "MIDDLE_FINGER_TIP",
      "RING_FINGER_MCP",
      "RING_FINGER_PIP",
      "RING_FINGER_DIP",
      "RING_FINGER_TIP",
      "PINKY_MCP",
      "PINKY_PIP",
      "PINKY_DIP",
      "PINKY_TIP",
    ];

    // Calculate edge-to-edge scaling
    const scalingInfo = this.calculateEdgeToEdgeScaling(
      landmarks,
      imageWidth,
      imageHeight
    );

    const convertedLandmarks: LandmarkData[] = landmarks.map(
      (landmark, index) => {
        // Convert normalized coordinates to pixel coordinates
        const xRaw = landmark.x * imageWidth;
        const yRaw = landmark.y * imageHeight;
        const zRaw = (landmark.z || 0) * imageWidth; // MediaPipe uses z relative to wrist

        // Apply edge-to-edge scaling (matches backend logic)
        let xScaled: number;
        let yScaled: number;
        let zScaled: number;

        if (scalingInfo) {
          xScaled =
            (xRaw - scalingInfo.min_x) * scalingInfo.scale_factor +
            scalingInfo.offset_x;
          yScaled =
            (yRaw - scalingInfo.min_y) * scalingInfo.scale_factor +
            scalingInfo.offset_y;
          zScaled = zRaw * scalingInfo.scale_factor;
        } else {
          xScaled = xRaw;
          yScaled = yRaw;
          zScaled = zRaw;
        }

        // Validate and sanitize float values to prevent JSON serialization errors
        const sanitizeFloat = (value: number): number => {
          if (!isFinite(value) || isNaN(value)) {
            return 0.0;
          }
          // Clamp to reasonable range to prevent extremely large values
          return Math.max(-10000, Math.min(10000, value));
        };

        return {
          landmark_id: index,
          landmark_name: landmarkNames[index] || `LANDMARK_${index}`,
          x_raw: sanitizeFloat(xRaw),
          y_raw: sanitizeFloat(yRaw),
          z_raw: sanitizeFloat(zRaw),
          x_scaled: sanitizeFloat(xScaled),
          y_scaled: sanitizeFloat(yScaled),
          z_scaled: sanitizeFloat(zScaled),
        };
      }
    );

    // Apply rotation normalization (matches backend logic)
    const normalizedLandmarks = this.normalizeHandRotation(convertedLandmarks);

    // Validate and sanitize confidence value
    const sanitizeFloat = (value: number): number => {
      if (!isFinite(value) || isNaN(value)) {
        return 0.0;
      }
      return Math.max(0, Math.min(1, value)); // Clamp confidence to 0-1 range
    };

    return {
      hand_index: handIndex,
      hand_label: handedness,
      confidence: sanitizeFloat(confidence),
      landmarks: normalizedLandmarks,
    };
  }

  /**
   * Create scaling info for the landmarks (used in request payload)
   * Now uses the actual calculated scaling information
   */
  private createScalingInfo(
    landmarks: Array<{ x: number; y: number; z?: number }>,
    imageWidth: number,
    imageHeight: number
  ) {
    const scalingInfo = this.calculateEdgeToEdgeScaling(
      landmarks,
      imageWidth,
      imageHeight
    );

    if (!scalingInfo) {
      // Fallback to basic scaling if calculation fails
      const sanitizeFloat = (value: number): number => {
        if (!isFinite(value) || isNaN(value)) {
          return 0.0;
        }
        return Math.max(-10000, Math.min(10000, value));
      };

      return {
        min_x: 0,
        max_x: sanitizeFloat(imageWidth),
        min_y: 0,
        max_y: sanitizeFloat(imageHeight),
        scale_factor: 1.0,
        offset_x: 0,
        offset_y: 0,
        target_size: 2000,
      };
    }

    return scalingInfo;
  }

  /**
   * Predict ASL letter from MediaPipe hand landmarks
   */
  async predictLetter(
    landmarks: Array<{ x: number; y: number; z?: number }>,
    handedness: string,
    confidence: number,
    handIndex: number,
    imageWidth: number,
    imageHeight: number
  ): Promise<PredictionResponse | null> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastRequestTime < this.minRequestInterval) {
      return null;
    }

    if (this.isProcessing) {
      return null;
    }

    try {
      this.isProcessing = true;
      this.lastRequestTime = now;

      // Convert landmarks to backend format
      const handData = this.convertMediaPipeLandmarks(
        landmarks,
        handedness,
        confidence,
        handIndex,
        imageWidth,
        imageHeight
      );

      // Validate input parameters
      if (
        !isFinite(imageWidth) ||
        !isFinite(imageHeight) ||
        imageWidth <= 0 ||
        imageHeight <= 0
      ) {
        throw new Error(
          `Invalid image dimensions: ${imageWidth}x${imageHeight}`
        );
      }

      // Create request payload
      const request: LandmarkRequest = {
        timestamp: new Date().toISOString(),
        image_width: Math.round(imageWidth),
        image_height: Math.round(imageHeight),
        hands_detected: 1,
        scaling_info: this.createScalingInfo(
          landmarks,
          imageWidth,
          imageHeight
        ),
        hands: [handData],
      };

      // Log request data for debugging (remove in production)
      console.log("Sending prediction request:", {
        imageWidth,
        imageHeight,
        handsCount: request.hands.length,
        landmarksCount: request.hands[0]?.landmarks.length,
        firstLandmark: request.hands[0]?.landmarks[0],
      });

      // Make API call
      const response = await fetch(`${this.baseUrl}/predict-letter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`
        );
      }

      const result: PredictionResponse = await response.json();
      return result;
    } catch (error) {
      console.error("Error predicting letter:", error);
      return {
        success: false,
        predicted_letter: null,
        confidence: 0,
        distance: 0,
        hand_label: null,
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if the backend is available
   */
  async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        timeout: 5000,
      } as RequestInit);
      return response.ok;
    } catch (error) {
      console.error("Backend health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const predictionService = new PredictionService();
export default predictionService;
