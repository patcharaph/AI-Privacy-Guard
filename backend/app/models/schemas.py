from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


class BlurMode(str, Enum):
    GAUSSIAN = "gaussian"
    PIXELATION = "pixelation"
    EMOJI = "emoji"


class DetectionType(str, Enum):
    FACE = "face"
    LICENSE_PLATE = "license_plate"


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int
    confidence: float
    detection_type: DetectionType


class ProcessingOptions(BaseModel):
    blur_mode: BlurMode = BlurMode.GAUSSIAN
    blur_intensity: int = Field(default=80, ge=0, le=100)
    detect_faces: bool = True
    detect_plates: bool = True


class ProcessedImageResult(BaseModel):
    image_id: str
    original_filename: str
    processed_image_base64: str
    detections: list[BoundingBox]
    processing_time_ms: float


class ProcessingResponse(BaseModel):
    success: bool
    message: str
    results: list[ProcessedImageResult]
    total_processing_time_ms: float
    images_processed: int
    total_detections: int


class FeedbackRequest(BaseModel):
    missed_type: Literal["face", "license_plate"]
    comment: Optional[str] = Field(default=None, max_length=500)
    image_id: Optional[str] = None
    detection_coordinates: Optional[dict] = None


class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedback_id: str


class HealthResponse(BaseModel):
    status: str
    version: str
    models_loaded: bool


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
