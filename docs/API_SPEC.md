# AI Privacy Guard - API Specification

## Base URL

- Development: `http://localhost:8000`
- Production: `https://api.your-domain.com`

## Authentication

No authentication required for BETA version.

## Rate Limiting

- **Max images per batch**: 10
- **Max batches per IP per day**: 5

Rate limit exceeded returns HTTP 429:
```json
{
  "detail": "Rate limit exceeded. Maximum 5 batches per day."
}
```

---

## Endpoints

### 1. Process Images

**POST** `/api/process`

Process uploaded images with privacy blur.

#### Request

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| files | File[] | Yes | Image files (JPG, PNG, WEBP) |
| blur_mode | string | No | `gaussian`, `pixelation`, `emoji` (default: `gaussian`) |
| blur_intensity | int | No | 0-100 (default: 80) |
| detect_faces | bool | No | Enable face detection (default: true) |
| detect_plates | bool | No | Enable plate detection (default: true) |

#### Example Request (cURL)

```bash
curl -X POST "http://localhost:8000/api/process" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.png" \
  -F "blur_mode=gaussian" \
  -F "blur_intensity=80" \
  -F "detect_faces=true" \
  -F "detect_plates=true"
```

#### Success Response (200)

```json
{
  "success": true,
  "message": "Successfully processed 2 image(s)",
  "results": [
    {
      "image_id": "a1b2c3d4",
      "original_filename": "photo1.jpg",
      "processed_image_base64": "data:image/png;base64,iVBORw0KGgo...",
      "detections": [
        {
          "x": 120,
          "y": 80,
          "width": 180,
          "height": 220,
          "confidence": 0.97,
          "detection_type": "face"
        }
      ],
      "processing_time_ms": 156.32
    }
  ],
  "total_processing_time_ms": 312.45,
  "images_processed": 2,
  "total_detections": 3
}
```

#### Error Responses

| Code | Description |
|------|-------------|
| 400 | Invalid request (no files, invalid format, too many files) |
| 429 | Rate limit exceeded |
| 500 | Processing error |

---

### 2. Submit Feedback

**POST** `/api/feedback`

Report missed detections to improve AI accuracy.

#### Request Body

```json
{
  "missed_type": "face",
  "comment": "There's a face in the background that wasn't detected",
  "image_id": "a1b2c3d4"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| missed_type | string | Yes | `face` or `license_plate` |
| comment | string | No | Additional details (max 500 chars) |
| image_id | string | No | Reference to processed image |

#### Success Response (200)

```json
{
  "success": true,
  "message": "Thank you for your feedback! This helps improve our detection accuracy.",
  "feedback_id": "fb12345"
}
```

---

### 3. Health Check

**GET** `/api/health`

Check API status and model availability.

#### Success Response (200)

```json
{
  "status": "healthy",
  "version": "0.1.0-beta",
  "models_loaded": true
}
```

---

### 4. Statistics (Internal)

**GET** `/api/stats`

Get basic statistics for BETA evaluation.

#### Success Response (200)

```json
{
  "total_feedback_count": 42,
  "feedback_by_type": {
    "face": 28,
    "license_plate": 14
  },
  "rate_limit_store_size": 15
}
```

---

## Data Models

### BoundingBox

```typescript
interface BoundingBox {
  x: number;           // Left coordinate
  y: number;           // Top coordinate
  width: number;       // Box width
  height: number;      // Box height
  confidence: number;  // 0.0 - 1.0
  detection_type: "face" | "license_plate";
}
```

### ProcessedImageResult

```typescript
interface ProcessedImageResult {
  image_id: string;
  original_filename: string;
  processed_image_base64: string;  // data:image/png;base64,...
  detections: BoundingBox[];
  processing_time_ms: number;
}
```

### ProcessingResponse

```typescript
interface ProcessingResponse {
  success: boolean;
  message: string;
  results: ProcessedImageResult[];
  total_processing_time_ms: number;
  images_processed: number;
  total_detections: number;
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| 400 | Bad Request - Invalid input |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## CORS

Allowed origins (configurable):
- `http://localhost:3000`
- `http://127.0.0.1:3000`

All methods and headers are allowed for development.
