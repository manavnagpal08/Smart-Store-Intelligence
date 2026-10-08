FROM python:3.11-slim

# Install system dependencies for OpenCV and multimedia processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    ffmpeg \
    default-jre \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir opencv-python-headless fastapi uvicorn[standard] sqlalchemy pydantic pydantic-settings httpx python-multipart

# Copy repository code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Run Uvicorn
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
