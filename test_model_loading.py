import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from app.core.config import settings
    print(f"Settings loaded. PLATE_YOLO_MODEL: {settings.PLATE_YOLO_MODEL}")
    print(f"DEBUG_PLATE_DETECTION: {settings.DEBUG_PLATE_DETECTION}")
except ImportError as e:
    print(f"Error importing settings: {e}")

try:
    import ultralytics
    print(f"Ultralytics version: {ultralytics.__version__}")
except ImportError:
    print("Ultralytics not installed!")

model_path = os.path.join('backend', 'yolov8s-license-plate.pt')
if os.path.exists(model_path):
    print(f"Model found at {model_path}")
    try:
        from ultralytics import YOLO
        model = YOLO(model_path)
        print("Model loaded successfully")
        
        # Create a dummy image
        import numpy as np
        import cv2
        img = np.zeros((640, 640, 3), dtype=np.uint8)
        # Draw a white rectangle that looks like a plate
        cv2.rectangle(img, (100, 400), (300, 450), (255, 255, 255), -1)
        
        results = model.predict(source=img, conf=0.1)
        print(f"Prediction run. Results: {len(results)}")
        if results:
             print(f"Boxes: {len(results[0].boxes)}")
             for box in results[0].boxes:
                 print(f"Box: {box.xyxy}, Conf: {box.conf}")

    except Exception as e:
        print(f"Error loading/running model: {e}")
else:
    print(f"Model NOT found at {model_path}")
