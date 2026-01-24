# AI Privacy Guard - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                             │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Next.js 15 Frontend                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  ││
│  │  │ Upload Zone  │  │ Control Panel│  │   Preview Panel      │  ││
│  │  │ (Drag/Drop)  │  │ (Blur Mode)  │  │   (Results/Download) │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  ││
│  │                           │                                      ││
│  │                    TanStack Query                                ││
│  │                    (State Management)                            ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/REST (multipart/form-data)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FastAPI Backend (Python)                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                        API Layer                                 ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  ││
│  │  │ /api/process │  │ /api/feedback│  │   /api/health        │  ││
│  │  │ (POST)       │  │ (POST)       │  │   (GET)              │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      Service Layer                               ││
│  │  ┌──────────────────────────────────────────────────────────┐   ││
│  │  │                  Image Processor                          │   ││
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   ││
│  │  │  │  Detector   │  │   Blur      │  │   Encoder       │   │   ││
│  │  │  │  (AI)       │  │  Processor  │  │   (Base64)      │   │   ││
│  │  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   ││
│  │  └──────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      AI Models                                   ││
│  │  ┌──────────────────────┐  ┌────────────────────────────────┐  ││
│  │  │   MediaPipe          │  │   YOLOv8-nano                  │  ││
│  │  │   (Face Detection)   │  │   (Vehicle → License Plate)    │  ││
│  │  └──────────────────────┘  └────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend (Next.js 15)

| Component | Purpose |
|-----------|---------|
| `UploadZone` | Drag & drop file upload with validation |
| `ControlPanel` | Blur mode, intensity, detection toggles |
| `PreviewPanel` | Display results, toggle original/protected |
| `FeedbackModal` | Report missed detections |

### Backend (FastAPI)

| Module | Purpose |
|--------|---------|
| `routes.py` | API endpoints and request handling |
| `detector.py` | AI model management (MediaPipe + YOLO) |
| `blur_processor.py` | Gaussian, pixelation, emoji overlay |
| `image_processor.py` | Orchestration of detection + blur |

## API Endpoints

### POST /api/process

Process images with privacy blur.

**Request:**
- Content-Type: `multipart/form-data`
- `files`: Image files (max 10, each max 10MB)
- `blur_mode`: `gaussian` | `pixelation` | `emoji`
- `blur_intensity`: 0-100
- `detect_faces`: boolean
- `detect_plates`: boolean

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 3 image(s)",
  "results": [
    {
      "image_id": "abc12345",
      "original_filename": "photo.jpg",
      "processed_image_base64": "data:image/png;base64,...",
      "detections": [
        {
          "x": 100,
          "y": 50,
          "width": 200,
          "height": 250,
          "confidence": 0.95,
          "detection_type": "face"
        }
      ],
      "processing_time_ms": 234.5
    }
  ],
  "total_processing_time_ms": 1234.5,
  "images_processed": 3,
  "total_detections": 5
}
```

### POST /api/feedback

Submit feedback for missed detections.

**Request:**
```json
{
  "missed_type": "face" | "license_plate",
  "comment": "Optional description",
  "image_id": "abc12345"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "feedback_id": "fb123456"
}
```

### GET /api/health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0-beta",
  "models_loaded": true
}
```

## AI Inference Flow

```
1. Image Upload
   └── Validate format (JPG/PNG/WEBP) and size (<10MB)

2. Decode Image
   └── Convert bytes to OpenCV numpy array (BGR)

3. Face Detection (MediaPipe)
   ├── Convert BGR → RGB
   ├── Run face detection model
   └── Extract bounding boxes with confidence scores

4. License Plate Detection (YOLOv8)
   ├── Run vehicle detection (car, truck, bus, motorcycle)
   ├── For each vehicle, estimate plate region
   └── Return bounding boxes for plate areas

5. Apply Blur
   ├── Gaussian: cv2.GaussianBlur with intensity-based kernel
   ├── Pixelation: Resize down then up with INTER_NEAREST
   └── Emoji: Draw colored overlay with face/lock icons

6. Encode Result
   ├── Convert BGR → RGB
   ├── Encode as PNG
   └── Return as base64 data URL

7. Return Response
   └── JSON with processed images and detection metadata
```

## Privacy Handling

### Data Flow
1. **Upload**: Images sent via HTTPS to backend
2. **Processing**: Images held in memory only during processing
3. **Response**: Processed images returned as base64 in response
4. **Cleanup**: No persistent storage - images discarded after response

### Privacy Guarantees
- ✅ No images stored on disk
- ✅ No images saved to database
- ✅ No images used for model training (without consent)
- ✅ Processing happens server-side (no client-side model)
- ✅ HTTPS encryption in transit

### Rate Limiting
- Max 10 images per batch
- Max 5 batches per IP per day (configurable)
- Prevents abuse and controls server costs

## Deployment Considerations

### Development
```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py

# Frontend
cd frontend
npm install
npm run dev
```

### Production
- Backend: Deploy to cloud (AWS, GCP, Azure) with GPU for faster inference
- Frontend: Deploy to Vercel/Netlify
- Consider adding Redis for rate limiting persistence
- Add PostgreSQL for feedback storage
