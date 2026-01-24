import cv2
import numpy as np
import mediapipe as mp
from ultralytics import YOLO
from typing import List, Tuple
import logging

from app.models.schemas import BoundingBox, DetectionType
from app.core.config import settings

logger = logging.getLogger(__name__)


class PrivacyDetector:
    """Handles face and license plate detection using MediaPipe and YOLOv8."""
    
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
        
        # Initialize MediaPipe Face Detection
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detector = self.mp_face_detection.FaceDetection(
            model_selection=1,  # 0 for short-range, 1 for full-range
            min_detection_confidence=settings.FACE_DETECTION_CONFIDENCE
        )
        
        # Initialize YOLO for license plate detection
        # Using YOLOv8n (nano) for speed - will detect vehicles, then we look for plates
        try:
            self.yolo_model = YOLO(settings.YOLO_MODEL)
            self.yolo_loaded = True
            logger.info("YOLO model loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load YOLO model: {e}. License plate detection will be limited.")
            self.yolo_model = None
            self.yolo_loaded = False
        
        PrivacyDetector._initialized = True
        logger.info("AI detection models initialized successfully")
    
    def detect_faces(self, image: np.ndarray) -> List[BoundingBox]:
        """Detect faces in an image using MediaPipe."""
        detections = []
        
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.face_detector.process(rgb_image)
        
        if results.detections:
            h, w, _ = image.shape
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                
                # Convert relative coordinates to absolute
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                width = int(bbox.width * w)
                height = int(bbox.height * h)
                
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
                    confidence=detection.score[0],
                    detection_type=DetectionType.FACE
                ))
        
        return detections
    
    def detect_license_plates(self, image: np.ndarray) -> List[BoundingBox]:
        """Detect license plates using YOLO."""
        detections = []
        
        if not self.yolo_loaded or self.yolo_model is None:
            return detections
        
        try:
            # Run YOLO detection
            results = self.yolo_model(image, verbose=False)
            
            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue
                
                for box in boxes:
                    # Get class ID - we're looking for cars, trucks, buses, motorcycles
                    cls_id = int(box.cls[0])
                    class_name = self.yolo_model.names[cls_id]
                    
                    # Vehicle classes in COCO dataset
                    vehicle_classes = ['car', 'truck', 'bus', 'motorcycle']
                    
                    if class_name in vehicle_classes:
                        # Get bounding box coordinates
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0])
                        
                        if confidence >= settings.PLATE_DETECTION_CONFIDENCE:
                            # Estimate license plate region (typically lower portion of vehicle)
                            vehicle_width = x2 - x1
                            vehicle_height = y2 - y1
                            
                            # License plate is typically in the lower 30% of the vehicle
                            plate_y = int(y1 + vehicle_height * 0.6)
                            plate_height = int(vehicle_height * 0.25)
                            plate_x = int(x1 + vehicle_width * 0.2)
                            plate_width = int(vehicle_width * 0.6)
                            
                            detections.append(BoundingBox(
                                x=plate_x,
                                y=plate_y,
                                width=plate_width,
                                height=plate_height,
                                confidence=confidence,
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
        return self.face_detector is not None


# Singleton instance
detector = PrivacyDetector()
