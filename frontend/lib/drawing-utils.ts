// Drawing utilities for MediaPipe hand and face landmarks
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

export interface FaceDrawingOptions extends DrawingOptions {
  showLandmarkIds?: boolean;
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

// =======================
// Face Landmark Drawing Utilities
// =======================

// Face mesh connections (simplified key connections for visualization)
export const FACE_CONNECTIONS = [
  // Face oval
  [10, 338],
  [338, 297],
  [297, 332],
  [332, 284],
  [284, 251],
  [251, 389],
  [389, 356],
  [356, 454],
  [454, 323],
  [323, 361],
  [361, 288],
  [288, 397],
  [397, 365],
  [365, 379],
  [379, 378],
  [378, 400],
  [400, 377],
  [377, 152],
  [152, 148],
  [148, 176],
  [176, 149],
  [149, 150],
  [150, 136],
  [136, 172],
  [172, 58],
  [58, 132],
  [132, 93],
  [93, 234],
  [234, 127],
  [127, 162],
  [162, 21],
  [21, 54],
  [54, 103],
  [103, 67],
  [67, 109],
  [109, 10],
  // Left eye
  [33, 246],
  [246, 161],
  [161, 160],
  [160, 159],
  [159, 158],
  [158, 157],
  [157, 173],
  [173, 133],
  [133, 155],
  [155, 154],
  [154, 153],
  [153, 145],
  [145, 144],
  [144, 163],
  [163, 7],
  // Right eye
  [263, 466],
  [466, 388],
  [388, 387],
  [387, 386],
  [386, 385],
  [385, 384],
  [384, 398],
  [398, 362],
  [362, 382],
  [382, 381],
  [381, 380],
  [380, 374],
  [374, 373],
  [373, 390],
  [390, 249],
  // Lips outer
  [61, 146],
  [146, 91],
  [91, 181],
  [181, 84],
  [84, 17],
  [17, 314],
  [314, 405],
  [405, 321],
  [321, 375],
  [375, 291],
  [291, 61],
  // Lips inner
  [78, 95],
  [95, 88],
  [88, 178],
  [178, 87],
  [87, 14],
  [14, 317],
  [317, 402],
  [402, 318],
  [318, 324],
  [324, 308],
  [308, 78],
  // Nose
  [1, 4],
  [4, 5],
  [5, 195],
  [195, 197],
  [197, 2],
];

/**
 * Draw face landmarks
 */
export function drawFaceLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Point[],
  options: FaceDrawingOptions
) {
  const { color, lineWidth, showLandmarkIds = false } = options;

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  landmarks.forEach((landmark, index) => {
    // Draw circle for landmark
    ctx.beginPath();
    ctx.arc(landmark.x, landmark.y, lineWidth * 1.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Add landmark ID as text if requested
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
 * Draw face connectors
 */
export function drawFaceConnectors(
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
