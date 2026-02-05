import cv2
import numpy as np
import os
from typing import List
import logging
from pathlib import Path

from app.models.schemas import BoundingBox, DetectionType
from app.core.config import settings

try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
except Exception:  # pragma: no cover - optional dependency at runtime
    FaceAnalysis = None
    INSIGHTFACE_AVAILABLE = False

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover - optional dependency at runtime
    YOLO = None

logger = logging.getLogger(__name__)


class PrivacyDetector:
    """Handles face and license plate detection using RetinaFace + YOLO (CPU)."""

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if PrivacyDetector._initialized:
            return

        logger.info("Initializing PrivacyDetector (models will load lazily)...")
        if settings.DEBUG_PLATE_DETECTION:
            logger.warning("DEBUG_PLATE_DETECTION enabled")

        self.face_detector_loaded = False
        self.face_model = None
        self.face_cascade = None
        self.face_cascade_loaded = False

        self.plate_detector_loaded = False
        self.plate_model = None
        self.car_cascade = None
        self.car_detector_loaded = False

        PrivacyDetector._initialized = True

    def _load_models(self):
        """Load models if they haven't been loaded yet."""
        if self.models_loaded:
            return

        logger.info("Loading AI detection models...")
        
        # RetinaFace via insightface FaceAnalysis
        if not INSIGHTFACE_AVAILABLE:
            logger.warning("InsightFace not available, face detection will fall back to Haar Cascade")
        else:
            try:
                self.face_model = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
                self.face_model.prepare(ctx_id=0, det_size=(640, 640))
                self.face_detector_loaded = True
                logger.info("InsightFace FaceAnalysis loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load InsightFace model: {e}")

        # Fallback Haar Cascade for Face Detection
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        self.face_cascade_loaded = not self.face_cascade.empty()

        # YOLOv8s for license plate detection
        if YOLO is None:
            logger.warning("Ultralytics not available, plate detection will fall back to Haar Cascade")
        else:
            try:
                plate_model_path = self._resolve_model_path(settings.PLATE_YOLO_MODEL)
                if settings.DEBUG_PLATE_DETECTION:
                    logger.warning("Plate YOLO model path resolved to: %s", plate_model_path)
                if not Path(plate_model_path).exists():
                    logger.warning(
                        "YOLO plate model file not found at %s (cwd=%s)",
                        plate_model_path,
                        os.getcwd()
                    )
                else:
                    self.plate_model = YOLO(plate_model_path)
                    self.plate_detector_loaded = True
                    if settings.DEBUG_PLATE_DETECTION:
                        logger.warning("YOLO license-plate model loaded successfully")
                    else:
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

        logger.info("AI detection models loaded successfully")

    def detect_faces(self, image: np.ndarray, sensitivity: int = 60) -> List[BoundingBox]:
        """Detect faces using RetinaFace (fallback to Haar Cascade)."""
        self._load_models()
        detections: List[BoundingBox] = []

        h, w = image.shape[:2]
        sensitivity = max(0, min(100, sensitivity))

        # Higher sensitivity => lower threshold, more detections
        min_conf = 0.85 - (sensitivity / 100) * 0.35  # 0.85..0.5
        min_conf = max(0.3, min(0.9, min_conf))

        if self.face_detector_loaded and self.face_model is not None:
            try:
                faces = self.face_model.get(image)
                for face in faces:
                    score = float(face.det_score) if hasattr(face, 'det_score') else min_conf
                    if score < min_conf:
                        continue
                    bbox = face.bbox.astype(int)
                    x1, y1, x2, y2 = bbox
                    x1c = max(0, int(x1))
                    y1c = max(0, int(y1))
                    x2c = min(w, int(x2))
                    y2c = min(h, int(y2))
                    width = x2c - x1c
                    height = y2c - y1c
                    if width <= 0 or height <= 0:
                        continue
                    detections.append(BoundingBox(
                        id=f"face_{len(detections)}",
                        x=x1c,
                        y=y1c,
                        width=width,
                        height=height,
                        confidence=float(score),
                        detection_type=DetectionType.FACE,
                        enabled=True
                    ))
                return detections
            except Exception as e:
                logger.error(f"InsightFace detection failed: {e}")

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
        """Detect license plates using YOLOv8s (fallback to Haar Cascade)."""
        self._load_models()
        detections: List[BoundingBox] = []

        h, w = image.shape[:2]
        sensitivity = max(0, min(100, sensitivity))

        if self.plate_detector_loaded and self.plate_model is not None:
            conf = 0.7 - (sensitivity / 100) * 0.3  # 0.7..0.4
            conf = max(settings.PLATE_MIN_CONFIDENCE, min(0.9, conf))
            try:
                results = self.plate_model.predict(
                    source=image,
                    conf=conf,
                    imgsz=settings.PLATE_YOLO_IMGSZ,
                    verbose=False,
                    device="cpu"
                )
                if results:
                    boxes = results[0].boxes
                    if settings.DEBUG_PLATE_DETECTION:
                        count = 0 if boxes is None or boxes.xyxy is None else len(boxes.xyxy)
                        logger.info(
                            "Plate YOLO raw boxes: %s (conf=%.2f imgsz=%d)",
                            count,
                            conf,
                            settings.PLATE_YOLO_IMGSZ
                        )
                    if boxes is not None and boxes.xyxy is not None:
                        for i in range(len(boxes.xyxy)):
                            x1, y1, x2, y2 = boxes.xyxy[i].tolist()
                            x1c = max(0, int(x1))
                            y1c = max(0, int(y1))
                            x2c = min(w, int(x2))
                            y2c = min(h, int(y2))
                            width = x2c - x1c
                            height = y2c - y1c
                            if width <= 0 or height <= 0:
                                continue
                            score = float(boxes.conf[i]) if boxes.conf is not None else conf
                            if score < settings.PLATE_MIN_CONFIDENCE:
                                if settings.DEBUG_PLATE_DETECTION:
                                    logger.info(
                                        "Plate reject: low_conf score=%.3f min=%.3f",
                                        score,
                                        settings.PLATE_MIN_CONFIDENCE
                                    )
                                continue
                            if settings.PLATE_FILTER_BY_ASPECT:
                                aspect = width / height if height > 0 else 0
                                if aspect < settings.PLATE_MIN_ASPECT or aspect > settings.PLATE_MAX_ASPECT:
                                    if settings.DEBUG_PLATE_DETECTION:
                                        logger.info(
                                            "Plate reject: aspect=%.2f range=[%.2f, %.2f]",
                                            aspect,
                                            settings.PLATE_MIN_ASPECT,
                                            settings.PLATE_MAX_ASPECT
                                        )
                                    continue
                            if settings.PLATE_FILTER_BY_Y_FRAC:
                                center_y = y1c + height / 2
                                if center_y < h * settings.PLATE_MIN_Y_FRAC:
                                    if settings.DEBUG_PLATE_DETECTION:
                                        logger.info(
                                            "Plate reject: center_y=%.1f min_y=%.1f",
                                            center_y,
                                            h * settings.PLATE_MIN_Y_FRAC
                                        )
                                    continue
                            # Filter oversized boxes (likely detecting cars, not plates)
                            if settings.PLATE_FILTER_BY_SIZE:
                                width_ratio = width / w
                                height_ratio = height / h
                                if width_ratio > settings.PLATE_MAX_WIDTH_RATIO or height_ratio > settings.PLATE_MAX_HEIGHT_RATIO:
                                    if settings.DEBUG_PLATE_DETECTION:
                                        logger.info(
                                            "Plate reject: oversized w_ratio=%.2f (max=%.2f) h_ratio=%.2f (max=%.2f)",
                                            width_ratio,
                                            settings.PLATE_MAX_WIDTH_RATIO,
                                            height_ratio, 
                                            settings.PLATE_MAX_HEIGHT_RATIO
                                        )
                                    continue
                            # Apply shrink ratio to reduce oversized bounding box
                            shrink = settings.PLATE_SHRINK_RATIO
                            if shrink > 0:
                                shrink_w = int(width * shrink)
                                shrink_h = int(height * shrink)
                                x1c = x1c + shrink_w
                                y1c = y1c + shrink_h
                                width = width - 2 * shrink_w
                                height = height - 2 * shrink_h
                                if width <= 0 or height <= 0:
                                    continue
                            detections.append(BoundingBox(
                                id=f"plate_{len(detections)}",
                                x=x1c,
                                y=y1c,
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

    def _resolve_model_path(self, model_path: str) -> str:
        path = Path(model_path)
        if path.is_absolute():
            return str(path)
        if path.exists():
            return str(path)
        backend_root = Path(__file__).resolve().parents[2]
        return str(backend_root / path)

    @property
    def models_loaded(self) -> bool:
        """Check if core models are loaded."""
        return self.face_detector_loaded and self.plate_detector_loaded


# Singleton instance
detector = PrivacyDetector()
