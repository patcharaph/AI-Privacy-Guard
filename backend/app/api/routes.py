from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import List, Optional
import uuid
import logging
import json

from app.models.schemas import (
    ProcessingOptions, ProcessingResponse, BlurMode,
    FeedbackRequest, FeedbackResponse, HealthResponse, ErrorResponse
)
from app.services.image_processor import image_processor
from app.services.detector import detector
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Map ASCII-safe emoji keys to canonical emoji
EMOJI_KEY_MAP = {
    "smile": "\U0001F600",
    "cool": "\U0001F60E",
    "robot": "\U0001F916",
    "monkey": "\U0001F435",
    "star": "\u2B50",
    "lock": "\U0001F512",
}

# In-memory feedback storage (for BETA - would use PostgreSQL in production)
feedback_store: List[dict] = []

# Simple rate limiting store (IP -> count)
rate_limit_store: dict = {}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        models_loaded=detector.models_loaded
    )


@router.post("/process", response_model=ProcessingResponse)
async def process_images(
    request: Request,
    files: List[UploadFile] = File(...),
    blur_mode: str = Form(default="gaussian"),
    blur_intensity: int = Form(default=80),
    detect_faces: bool = Form(default=True),
    detect_plates: bool = Form(default=True),
    detection_sensitivity: int = Form(default=60),
    emoji: str = Form(default="\U0001F600"),
    emoji_key: Optional[str] = Form(default=None)
):
    """
    Process uploaded images with privacy blur.
    
    - **files**: List of image files (max 10, each max 10MB)
    - **blur_mode**: gaussian, pixelation, or emoji
    - **blur_intensity**: 0-100 (default 80)
    - **detect_faces**: Enable face detection (default True)
    - **detect_plates**: Enable license plate detection (default True)
    - **detection_sensitivity**: 0-100 (lower = stricter, fewer detections)
    - **emoji**: Emoji to use for overlay (default 😀)
    """
    # Validate batch size
    if len(files) > settings.MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.MAX_BATCH_SIZE} images per batch allowed"
        )
    
    if len(files) == 0:
        raise HTTPException(
            status_code=400,
            detail="No files provided"
        )
    
    # Simple rate limiting by IP
    client_ip = request.client.host if request.client else "unknown"
    if client_ip in rate_limit_store:
        if rate_limit_store[client_ip] >= settings.RATE_LIMIT_PER_DAY:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Maximum {settings.RATE_LIMIT_PER_DAY} batches per day."
            )
        rate_limit_store[client_ip] += 1
    else:
        rate_limit_store[client_ip] = 1
    
    # Parse blur mode
    try:
        blur_mode_enum = BlurMode(blur_mode.lower())
    except ValueError:
        blur_mode_enum = BlurMode.GAUSSIAN
    
    if emoji_key and emoji_key in EMOJI_KEY_MAP:
        emoji = EMOJI_KEY_MAP[emoji_key]

    # Log received emoji for debugging
    logger.info(f"Received emoji: '{emoji}' (repr: {repr(emoji)})")
    
    # Create processing options
    options = ProcessingOptions(
        blur_mode=blur_mode_enum,
        blur_intensity=max(0, min(100, blur_intensity)),
        detect_faces=detect_faces,
        detect_plates=detect_plates,
        detection_sensitivity=max(0, min(100, detection_sensitivity)),
        emoji=emoji,
        emoji_key=emoji_key
    )
    
    # Read and validate all files
    images_to_process = []
    for file in files:
        try:
            content = await file.read()
            
            # Validate image
            is_valid, message = image_processor.validate_image(content, file.filename or "unknown")
            if not is_valid:
                logger.warning(f"Invalid file {file.filename}: {message}")
                continue
            
            images_to_process.append((content, file.filename or "unknown"))
        except Exception as e:
            logger.error(f"Error reading file {file.filename}: {e}")
            continue
    
    if not images_to_process:
        raise HTTPException(
            status_code=400,
            detail="No valid images to process"
        )
    
    # Process images
    try:
        results, total_time, total_detections = await image_processor.process_batch(
            images_to_process, options
        )
        
        return ProcessingResponse(
            success=True,
            message=f"Successfully processed {len(results)} image(s)",
            results=results,
            total_processing_time_ms=round(total_time, 2),
            images_processed=len(results),
            total_detections=total_detections
        )
    except Exception as e:
        logger.error(f"Processing error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackRequest):
    """
    Submit feedback for missed detections.
    
    This helps improve the AI model accuracy.
    """
    feedback_id = str(uuid.uuid4())[:8]
    
    # Store feedback (in-memory for BETA)
    feedback_entry = {
        "id": feedback_id,
        "missed_type": feedback.missed_type,
        "comment": feedback.comment,
        "image_id": feedback.image_id,
        "detection_coordinates": feedback.detection_coordinates
    }
    feedback_store.append(feedback_entry)
    
    logger.info(f"Feedback received: {feedback_id} - Missed {feedback.missed_type}")
    
    return FeedbackResponse(
        success=True,
        message="Thank you for your feedback! This helps improve our detection accuracy.",
        feedback_id=feedback_id
    )


@router.get("/stats")
async def get_stats():
    """Get basic statistics for BETA evaluation."""
    return {
        "total_feedback_count": len(feedback_store),
        "feedback_by_type": {
            "face": sum(1 for f in feedback_store if f["missed_type"] == "face"),
            "license_plate": sum(1 for f in feedback_store if f["missed_type"] == "license_plate")
        },
        "rate_limit_store_size": len(rate_limit_store)
    }


@router.get("/quota")
async def get_quota(request: Request):
    """Get current quota usage for the client."""
    client_ip = request.client.host if request.client else "unknown"
    used = rate_limit_store.get(client_ip, 0)
    limit = settings.RATE_LIMIT_PER_DAY
    remaining = max(0, limit - used)
    
    return {
        "used": used,
        "limit": limit,
        "remaining": remaining
    }


# Store for quota requests
quota_requests: List[dict] = []

@router.post("/request-quota")
async def request_extra_quota(request: Request, use_case: str = Form(...), email: str = Form(default="")):
    """Request extra quota - collects lead info for BETA feedback."""
    client_ip = request.client.host if request.client else "unknown"
    request_id = str(uuid.uuid4())[:8]
    
    quota_requests.append({
        "id": request_id,
        "ip": client_ip,
        "use_case": use_case,
        "email": email,
        "timestamp": str(uuid.uuid4())  # Simple timestamp placeholder
    })
    
    # Grant 5 extra batches
    if client_ip in rate_limit_store:
        rate_limit_store[client_ip] = max(0, rate_limit_store[client_ip] - 5)
    
    logger.info(f"Quota request: {request_id} - Use case: {use_case}, Email: {email}")
    
    return {
        "success": True,
        "message": "Thank you! You've been granted 5 extra batches.",
        "request_id": request_id
    }
