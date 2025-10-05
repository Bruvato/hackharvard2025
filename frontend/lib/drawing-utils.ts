// Drawing utilities for MediaPipe hand landmarks
// Based on MediaPipe's drawing utilities

export interface Point {
  x: number;
  y: number;
}

export interface DrawingOptions {
  color: string;
  lineWidth: number;
}

// Hand connections for drawing the hand skeleton
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
