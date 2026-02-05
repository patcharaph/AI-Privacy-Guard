# AI Privacy Guard - BETA

A single-page web application that automatically blurs faces and license plates in images to protect privacy.

## Features

- **Image Upload**: Drag & drop or click to browse (JPG, PNG, WEBP up to 10MB, max 10 images per batch)
- **Auto Detection & Blur**: Automatically detects and blurs human faces and vehicle license plates
- **Multiple Blur Modes**: Gaussian blur, pixelation, and emoji overlay
- **Blur Intensity Control**: Adjustable slider (0-100%)
- **Result Preview**: Toggle between original and protected images
- **Batch Download**: Download individual images or all as ZIP

## Tech Stack

### Frontend
- Next.js 15 (React 19)
- Tailwind CSS
- TanStack Query (React Query)
- Lucide React icons

### Backend
- FastAPI (Python 3.12+)
- MediaPipe (face detection)
- YOLOv8-tiny (license plate detection)
- OpenCV (image processing)

## Project Structure

```
AI-Privacy-Guard/
├── frontend/          # Next.js frontend application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/ # React components
│   │   └── lib/       # Utilities and API client
│   └── package.json
├── backend/           # FastAPI backend application
│   ├── app/
│   │   ├── api/       # API routes
│   │   ├── core/      # Core configurations
│   │   ├── models/    # Pydantic models
│   │   └── services/  # AI detection services
│   ├── requirements.txt
│   └── main.py
└── README.md
```

## Quick Start

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
```

Backend runs at: http://localhost:8000

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

## Privacy & Trust

- ? Images are processed temporarily only
- ? Images are NOT stored permanently
- ? Images are NOT used for training without explicit consent
- ? All processing happens server-side with immediate cleanup

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process` | Process images with blur |
| POST | `/api/feedback` | Submit missed detection feedback |
| GET | `/api/health` | Health check |

## Rate Limits

- Max 10 images per batch
- Max 5 batches per IP per day (configurable)

## Architecture

```mermaid
graph LR
    User[User / Browser] -->|HTTPS| Frontend[Frontend (Vercel)]
    Frontend -->|API Requests| Backend[Backend (Cloud Run)]
    Backend -->|Model Inference| AI[AI Models (YOLO/Face)]
```

## Deployment

### Frontend (Vercel) - Recommended

The frontend is optimized for **Vercel**.

1. Import this repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Next.js`.
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Your Cloud Run Backend URL (e.g., `https://...run.app`)
5. Deploy! 🚀

### Backend (Google Cloud Run) - Recommended

The backend is containerized and optimized for Google Cloud Run deployment (Docker).

```bash
cd backend

# Build and deploy to Cloud Run
gcloud run deploy ai-privacy-guard-backend \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080
```

**Recommended specs:**
- **Runtime**: Docker (mandatory for OpenCV/System dependencies)
- **vCPU**: 2 cores (for AI inference)
- **Memory**: 4 GB (for model loading)
- **Region**: asia-southeast1 (Singapore)
- **Startup CPU Boost**: Enabled (recommended for faster cold starts)

### Local Docker
```bash
cd backend
docker build -t ai-privacy-guard-backend .
docker run -p 8080:8080 ai-privacy-guard-backend
```

## License

MIT License - For BETA evaluation purposes only.
