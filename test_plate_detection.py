"""ทดสอบโมเดล YOLO สำหรับ detect ป้ายทะเบียน"""
import sys
import os

# เพิ่ม backend path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

import cv2
import numpy as np

# ตั้งค่า env ก่อน import config
os.environ['DEBUG_PLATE_DETECTION'] = 'true'
os.environ['PLATE_FILTER_BY_ASPECT'] = 'false'
os.environ['PLATE_FILTER_BY_Y_FRAC'] = 'false'

from ultralytics import YOLO

def test_plate_detection(image_path: str, model_path: str = 'backend/yolov8s-license-plate.pt'):
    """ทดสอบการ detect ป้ายทะเบียน"""
    print(f"\n{'='*60}")
    print(f"ทดสอบ: {image_path}")
    print(f"โมเดล: {model_path}")
    print(f"{'='*60}\n")
    
    # ตรวจสอบไฟล์
    if not os.path.exists(image_path):
        print(f"❌ ไม่พบไฟล์ภาพ: {image_path}")
        return
    
    if not os.path.exists(model_path):
        print(f"❌ ไม่พบโมเดล: {model_path}")
        return
    
    # โหลดภาพ
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ ไม่สามารถอ่านภาพได้")
        return
    
    h, w = img.shape[:2]
    print(f"📐 ขนาดภาพ: {w}x{h} pixels")
    
    # โหลดโมเดล
    print(f"\n🔄 กำลังโหลดโมเดล...")
    model = YOLO(model_path)
    print(f"✅ โหลดโมเดลสำเร็จ")
    
    # รัน prediction ด้วย confidence ต่างๆ
    for conf in [0.1, 0.2, 0.3, 0.5]:
        print(f"\n--- Confidence threshold: {conf} ---")
        results = model.predict(
            source=img,
            conf=conf,
            imgsz=1280,
            verbose=False,
            device='cpu'
        )
        
        if results and len(results) > 0:
            boxes = results[0].boxes
            if boxes is not None and len(boxes.xyxy) > 0:
                print(f"✅ พบ {len(boxes.xyxy)} ป้ายทะเบียน:")
                for i, (xyxy, conf_score) in enumerate(zip(boxes.xyxy, boxes.conf)):
                    x1, y1, x2, y2 = xyxy.tolist()
                    width = x2 - x1
                    height = y2 - y1
                    aspect = width / height if height > 0 else 0
                    center_y = y1 + height / 2
                    y_frac = center_y / h
                    print(f"   [{i+1}] conf={conf_score:.3f} | pos=({int(x1)},{int(y1)}) | size={int(width)}x{int(height)} | aspect={aspect:.2f} | y_frac={y_frac:.2f}")
            else:
                print(f"❌ ไม่พบป้ายทะเบียน")
        else:
            print(f"❌ ไม่มีผลลัพธ์")
    
    print(f"\n{'='*60}")
    print("การทดสอบเสร็จสิ้น")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    # ใช้ภาพทดสอบ
    test_image = r"C:\Users\patchara\.gemini\antigravity\brain\a20e026e-279c-4477-88b7-c230d8079612\uploaded_media_1769930543632.jpg"
    test_plate_detection(test_image)
