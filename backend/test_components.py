#!/usr/bin/env python3
"""
Simple test script for the sign language recognition backend
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test if all required modules can be imported"""
    try:
        import mediapipe as mp
        print("✅ MediaPipe imported successfully")
    except ImportError as e:
        print(f"❌ MediaPipe import failed: {e}")
        return False
    
    try:
        import cv2
        print("✅ OpenCV imported successfully")
    except ImportError as e:
        print(f"❌ OpenCV import failed: {e}")
        return False
    
    try:
        import fastapi
        print("✅ FastAPI imported successfully")
    except ImportError as e:
        print(f"❌ FastAPI import failed: {e}")
        return False
    
    try:
        from sign_language_model import SignLanguageRecognizer
        print("✅ SignLanguageRecognizer imported successfully")
    except ImportError as e:
        print(f"❌ SignLanguageRecognizer import failed: {e}")
        return False
    
    return True

def test_model_initialization():
    """Test if the sign language model can be initialized"""
    try:
        from sign_language_model import SignLanguageRecognizer
        recognizer = SignLanguageRecognizer()
        print("✅ SignLanguageRecognizer initialized successfully")
        recognizer.close()
        return True
    except Exception as e:
        print(f"❌ SignLanguageRecognizer initialization failed: {e}")
        return False

def main():
    print("🧪 Testing Sign Language Recognition Backend Components...")
    print()
    
    # Test imports
    print("Testing imports...")
    if not test_imports():
        print("❌ Import tests failed")
        return 1
    
    print()
    
    # Test model initialization
    print("Testing model initialization...")
    if not test_model_initialization():
        print("❌ Model initialization failed")
        return 1
    
    print()
    print("✅ All tests passed! Backend components are working correctly.")
    print()
    print("Next steps:")
    print("1. Start the backend server: uv run uvicorn main:app --host 0.0.0.0 --port 8000")
    print("2. Test the API endpoints: ./test_backend.sh")
    print("3. Start the frontend: npm run dev")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
