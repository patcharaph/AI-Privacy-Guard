from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "AI Privacy Guard"
    APP_VERSION: str = "0.1.0-beta"
    DEBUG: bool = True
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS settings
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
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
    FACE_DETECTION_CONFIDENCE: float = 0.5
    PLATE_DETECTION_CONFIDENCE: float = 0.5
    
    # Default blur settings
    DEFAULT_BLUR_INTENSITY: int = 80
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
