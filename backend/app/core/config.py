from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "AI Privacy Guard"
    APP_VERSION: str = "0.1.0-beta"
    DEBUG: bool = True
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS settings - allow all origins for BETA (tighten later for production)
    CORS_ORIGINS: list[str] = ["*"]
    
    # Upload settings
    MAX_FILE_SIZE_MB: int = 10
    MAX_BATCH_SIZE: int = 10
    ALLOWED_EXTENSIONS: list[str] = ["jpg", "jpeg", "png", "webp"]
    
    # Rate limiting
    RATE_LIMIT_PER_DAY: int = 5
    
    # Redis settings (optional for ephemeral storage)
    REDIS_URL: Optional[str] = None
    REDIS_TTL_SECONDS: int = 300  # 5 minutes
    
    # AI Model settings
    YOLO_MODEL: str = "yolov8n.pt"
    PLATE_YOLO_MODEL: str = "yolov8s-license-plate.pt"
    FACE_MODEL: str = "retinaface_mnet025_v1"
    FACE_DETECTION_CONFIDENCE: float = 0.5
    PLATE_DETECTION_CONFIDENCE: float = 0.5
    # More permissive defaults to improve recall on small/angled plates
    PLATE_MIN_CONFIDENCE: float = 0.2
    PLATE_MIN_ASPECT: float = 1.5
    PLATE_MAX_ASPECT: float = 8.0
    PLATE_MIN_Y_FRAC: float = 0.35
    # Set to 0 to disable the corresponding filter
    PLATE_FILTER_BY_ASPECT: bool = True
    PLATE_FILTER_BY_Y_FRAC: bool = True
    DEBUG_PLATE_DETECTION: bool = False
    # Higher imgsz can improve small-plate recall at the cost of speed
    PLATE_YOLO_IMGSZ: int = 1280
    
    # Default blur settings
    DEFAULT_BLUR_INTENSITY: int = 80
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
