# Use Python 3.11 slim image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV, image processing, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    build-essential \
    cmake \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Cython first (required for insightface build)
RUN pip install --no-cache-dir Cython numpy

# Install all requirements
RUN pip install --no-cache-dir -r requirements.txt

# Note: InsightFace models will download on first request (~100MB)
# This avoids build timeout issues

# Copy application code and model files
COPY . .

# Cloud Run uses PORT environment variable, default to 8080
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/')" || exit 1

# Start command
CMD exec uvicorn main:app --host 0.0.0.0 --port $PORT
