import cv2
import numpy as np
import os
from typing import List, Tuple
import logging

from app.models.schemas import BoundingBox, DetectionType
from app.core.config import settings

logger = logging.getLogger(__name__)


class PrivacyDetector:
    """Handles face and license plate detection using OpenCV (Python 3.11+ compatible)."""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if PrivacyDetector._initialized:
            return
        
        logger.info("Initializing AI detection models...")
        
        # Initialize OpenCV Haar Cascade for Face Detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        if self.face_cascade.empty():
            logger.error("Failed to load Haar Cascade for face detection")
            self.face_detector_loaded = False
        else:
            self.face_detector_loaded = True
            logger.info("OpenCV Face Cascade loaded successfully")
        
        # Initialize OpenCV Haar Cascade for vehicle/car detection (for license plates)
        car_cascade_path = cv2.data.haarcascades + 'haarcascade_car.xml'
        if os.path.exists(car_cascade_path):
            self.car_cascade = cv2.CascadeClassifier(car_cascade_path)
            self.car_detector_loaded = not self.car_cascade.empty()
        else:
            self.car_cascade = None
            self.car_detector_loaded = False
            logger.warning("Car cascade not available, license plate detection will be limited")
        
        PrivacyDetector._initialized = True
        logger.info("AI detection models initialized successfully")
    
    def detect_faces(self, image: np.ndarray) -> List[BoundingBox]:
        """Detect faces in an image using OpenCV Haar Cascade."""
        detections = []
        
        if not self.face_detector_loaded:
            return detections
        
        # Convert to grayscale for Haar Cascade
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        h, w = image.shape[:2]
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        for (x, y, width, height) in faces:
            # Ensure coordinates are within image bounds
            x = max(0, x)
            y = max(0, y)
            width = min(width, w - x)
            height = min(height, h - y)
            
            # Add padding for better coverage
            padding = int(min(width, height) * 0.1)
            x = max(0, x - padding)
            y = max(0, y - padding)
            width = min(width + 2 * padding, w - x)
            height = min(height + 2 * padding, h - y)
            
            detections.append(BoundingBox(
                x=x,
                y=y,
                width=width,
                height=height,
                confidence=0.9,  # Haar Cascade doesn't provide confidence scores
                detection_type=DetectionType.FACE
            ))
        
        return detections
    
    def detect_license_plates(self, image: np.ndarray) -> List[BoundingBox]:
        """Detect license plates using OpenCV Haar Cascade for cars."""
        detections = []
        
        if not self.car_detector_loaded or self.car_cascade is None:
            # Fallback: return empty if no car detector available
            return detections
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            h, w = image.shape[:2]
            
            # Detect cars/vehicles
            cars = self.car_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=3,
                minSize=(60, 60)
            )
            
            for (x, y, car_width, car_height) in cars:
                # Estimate license plate region (typically lower portion of vehicle)
                # License plate is typically in the lower 30% of the vehicle
                plate_y = int(y + car_height * 0.6)
                plate_height = int(car_height * 0.25)
                plate_x = int(x + car_width * 0.2)
                plate_width = int(car_width * 0.6)
                
                # Ensure coordinates are within bounds
                plate_x = max(0, plate_x)
                plate_y = max(0, plate_y)
                plate_width = min(plate_width, w - plate_x)
                plate_height = min(plate_height, h - plate_y)
                
                if plate_width > 0 and plate_height > 0:
                    detections.append(BoundingBox(
                        x=plate_x,
                        y=plate_y,
                        width=plate_width,
                        height=plate_height,
                        confidence=0.8,
                        detection_type=DetectionType.LICENSE_PLATE
                    ))
        except Exception as e:
            logger.error(f"Error during license plate detection: {e}")
        
        return detections
    
    def detect_all(self, image: np.ndarray, detect_faces: bool = True, 
                   detect_plates: bool = True) -> List[BoundingBox]:
        """Run all detection models on an image."""
        all_detections = []
        
        if detect_faces:
            face_detections = self.detect_faces(image)
            all_detections.extend(face_detections)
            logger.debug(f"Detected {len(face_detections)} faces")
        
        if detect_plates:
            plate_detections = self.detect_license_plates(image)
            all_detections.extend(plate_detections)
            logger.debug(f"Detected {len(plate_detections)} license plates")
        
        return all_detections
    
    @property
    def models_loaded(self) -> bool:
        """Check if all models are loaded."""
        return self.face_detector_loaded


# Singleton instance
detector = PrivacyDetector()
