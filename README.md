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

- ✅ Images are processed temporarily only
- ✅ Images are NOT stored permanently
- ✅ Images are NOT used for training without explicit consent
- ✅ All processing happens server-side with immediate cleanup

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process` | Process images with blur |
| POST | `/api/feedback` | Submit missed detection feedback |
| GET | `/api/health` | Health check |

## Rate Limits

- Max 10 images per batch
- Max 5 batches per IP per day (configurable)

## License

MIT License - For BETA evaluation purposes only.
