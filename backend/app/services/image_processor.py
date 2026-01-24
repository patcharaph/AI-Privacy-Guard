import cv2
import numpy as np
import base64
import uuid
import time
import logging
from typing import List, Tuple
from io import BytesIO
from PIL import Image

from app.models.schemas import (
    BoundingBox, BlurMode, ProcessingOptions, 
    ProcessedImageResult, DetectionType
)
from app.services.detector import detector
from app.services.blur_processor import blur_processor
from app.core.config import settings

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Main image processing service that orchestrates detection and blur."""
    
    @staticmethod
    def decode_image(image_bytes: bytes) -> np.ndarray:
        """Decode image bytes to numpy array."""
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Failed to decode image")
        return image
    
    @staticmethod
    def encode_image(image: np.ndarray, format: str = "png") -> str:
        """Encode numpy array to base64 string."""
        # Convert BGR to RGB for proper color output
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_image)
        
        buffer = BytesIO()
        pil_image.save(buffer, format=format.upper(), quality=95)
        buffer.seek(0)
        
        base64_str = base64.b64encode(buffer.read()).decode('utf-8')
        return f"data:image/{format};base64,{base64_str}"
    
    @staticmethod
    def validate_image(image_bytes: bytes, filename: str) -> Tuple[bool, str]:
        """Validate image file size and format."""
        # Check file size
        size_mb = len(image_bytes) / (1024 * 1024)
        if size_mb > settings.MAX_FILE_SIZE_MB:
            return False, f"File size ({size_mb:.1f}MB) exceeds maximum ({settings.MAX_FILE_SIZE_MB}MB)"
        
        # Check extension
        ext = filename.lower().split('.')[-1] if '.' in filename else ''
        if ext not in settings.ALLOWED_EXTENSIONS:
            return False, f"File format '{ext}' not supported. Allowed: {settings.ALLOWED_EXTENSIONS}"
        
        # Try to decode image
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                return False, "Failed to decode image. File may be corrupted."
        except Exception as e:
            return False, f"Image validation failed: {str(e)}"
        
        return True, "Valid"
    
    def process_single_image(
        self, 
        image_bytes: bytes, 
        filename: str,
        options: ProcessingOptions
    ) -> ProcessedImageResult:
        """Process a single image with detection and blur."""
        start_time = time.time()
        
        # Generate unique ID for this image
        image_id = str(uuid.uuid4())[:8]
        
        # Decode image
        image = self.decode_image(image_bytes)
        logger.info(f"Processing image {filename} ({image.shape[1]}x{image.shape[0]})")
        
        # Run detection
        detections = detector.detect_all(
            image,
            detect_faces=options.detect_faces,
            detect_plates=options.detect_plates
        )
        
        logger.info(f"Found {len(detections)} detections in {filename}")
        
        # Apply blur
        processed_image = blur_processor.process_image(
            image,
            detections,
            options.blur_mode,
            options.blur_intensity
        )
        
        # Encode result
        processed_base64 = self.encode_image(processed_image)
        
        processing_time = (time.time() - start_time) * 1000  # Convert to ms
        
        return ProcessedImageResult(
            image_id=image_id,
            original_filename=filename,
            processed_image_base64=processed_base64,
            detections=detections,
            processing_time_ms=round(processing_time, 2)
        )
    
    async def process_batch(
        self,
        images: List[Tuple[bytes, str]],  # List of (image_bytes, filename)
        options: ProcessingOptions
    ) -> Tuple[List[ProcessedImageResult], float, int]:
        """Process a batch of images."""
        start_time = time.time()
        results = []
        total_detections = 0
        
        for image_bytes, filename in images:
            try:
                result = self.process_single_image(image_bytes, filename, options)
                results.append(result)
                total_detections += len(result.detections)
            except Exception as e:
                logger.error(f"Error processing {filename}: {e}")
                # Continue with other images
                continue
        
        total_time = (time.time() - start_time) * 1000
        return results, total_time, total_detections


image_processor = ImageProcessor()
