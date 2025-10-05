// Drawing utilities for MediaPipe hand landmarks
// Based on MediaPipe's drawing utilities and backend visualization logic

export interface Point {
  x: number;
  y: number;
}

export interface DrawingOptions {
  color: string;
  lineWidth: number;
}

export interface EnhancedDrawingOptions extends DrawingOptions {
  showLandmarkIds?: boolean;
  showFingerColors?: boolean;
  handLabel?: "Left" | "Right";
}

// Finger-specific colors (matches backend logic)
export const FINGER_COLORS = {
  THUMB: "#FF6B6B", // Red
  INDEX_FINGER: "#4ECDC4", // Teal
  MIDDLE_FINGER: "#45B7D1", // Blue
  RING_FINGER: "#96CEB4", // Green
  PINKY: "#FFEAA7", // Yellow
  WRIST: "#DDA0DD", // Plum
};

// Finger-specific connections (matches backend logic)
export const FINGER_CONNECTIONS = {
  THUMB: [0, 1, 2, 3, 4], // WRIST -> THUMB_CMC -> THUMB_MCP -> THUMB_IP -> THUMB_TIP
  INDEX_FINGER: [0, 5, 6, 7, 8], // WRIST -> INDEX_MCP -> INDEX_PIP -> INDEX_DIP -> INDEX_TIP
  MIDDLE_FINGER: [0, 9, 10, 11, 12], // WRIST -> MIDDLE_MCP -> MIDDLE_PIP -> MIDDLE_DIP -> MIDDLE_TIP
  RING_FINGER: [0, 13, 14, 15, 16], // WRIST -> RING_MCP -> RING_PIP -> RING_DIP -> RING_TIP
  PINKY: [0, 17, 18, 19, 20], // WRIST -> PINKY_MCP -> PINKY_PIP -> PINKY_DIP -> PINKY_TIP
};

// Landmark names (matches backend logic)
export const LANDMARK_NAMES = [
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

// Hand connections for drawing the hand skeleton (legacy support)
export const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
];

/**
 * Determine which finger a landmark belongs to (matches backend logic)
 */
export function getLandmarkFinger(
  landmarkName: string
): keyof typeof FINGER_COLORS {
  if (landmarkName.includes("WRIST")) {
    return "WRIST";
  } else if (landmarkName.includes("THUMB")) {
    return "THUMB";
  } else if (landmarkName.includes("INDEX_FINGER")) {
    return "INDEX_FINGER";
  } else if (landmarkName.includes("MIDDLE_FINGER")) {
    return "MIDDLE_FINGER";
  } else if (landmarkName.includes("RING_FINGER")) {
    return "RING_FINGER";
  } else if (landmarkName.includes("PINKY")) {
    return "PINKY";
  } else {
    return "WRIST";
  }
}

export function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: Point[],
  connections: number[][],
  options: DrawingOptions
) {
  const { color, lineWidth } = options;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  connections.forEach(([startIdx, endIdx]) => {
    const startPoint = landmarks[startIdx];
    const endPoint = landmarks[endIdx];

    if (startPoint && endPoint) {
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();
    }
  });

  ctx.restore();
}

export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Point[],
  options: DrawingOptions
) {
  const { color, lineWidth } = options;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  landmarks.forEach((landmark) => {
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, lineWidth * 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });

  ctx.restore();
}

/**
 * Enhanced drawing function that matches backend visualization logic
 * Draws finger-specific colors and connections
 */
export function drawEnhancedHandLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Point[],
  options: EnhancedDrawingOptions
) {
  const {
    lineWidth = 2,
    showLandmarkIds = false,
    showFingerColors = true,
    handLabel,
  } = options;

  ctx.save();

  // Draw finger connections with finger-specific colors
  if (showFingerColors) {
    Object.entries(FINGER_CONNECTIONS).forEach(
      ([finger, connectionIndices]) => {
        if (finger === "WRIST") return;

        const color = FINGER_COLORS[finger as keyof typeof FINGER_COLORS];
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Draw lines connecting finger joints
        for (let i = 0; i < connectionIndices.length - 1; i++) {
          const startIdx = connectionIndices[i];
          const endIdx = connectionIndices[i + 1];

          if (startIdx < landmarks.length && endIdx < landmarks.length) {
            const startPoint = landmarks[startIdx];
            const endPoint = landmarks[endIdx];

            if (startPoint && endPoint) {
              ctx.beginPath();
              ctx.moveTo(startPoint.x, startPoint.y);
              ctx.lineTo(endPoint.x, endPoint.y);
              ctx.stroke();
            }
          }
        }
      }
    );
  } else {
    // Fallback to single color
    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, options);
  }

  // Draw landmarks with finger-specific colors
  landmarks.forEach((landmark, index) => {
    const landmarkName = LANDMARK_NAMES[index] || `LANDMARK_${index}`;
    const finger = getLandmarkFinger(landmarkName);
    const color = showFingerColors ? FINGER_COLORS[finger] : options.color;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    // Draw circle (slightly larger for better visibility)
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Add landmark ID as text (matches backend visualization)
    if (showLandmarkIds) {
      ctx.fillStyle = "white";
      ctx.font = "bold 6px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Add background for text readability
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(landmark.x - 8, landmark.y - 8, 16, 8);

      // Add text
      ctx.fillStyle = "black";
      ctx.fillText(index.toString(), landmark.x, landmark.y - 4);
    }
  });

  ctx.restore();
}

/**
 * Create a visualization canvas that matches the backend's landmark visualization
 * This can be used for debugging or creating match comparisons
 */
export function createLandmarkVisualizationCanvas(
  landmarks: Point[],
  handLabel?: "Left" | "Right",
  width: number = 400,
  height: number = 400
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Set background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  // Draw enhanced landmarks
  drawEnhancedHandLandmarks(ctx, landmarks, {
    color: "#000000",
    lineWidth: 2,
    showLandmarkIds: true,
    showFingerColors: true,
    handLabel,
  });

  // Add title
  ctx.fillStyle = "black";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${handLabel || "Hand"} Landmarks`, width / 2, 20);

  return canvas;
}
