FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860 \
    PYTHONPATH=/app:/app/backend

# Create non-root user with UID 1000 required by Hugging Face Spaces
RUN useradd -m -u 1000 user

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies (CPU-optimized for cloud deployment)
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy all application files (including root main.py and prebuilt frontend/dist & backend/dist)
COPY --chown=user:user . .

# Ensure runtime directories exist with write permissions for user 1000
RUN mkdir -p backend/data backend/reports backend/artifacts backend/mlflow-artifacts backend/models && \
    chown -R user:user /app

USER user

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:7860/api/v1/health || exit 1

CMD ["python", "main.py"]
