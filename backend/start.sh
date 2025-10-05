#!/bin/bash

# Sign Language Backend Startup Script
# This script starts the FastAPI backend server

echo "🚀 Starting Sign Language Recognition Backend..."

# Check if we're in the backend directory
if [ ! -f "main.py" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "❌ Error: uv is not installed. Please install uv first."
    echo "   Visit: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
fi

# Check if Python 3.11+ is available
python_version=$(uv run python --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
if [ "$(echo "$python_version < 3.11" | bc -l)" -eq 1 ]; then
    echo "❌ Error: Python 3.11+ is required. Found: $python_version"
    exit 1
fi

echo "✅ Python version: $(uv run python --version)"
echo "✅ Dependencies installed"

# Start the server directly with uvicorn
echo "🌐 Starting FastAPI server on http://localhost:8000"
echo "📚 API Documentation available at http://localhost:8000/docs"
echo "🔍 Health check available at http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the server with auto-reload for development
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
