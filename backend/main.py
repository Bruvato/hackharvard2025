"""
ASL Letter Prediction API
Provides REST API endpoint for ASL letter prediction from hand landmarks
"""

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uvicorn
from classifier_tools.live_hand_tracker import find_closest_asl_match, load_asl_alphabet_data, normalize_hand_rotation
import logging
from math import isfinite

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="ASL Letter Prediction API",
    description="Real-time ASL letter prediction from hand landmarks using MediaPipe",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Load ASL alphabet data for classification
load_asl_alphabet_data()

# Pydantic models for request/response
class LandmarkData(BaseModel):
    landmark_id: int
    landmark_name: str
    x_raw: float
    y_raw: float
    z_raw: float
    x_scaled: float
    y_scaled: float
    z_scaled: float

class HandData(BaseModel):
    hand_index: int
    hand_label: str
    confidence: float
    landmarks: List[LandmarkData]

class LandmarkRequest(BaseModel):
    timestamp: Optional[str] = None
    image_width: int = 640
    image_height: int = 480
    hands_detected: int
    scaling_info: Optional[Dict] = None
    hands: List[HandData]

class PredictionResponse(BaseModel):
    success: bool
    predicted_letter: Optional[str]
    confidence: float
    distance: float
    hand_label: Optional[str]
    message: str
    
    class Config:
        # Ensure all float values are JSON serializable
        json_encoders = {
            float: lambda v: v if isfinite(v) else 0.0
        }

def process_landmarks_for_classifier(hand_data: HandData, image_width: int, image_height: int):
    """Process landmarks the same way as classifier tools"""
    landmarks_data = []
    
    for landmark in hand_data.landmarks:
        # Get raw pixel coordinates (already converted from normalized coordinates)
        x_raw = landmark.x_raw
        y_raw = landmark.y_raw
        z_raw = landmark.z_raw
        
        # Calculate edge-to-edge scaling using raw coordinates
        all_x_coords = [landmark.x_raw for landmark in hand_data.landmarks]
        all_y_coords = [landmark.y_raw for landmark in hand_data.landmarks]
        
        min_x = min(all_x_coords)
        max_x = max(all_x_coords)
        min_y = min(all_y_coords)
        max_y = max(all_y_coords)
        
        # Calculate scale factor to fit within target size
        target_size = 2000
        scale_x = target_size / (max_x - min_x) if max_x != min_x else 1.0
        scale_y = target_size / (max_y - min_y) if max_y != min_y else 1.0
        scale_factor = min(scale_x, scale_y)
        
        # Calculate offsets to center the scaled landmarks
        scaled_width = (max_x - min_x) * scale_factor
        scaled_height = (max_y - min_y) * scale_factor
        offset_x = (target_size - scaled_width) / 2
        offset_y = (target_size - scaled_height) / 2
        
        scaling_info = {
            "min_x": min_x,
            "max_x": max_x,
            "min_y": min_y,
            "max_y": max_y,
            "scale_factor": scale_factor,
            "offset_x": offset_x,
            "offset_y": offset_y,
            "target_size": target_size
        }
        
        # Apply edge-to-edge scaling
        if scaling_info:
            x_scaled = (x_raw - scaling_info["min_x"]) * scaling_info["scale_factor"] + scaling_info["offset_x"]
            y_scaled = (y_raw - scaling_info["min_y"]) * scaling_info["scale_factor"] + scaling_info["offset_y"]
            z_scaled = z_raw * scaling_info["scale_factor"]
        else:
            x_scaled = x_raw
            y_scaled = y_raw
            z_scaled = z_raw
        
        landmark_data = {
            "landmark_id": landmark.landmark_id,
            "landmark_name": landmark.landmark_name,
            "x_raw": float(x_raw),
            "y_raw": float(y_raw),
            "z_raw": float(z_raw),
            "x_scaled": float(x_scaled),
            "y_scaled": float(y_scaled),
            "z_scaled": float(z_scaled)
        }
        
        landmarks_data.append(landmark_data)
    
    # Apply rotation normalization
    landmarks_data = normalize_hand_rotation(landmarks_data)
    
    return landmarks_data

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "ASL Letter Prediction API",
        "version": "1.0.0",
        "endpoints": {
            "predict_letter": "/predict-letter",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "asl-letter-prediction-api"}






@app.post("/predict-letter", response_model=PredictionResponse)
async def predict_letter_from_landmarks(request: LandmarkRequest):
    """
    Predict ASL letter from hand landmark data using classifier tools
    
    Args:
        request: LandmarkRequest containing hand landmark data
        
    Returns:
        PredictionResponse with predicted letter and confidence
    """
    try:
        logger.info(f"Received prediction request with {len(request.hands)} hands")
        
        # Validate request data
        if not request.hands:
            logger.warning("No hands provided in request")
            return PredictionResponse(
                success=False,
                predicted_letter=None,
                confidence=0.0,
                distance=999999.0,
                hand_label=None,
                message="No hand data provided"
            )
        
        # Validate landmark data
        for hand_idx, hand in enumerate(request.hands):
            if not hand.landmarks or len(hand.landmarks) != 21:
                logger.warning(f"Hand {hand_idx} has {len(hand.landmarks) if hand.landmarks else 0} landmarks, expected 21")
                return PredictionResponse(
                    success=False,
                    predicted_letter=None,
                    confidence=0.0,
                    distance=999999.0,
                    hand_label=None,
                    message=f"Invalid landmark count: expected 21, got {len(hand.landmarks) if hand.landmarks else 0}"
                )
            
            # Validate landmark coordinates
            for landmark in hand.landmarks:
                if not all(isinstance(getattr(landmark, coord), (int, float)) and 
                          isfinite(getattr(landmark, coord)) for coord in ['x_raw', 'y_raw', 'z_raw', 'x_scaled', 'y_scaled', 'z_scaled']):
                    logger.warning(f"Invalid landmark coordinates in hand {hand_idx}")
                    return PredictionResponse(
                        success=False,
                        predicted_letter=None,
                        confidence=0.0,
                        distance=999999.0,
                        hand_label=None,
                        message="Invalid landmark coordinates detected"
                    )
        
        # Convert request to the format expected by find_closest_asl_match
        landmarks_data = {
            "timestamp": request.timestamp,
            "image_width": request.image_width,
            "image_height": request.image_height,
            "hands_detected": request.hands_detected,
            "scaling_info": request.scaling_info,
            "hands": []
        }
        
        # Process each hand using classifier tools (applies scaling and normalization)
        for hand in request.hands:
            # Process landmarks with scaling and normalization
            processed_landmarks = process_landmarks_for_classifier(hand, request.image_width, request.image_height)
            
            hand_dict = {
                "hand_index": hand.hand_index,
                "hand_label": hand.hand_label,
                "confidence": hand.confidence,
                "landmarks": processed_landmarks
            }
            
            landmarks_data["hands"].append(hand_dict)
        
        # Use the classifier to find the closest ASL match
        best_match, best_distance, best_hand_label = find_closest_asl_match(landmarks_data)
        
        if best_match is None:
            logger.warning("No ASL letter match found")
            return PredictionResponse(
                success=False,
                predicted_letter=None,
                confidence=0.0,
                distance=999999.0,
                hand_label=None,
                message="No ASL letter match found"
            )
        
        # Validate distance value - convert inf to a large number for JSON serialization
        if not isfinite(best_distance):
            logger.warning(f"Invalid distance value: {best_distance}")
            best_distance = 999999.0
        
        # Calculate confidence based on distance (lower distance = higher confidence)
        # Normalize distance to confidence score (0-1)
        max_expected_distance = 1000.0  # Adjust based on your data
        confidence = max(0.0, min(1.0, 1.0 - (best_distance / max_expected_distance)))
        
        # Get the hand label from the request
        request_hand_label = request.hands[0].hand_label if request.hands else "Unknown"
        
        logger.info(f"Predicted letter: {best_match.upper()}, distance: {best_distance:.2f}, confidence: {confidence:.2f}")
        
        # Ensure all response values are JSON serializable
        def ensure_finite(value):
            return value if isfinite(value) else 0.0
        
        # Create response with validated values
        response = PredictionResponse(
            success=True,
            predicted_letter=best_match.upper(),
            confidence=ensure_finite(confidence),
            distance=ensure_finite(best_distance),
            hand_label=request_hand_label,
            message=f"Successfully predicted letter '{best_match.upper()}'"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error predicting letter from landmarks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error predicting letter: {str(e)}")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )