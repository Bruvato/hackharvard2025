"""
FastAPI Backend Server for Sign Language Recognition
Provides REST API endpoints for sign language translation
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
from PIL import Image
import io
import base64
from typing import List, Dict, Optional
import uvicorn
from sign_language_model import SignLanguageRecognizer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Sign Language Recognition API",
    description="Real-time sign language recognition and translation using MediaPipe",
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

# Initialize the sign language recognizer
recognizer = SignLanguageRecognizer()

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Sign Language Recognition API",
        "version": "1.0.0",
        "endpoints": {
            "recognize": "/recognize",
            "recognize_base64": "/recognize-base64",
            "health": "/health",
            "gestures": "/gestures"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "sign-language-api"}

@app.get("/gestures")
async def get_supported_gestures():
    """Get list of supported sign language gestures"""
    return {
        "gestures": list(recognizer.sign_gestures.keys()),
        "translations": {
            gesture: recognizer._get_translation(gesture) 
            for gesture in recognizer.sign_gestures.keys()
        }
    }

@app.post("/recognize")
async def recognize_sign_language(file: UploadFile = File(...)):
    """
    Recognize sign language from uploaded image
    
    Args:
        file: Image file (JPEG, PNG, etc.)
        
    Returns:
        JSON response with detected gestures and landmarks
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Convert to OpenCV format
        image = Image.open(io.BytesIO(image_data))
        image = image.convert('RGB')
        image_array = np.array(image)
        frame = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Process the frame
        result = recognizer.process_frame(frame)
        
        logger.info(f"Processed image: {file.filename}, detected {len(result['gestures'])} gestures")
        
        return JSONResponse(content={
            "success": True,
            "filename": file.filename,
            "result": result,
            "message": f"Detected {len(result['gestures'])} gesture(s)"
        })
        
    except Exception as e:
        logger.error(f"Error processing image {file.filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/recognize-base64")
async def recognize_sign_language_base64(data: Dict):
    """
    Recognize sign language from base64 encoded image
    
    Args:
        data: Dictionary containing 'image' field with base64 encoded image
        
    Returns:
        JSON response with detected gestures and landmarks
    """
    try:
        # Extract base64 image data
        if 'image' not in data:
            raise HTTPException(status_code=400, detail="Missing 'image' field in request data")
        
        # Decode base64 image
        image_data = base64.b64decode(data['image'])
        
        # Convert to OpenCV format
        image = Image.open(io.BytesIO(image_data))
        image = image.convert('RGB')
        image_array = np.array(image)
        frame = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        
        # Process the frame
        result = recognizer.process_frame(frame)
        
        logger.info(f"Processed base64 image, detected {len(result['gestures'])} gestures")
        
        return JSONResponse(content={
            "success": True,
            "result": result,
            "message": f"Detected {len(result['gestures'])} gesture(s)"
        })
        
    except Exception as e:
        logger.error(f"Error processing base64 image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/recognize-video-frame")
async def recognize_video_frame(data: Dict):
    """
    Recognize sign language from video frame data
    
    Args:
        data: Dictionary containing frame data
        
    Returns:
        JSON response with detected gestures and landmarks
    """
    try:
        # This endpoint can be used for real-time video processing
        # For now, it processes base64 encoded frames
        return await recognize_sign_language_base64(data)
        
    except Exception as e:
        logger.error(f"Error processing video frame: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing video frame: {str(e)}")

@app.post("/batch-recognize")
async def batch_recognize(files: List[UploadFile] = File(...)):
    """
    Recognize sign language from multiple images
    
    Args:
        files: List of image files
        
    Returns:
        JSON response with results for all images
    """
    try:
        results = []
        
        for file in files:
            try:
                # Process each file
                image_data = await file.read()
                image = Image.open(io.BytesIO(image_data))
                image = image.convert('RGB')
                image_array = np.array(image)
                frame = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
                
                result = recognizer.process_frame(frame)
                
                results.append({
                    "filename": file.filename,
                    "success": True,
                    "result": result
                })
                
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })
        
        return JSONResponse(content={
            "success": True,
            "total_files": len(files),
            "results": results
        })
        
    except Exception as e:
        logger.error(f"Error in batch processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in batch processing: {str(e)}")

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