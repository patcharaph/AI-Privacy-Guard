import cv2
import numpy as np
import os
from typing import List, Tuple
import logging

from app.models.schemas import BoundingBox, DetectionType
from app.core.config import settings

try:
    import mediapipe as mp
except Exception:  # pragma: no cover - optional dependency at runtime
    mp = None

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover - optional dependency at runtime
    YOLO = None

logger = logging.getLogger(__name__)


class PrivacyDetector:
    """Handles face and license plate detection using MediaPipe + YOLO (CPU)."""

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
        self.face_detector_loaded = False
        if mp is None:
            logger.warning("MediaPipe not available, face detection will fall back to Haar Cascade")
            self.face_detector = None
        else:
            try:
                self.face_detector = mp.solutions.face_detection.FaceDetection(
                    model_selection=0,
                    min_detection_confidence=max(0.1, settings.FACE_DETECTION_CONFIDENCE * 0.6),
                )
                self.face_detector_loaded = True
                logger.info("MediaPipe Face Detection loaded successfully")
            except Exception as e:
                self.face_detector = None
                logger.warning(f"Failed to initialize MediaPipe Face Detection: {e}")

        # Fallback Haar Cascade for Face Detection
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        self.face_cascade_loaded = not self.face_cascade.empty()

        # Initialize YOLO for license plate detection
        self.plate_detector_loaded = False
        self.plate_model = None
        if YOLO is None:
            logger.warning("Ultralytics not available, plate detection will fall back to Haar Cascade")
        else:
            try:
                self.plate_model = YOLO(settings.PLATE_YOLO_MODEL)
                self.plate_detector_loaded = True
                logger.info("YOLO license-plate model loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load YOLO plate model: {e}")

        # Fallback OpenCV Haar Cascade for vehicle/car detection (legacy)
        car_cascade_path = cv2.data.haarcascades + "haarcascade_car.xml"
        if os.path.exists(car_cascade_path):
            self.car_cascade = cv2.CascadeClassifier(car_cascade_path)
            self.car_detector_loaded = not self.car_cascade.empty()
        else:
            self.car_cascade = None
            self.car_detector_loaded = False
            logger.warning("Car cascade not available, license plate detection will be limited")

        PrivacyDetector._initialized = True
        logger.info("AI detection models initialized successfully")

    def detect_faces(self, image: np.ndarray, sensitivity: int = 60) -> List[BoundingBox]:
        """Detect faces in an image using MediaPipe (fallback to Haar Cascade)."""
        detections: List[BoundingBox] = []

        h, w = image.shape[:2]
        sensitivity = max(0, min(100, sensitivity))

        # Higher sensitivity => lower threshold, more detections
        min_conf = 0.85 - (sensitivity / 100) * 0.35  # 0.85..0.5
        min_conf = max(0.3, min(0.9, min_conf))

        if self.face_detector_loaded and self.face_detector is not None:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.face_detector.process(rgb)
            if results and results.detections:
                for det in results.detections:
                    score = det.score[0] if det.score else 0
                    if score < min_conf:
                        continue
                    box = det.location_data.relative_bounding_box
                    x = int(box.xmin * w)
                    y = int(box.ymin * h)
                    width = int(box.width * w)
                    height = int(box.height * h)
                    x = max(0, x)
                    y = max(0, y)
                    width = min(width, w - x)
                    height = min(height, h - y)
                    detections.append(BoundingBox(
                        id=f"face_{len(detections)}",
                        x=x,
                        y=y,
                        width=width,
                        height=height,
                        confidence=score,
                        detection_type=DetectionType.FACE,
                        enabled=True
                    ))
            return detections

        # Fallback to Haar Cascade
        if not self.face_cascade_loaded:
            return detections

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        min_face_size = int(30 + (1 - sensitivity / 100) * 30)  # 30..60
        min_neighbors = int(3 + (1 - sensitivity / 100) * 5)  # 3..8
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=min_neighbors,
            minSize=(min_face_size, min_face_size),
            flags=cv2.CASCADE_SCALE_IMAGE
        )

        for (x, y, width, height) in faces:
            detections.append(BoundingBox(
                id=f"face_{len(detections)}",
                x=x,
                y=y,
                width=width,
                height=height,
                confidence=settings.FACE_DETECTION_CONFIDENCE,
                detection_type=DetectionType.FACE,
                enabled=True
            ))

        return detections

    def detect_license_plates(self, image: np.ndarray, sensitivity: int = 60) -> List[BoundingBox]:
        """Detect license plates using YOLO (fallback to Haar Cascade)."""
        detections: List[BoundingBox] = []

        h, w = image.shape[:2]
        sensitivity = max(0, min(100, sensitivity))

        if self.plate_detector_loaded and self.plate_model is not None:
            conf = 0.65 - (sensitivity / 100) * 0.35  # 0.65..0.3
            conf = max(0.2, min(0.8, conf))
            try:
                results = self.plate_model.predict(
                    source=image,
                    conf=conf,
                    verbose=False,
                    device="cpu"
                )
                if results:
                    boxes = results[0].boxes
                    if boxes is not None and boxes.xyxy is not None:
                        for i in range(len(boxes.xyxy)):
                            x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                            x = max(0, int(x1))
                            y = max(0, int(y1))
                            width = min(int(x2 - x1), w - x)
                            height = min(int(y2 - y1), h - y)
                            if width <= 0 or height <= 0:
                                continue
                            score = float(boxes.conf[i]) if boxes.conf is not None else conf
                            detections.append(BoundingBox(
                                id=f"plate_{len(detections)}",
                                x=x,
                                y=y,
                                width=width,
                                height=height,
                                confidence=score,
                                detection_type=DetectionType.LICENSE_PLATE,
                                enabled=True
                            ))
                return detections
            except Exception as e:
                logger.error(f"YOLO plate detection failed: {e}")

        # Fallback to Haar Cascade (legacy)
        if not self.car_detector_loaded or self.car_cascade is None:
            return detections

        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            min_neighbors = int(2 + (1 - sensitivity / 100) * 4)  # 2..6
            min_size = int(50 + (1 - sensitivity / 100) * 40)  # 50..90

            cars = self.car_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=min_neighbors,
                minSize=(min_size, min_size)
            )

            for (x, y, car_width, car_height) in cars:
                plate_y = int(y + car_height * 0.6)
                plate_height = int(car_height * 0.25)
                plate_x = int(x + car_width * 0.2)
                plate_width = int(car_width * 0.6)

                plate_x = max(0, plate_x)
                plate_y = max(0, plate_y)
                plate_width = min(plate_width, w - plate_x)
                plate_height = min(plate_height, h - plate_y)

                if plate_width > 0 and plate_height > 0:
                    detections.append(BoundingBox(
                        id=f"plate_{len(detections)}",
                        x=plate_x,
                        y=plate_y,
                        width=plate_width,
                        height=plate_height,
                        confidence=settings.PLATE_DETECTION_CONFIDENCE,
                        detection_type=DetectionType.LICENSE_PLATE,
                        enabled=True
                    ))
        except Exception as e:
            logger.error(f"Error during license plate detection: {e}")

        return detections

    def detect_all(self, image: np.ndarray, detect_faces: bool = True,
                   detect_plates: bool = True, sensitivity: int = 60) -> List[BoundingBox]:
        """Run all detection models on an image."""
        all_detections: List[BoundingBox] = []

        if detect_faces:
            face_detections = self.detect_faces(image, sensitivity)
            all_detections.extend(face_detections)
            logger.debug(f"Detected {len(face_detections)} faces")

        if detect_plates:
            plate_detections = self.detect_license_plates(image, sensitivity)
            all_detections.extend(plate_detections)
            logger.debug(f"Detected {len(plate_detections)} license plates")

        return all_detections

    @property
    def models_loaded(self) -> bool:
        """Check if core models are loaded."""
        return self.face_detector_loaded


# Singleton instance
detector = PrivacyDetector()
