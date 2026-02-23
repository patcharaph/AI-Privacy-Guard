# Architecture Decision Records (ADR)

> AI Privacy Guard - บันทึกการตัดสินใจทางสถาปัตยกรรม

---

## ADR-001: เลือก Next.js 15 เป็น Frontend Framework

**สถานะ:** ยอมรับ (Accepted)
**วันที่:** 2024-12

### บริบท (Context)

ต้องการ frontend framework ที่รองรับ:
- Server-Side Rendering (SSR) สำหรับ SEO และ performance
- App Router สำหรับ file-based routing
- TypeScript first-class support
- PWA capabilities สำหรับ mobile experience
- Deploy ไปยัง Vercel ได้ง่าย

### ทางเลือกที่พิจารณา (Options Considered)

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **Next.js 15** | SSR/SSG, App Router, Vercel integration, React 19 | Bundle size ใหญ่กว่า SPA |
| Vite + React | เร็ว, เบา | ไม่มี SSR built-in |
| Remix | Full-stack, nested routes | ecosystem เล็กกว่า |
| Astro | เบามาก, content-focused | ไม่เหมาะกับ interactive app |

### การตัดสินใจ (Decision)

เลือก **Next.js 15 + React 19** เพราะ:
- App Router รองรับ layout ซ้อนกันได้ดี
- Vercel deployment แบบ zero-config
- TanStack Query ทำงานร่วมกันได้ดีสำหรับ server state management
- PWA manifest support ผ่าน `public/manifest.json`
- Community ใหญ่ มี resource เยอะ

### ผลกระทบ (Consequences)

- **เชิงบวก:** Deploy ง่ายผ่าน Vercel, SEO ดี, DX ดี
- **เชิงลบ:** ต้องพึ่ง Vercel ecosystem, bundle size ใหญ่กว่า SPA ธรรมดา
- **ความเสี่ยง:** Major version upgrade อาจมี breaking changes

---

## ADR-002: เลือก FastAPI เป็น Backend Framework

**สถานะ:** ยอมรับ (Accepted)
**วันที่:** 2024-12

### บริบท (Context)

Backend ต้อง:
- รองรับ file upload (multipart/form-data)
- ประมวลผลภาพด้วย AI model (OpenCV, MediaPipe, YOLO)
- Async I/O สำหรับ concurrent requests
- Auto-generated API docs (Swagger/OpenAPI)
- Integrate กับ Python ML ecosystem ได้สะดวก

### ทางเลือกที่พิจารณา (Options Considered)

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **FastAPI** | Async, auto docs, Pydantic validation, Python ML ecosystem | Single language (Python) |
| Flask | เรียบง่าย, mature | ไม่มี async built-in, ไม่มี auto validation |
| Express.js (Node) | JavaScript full-stack | ML library support จำกัด |
| Django REST | batteries-included | หนักเกินไปสำหรับ API-only |

### การตัดสินใจ (Decision)

เลือก **FastAPI** เพราะ:
- Python เป็นภาษาหลักของ ML/AI ecosystem (OpenCV, MediaPipe, Ultralytics)
- Async support ผ่าน `asyncio` + `aiofiles` สำหรับ file handling
- Pydantic v2 สำหรับ request/response validation
- Auto-generated OpenAPI docs ที่ `/docs`
- Uvicorn ASGI server รองรับ high concurrency

### ผลกระทบ (Consequences)

- **เชิงบวก:** ML integration ง่าย, API docs อัตโนมัติ, type safety ด้วย Pydantic
- **เชิงลบ:** Python GIL อาจเป็น bottleneck สำหรับ CPU-intensive tasks
- **การบรรเทา:** ใช้ async I/O + พิจารณา worker processes ใน production

---

## ADR-003: เลือก MediaPipe + YOLOv8 สำหรับ AI Detection

**สถานะ:** ยอมรับ (Accepted)
**วันที่:** 2024-12

### บริบท (Context)

ระบบต้องตรวจจับ 2 ประเภท:
1. **ใบหน้า (Faces)** - ความแม่นยำสูง, หลายใบหน้าในรูปเดียว
2. **ป้ายทะเบียน (License Plates)** - รองรับป้ายไทยและสากล

ต้องทำงานบน CPU ได้ (ไม่ต้องการ GPU) เพื่อลดต้นทุน deployment

### ทางเลือกที่พิจารณา (Options Considered)

**Face Detection:**

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **MediaPipe (InsightFace RetinaFace)** | แม่นยำสูง, CPU-friendly | ต้อง compile Cython |
| OpenCV Haar Cascade | เบา, ไม่ต้อง download | แม่นยำต่ำ, ไม่ทนต่อมุมเอียง |
| MTCNN | แม่นยำดี | ช้ากว่า MediaPipe |
| dlib HOG/CNN | เสถียร | ช้า, ต้อง compile |

**License Plate Detection:**

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **YOLOv8 Fine-tuned** | แม่นยำสูง, real-time | ต้อง fine-tune เอง (~40MB model) |
| OpenALPR | OCR + detection | license cost, ไม่ free |
| Tesseract OCR | free | ต้องตรวจจับ plate ก่อน |
| Haar Cascade (vehicle) | เบา | แม่นยำต่ำมาก |

### การตัดสินใจ (Decision)

- **Face Detection:** MediaPipe RetinaFace (ผ่าน InsightFace `buffalo_sc`) เป็น primary, Haar Cascade เป็น fallback
- **License Plate:** YOLOv8s fine-tuned model (`license-plate-finetune-v1m.pt`) เป็น primary, Haar Cascade vehicle detection เป็น fallback
- ใช้ **Singleton Pattern** สำหรับ model loading เพื่อประหยัด memory
- ใช้ **Lazy Loading** โหลด model เมื่อ request แรกเข้ามา

### ผลกระทบ (Consequences)

- **เชิงบวก:** แม่นยำสูงทั้ง face + plate, CPU-compatible, มี fallback
- **เชิงลบ:** Cold start ช้า (โหลด model ครั้งแรก ~5-10 วินาที), model file ~40MB
- **การบรรเทา:** Lazy loading + min-instances=1 ใน production

---

## ADR-004: Privacy-First Architecture — ไม่เก็บรูปภาพ

**สถานะ:** ยอมรับ (Accepted)
**วันที่:** 2024-12

### บริบท (Context)

แอปจัดการข้อมูลส่วนบุคคล (ใบหน้า, ป้ายทะเบียน) ต้องมีนโยบายความเป็นส่วนตัวที่เข้มงวด:
- ผู้ใช้ต้องเชื่อมั่นว่ารูปภาพจะไม่ถูกเก็บ
- ต้องปฏิบัติตาม PDPA/GDPR principles
- ลด liability จากการเก็บข้อมูลส่วนบุคคล

### ทางเลือกที่พิจารณา (Options Considered)

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **In-memory processing only** | Privacy สูงสุด, ไม่มี data leak risk | ไม่มี cache, process ซ้ำทุกครั้ง |
| S3/Cloud Storage + TTL | Cache ได้, download ภายหลัง | ต้อง manage storage, data leak risk |
| Client-side processing | ไม่ส่งข้อมูลออก | ต้องส่ง model ไป client (~100MB+) |

### การตัดสินใจ (Decision)

เลือก **In-memory processing only**:

```
Upload → Decode (memory) → Detect (memory) → Blur (memory) → Encode base64 → Response → Discard
```

- ไม่เขียน image ลง disk เลย
- ไม่เก็บ image ใน database
- ไม่ใช้ temporary files
- Response เป็น base64 ใน JSON body
- หลัง response ส่งแล้ว image ถูก garbage collected

### ผลกระทบ (Consequences)

- **เชิงบวก:** Privacy สูงสุด, ไม่ต้อง manage storage, ลด PDPA/GDPR liability, สร้างความเชื่อมั่นต่อผู้ใช้
- **เชิงลบ:** Memory usage สูงขณะ process (โดยเฉพาะ batch 10 รูป), ไม่มี caching, base64 response ใหญ่กว่า binary ~33%
- **การบรรเทา:** จำกัด max 10 files/batch, max 10MB/file, rate limiting 5 batches/day

---

## ADR-005: เลือก Base64 สำหรับส่งภาพกลับไป Client

**สถานะ:** ยอมรับ (Accepted)
**วันที่:** 2024-12

### บริบท (Context)

ต้องส่งภาพที่ processed แล้วกลับไปยัง client พร้อม metadata (detection boxes, processing time)

### ทางเลือกที่พิจารณา (Options Considered)

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **Base64 ใน JSON** | Atomic response, ไม่ต้อง manage file URL | Response body ใหญ่ +33% |
| Presigned URL (S3) | ขนาดเล็ก, download แยก | ต้อง store image ชั่วคราว, ขัด privacy policy |
| Multipart response | ประหยัด bandwidth | ซับซ้อนฝั่ง client |
| WebSocket stream | Real-time | Over-engineering สำหรับ use case นี้ |

### การตัดสินใจ (Decision)

เลือก **Base64 encoding ใน JSON response** เพราะ:
- สอดคล้องกับ ADR-004 (ไม่เก็บรูปบน server)
- Client ใช้ `<img src="data:image/png;base64,...">` ได้ทันที
- Atomic response — image + metadata มาพร้อมกันใน request เดียว
- ง่ายต่อการ download ทั้ง individual และ batch (ZIP)

### ผลกระทบ (Consequences)

- **เชิงบวก:** Simple implementation, privacy-compliant, no storage needed
- **เชิงลบ:** Payload size +33%, high memory usage, ไม่เหมาะกับ image ใหญ่มาก
- **การบรรเทา:** จำกัดขนาดไฟล์ 10MB, compress เป็น PNG quality 95

---

## ADR-006: ใช้ In-Memory Rate Limiting แทน Redis

**สถานะ:** ยอมรับ (Accepted) — พิจารณาเปลี่ยนใน Production
**วันที่:** 2024-12

### บริบท (Context)

ต้องจำกัดจำนวน request เพื่อ:
- ป้องกัน abuse
- ควบคุม server cost (AI inference ใช้ resource สูง)
- ให้บริการผู้ใช้ทุกคนอย่างเท่าเทียม

### ทางเลือกที่พิจารณา (Options Considered)

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **In-memory dict** | ง่าย, ไม่มี dependency เพิ่ม | Reset เมื่อ restart, ไม่ share ข้าม instance |
| Redis | Persistent, share ได้, TTL built-in | เพิ่ม infra cost + complexity |
| Database-backed | Persistent | Slow, overkill |
| API Gateway (Cloud) | Managed | Vendor lock-in |

### การตัดสินใจ (Decision)

เลือก **In-memory Python dict** สำหรับ BETA:
- Rate limit: 5 batches/IP/day
- Quota request: ขอเพิ่ม 5 batches ผ่าน email (1 ครั้ง/email)
- Reset เมื่อ server restart (ยอมรับได้สำหรับ BETA)

### ผลกระทบ (Consequences)

- **เชิงบวก:** Zero additional infrastructure, simple implementation
- **เชิงลบ:** Rate limit reset เมื่อ deploy ใหม่, ไม่ work กับ multiple instances
- **แผนอนาคต:** เปลี่ยนเป็น Redis เมื่อ scale เกิน 1 instance

---

## ADR-007: ใช้ CSV Logging แทน Database

**สถานะ:** ยอมรับ (Accepted) — พิจารณาเปลี่ยนใน Production
**วันที่:** 2024-12

### บริบท (Context)

ต้องเก็บ feedback (missed detections) และ quota requests สำหรับ analytics

### ทางเลือกที่พิจารณา (Options Considered)

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **CSV files** | ง่าย, ไม่มี dependency | ไม่ scale, ไม่มี query, concurrent write issues |
| PostgreSQL | Robust, queryable | ต้อง manage DB, migration |
| SQLite | Embedded, SQL | Limited concurrency |
| MongoDB | Flexible schema | ต้อง manage, overkill |

### การตัดสินใจ (Decision)

เลือก **CSV logging** ใน `backend/logs/` สำหรับ BETA:
- `feedback.csv` — missed detection reports
- `quota_requests.csv` — extra quota requests

### ผลกระทบ (Consequences)

- **เชิงบวก:** Zero setup, human-readable, easy to export
- **เชิงลบ:** ไม่ scale, data loss เมื่อ redeploy (stateless container)
- **แผนอนาคต:** Migrate เป็น PostgreSQL + Redis เมื่อออก production

---

## ADR-008: เลือก Deployment Architecture — Vercel + Cloud Run

**สถานะ:** ยอมรับ (Accepted)
**วันที่:** 2024-12

### บริบท (Context)

ต้องการ deployment ที่:
- Cost-effective (scale to zero)
- รองรับ Docker สำหรับ backend (ML dependencies)
- CI/CD อัตโนมัติ
- CDN สำหรับ frontend
- Region ใกล้ผู้ใช้ (Southeast Asia)

### ทางเลือกที่พิจารณา (Options Considered)

**Frontend:**

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **Vercel** | Next.js native, zero-config, CDN | Free tier limits |
| Netlify | ดี, มี functions | Next.js support ไม่ดีเท่า Vercel |
| AWS Amplify | AWS ecosystem | Setup ซับซ้อน |

**Backend:**

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **Google Cloud Run** | Scale to zero, Docker native, asia-southeast1 | Cold start |
| Render | ง่าย, Docker | Free tier จำกัด, region ไกล |
| AWS ECS/Fargate | Flexible | Setup ซับซ้อน, cost สูง |
| Railway | ง่ายมาก | Limited regions |

### การตัดสินใจ (Decision)

- **Frontend:** Vercel — zero-config Next.js deployment
- **Backend:** Google Cloud Run (primary), Render (alternative)
  - Memory: 4GB (สำหรับ ML model loading)
  - CPU: 2 vCPU
  - Region: `asia-southeast1` (Singapore)
  - Scale: 0-10 instances
- **Mobile:** Android TWA wrapping Vercel frontend

### ผลกระทบ (Consequences)

- **เชิงบวก:** Scale to zero ลดค่าใช้จ่าย, Docker ทำให้ reproducible, CDN เร็ว
- **เชิงลบ:** Cold start 10-30 วินาที (model loading), CORS ต้อง configure ข้าม domain
- **การบรรเทา:** min-instances=1 สำหรับ production, CORS wildcard สำหรับ BETA

---

## ADR-009: เลือก Android TWA แทน Native App

**สถานะ:** ยอมรับ (Accepted)
**วันที่:** 2025-01

### บริบท (Context)

ต้องการเผยแพร่แอปบน Google Play Store โดย:
- ใช้ทรัพยากรพัฒนาน้อยที่สุด
- Maintain codebase เดียวกับ web
- ประสบการณ์ใกล้เคียง native app

### ทางเลือกที่พิจารณา (Options Considered)

| ทางเลือก | ข้อดี | ข้อเสีย |
|-----------|-------|---------|
| **TWA (Bubblewrap)** | Codebase เดียว, Play Store, fullscreen | ต้องมี web app ที่ดี |
| React Native | Near-native, shared logic | แยก codebase, maintenance สูง |
| Flutter | Cross-platform, performant | ภาษาใหม่ (Dart), แยก codebase |
| Capacitor/Ionic | Web-based, plugins | Performance ด้อยกว่า native |
| PWA only | ไม่ต้อง build | ไม่มีใน Play Store |

### การตัดสินใจ (Decision)

เลือก **Trusted Web Activity (TWA)** ผ่าน Bubblewrap CLI:
- Package: `com.aiprivacyguard.twa`
- Host: `ai-privacy-guard-alpha.vercel.app`
- Min SDK: 21 (Android 5.0+)
- Verified ผ่าน `.well-known/assetlinks.json`

### ผลกระทบ (Consequences)

- **เชิงบวก:** Zero maintenance สำหรับ mobile code, อัพเดท web = อัพเดท app, Play Store presence
- **เชิงลบ:** ต้องพึ่ง Chrome, ไม่มี native API access, performance ขึ้นกับ web
- **ความเสี่ยง:** Google อาจเปลี่ยน TWA policy

---

## ADR-010: Fallback Strategy สำหรับ AI Models

**สถานะ:** ยอมรับ (Accepted)
**วันที่:** 2024-12

### บริบท (Context)

AI model อาจโหลดไม่สำเร็จเนื่องจาก:
- Network error ขณะ download model
- Memory ไม่พอ
- Dependency ขาด (เช่น Cython compile failed)

ระบบต้องไม่ล่มทั้งหมดเมื่อ model ตัวใดตัวหนึ่ง fail

### การตัดสินใจ (Decision)

ใช้ **Graceful Degradation** strategy:

```
Face Detection:
  Primary:  MediaPipe RetinaFace (InsightFace buffalo_sc)
  Fallback: OpenCV Haar Cascade (haarcascade_frontalface_default.xml)

License Plate Detection:
  Primary:  YOLOv8 Fine-tuned (license-plate-finetune-v1m.pt)
  Fallback: Haar Cascade Vehicle Detection → Estimate plate region
```

- แต่ละ model โหลดแบบ independent
- ถ้า primary fail → ใช้ fallback โดยอัตโนมัติ
- ถ้าทั้ง primary และ fallback fail → return ผลลัพธ์ว่า "ไม่พบ detection"
- Health endpoint (`/api/health`) report สถานะ model

### ผลกระทบ (Consequences)

- **เชิงบวก:** ระบบไม่ล่ม, ยังใช้งานได้แม้ model ไม่ครบ
- **เชิงลบ:** Fallback (Haar Cascade) แม่นยำต่ำกว่ามาก
- **การบรรเทา:** Log warning เมื่อใช้ fallback, แจ้ง health endpoint

---

## สรุป Decision Map

```
┌─────────────────────────────────────────────────────────┐
│                    AI Privacy Guard                       │
│                  Architecture Decisions                    │
├──────────────┬────────────────────────────────────────────┤
│  Frontend    │ Next.js 15 + React 19 (ADR-001)           │
│              │ TanStack Query for state                   │
│              │ Tailwind CSS for styling                   │
│              │ Deploy: Vercel (ADR-008)                   │
├──────────────┼────────────────────────────────────────────┤
│  Backend     │ FastAPI + Python 3.11 (ADR-002)           │
│              │ MediaPipe + YOLOv8 (ADR-003)              │
│              │ In-memory processing (ADR-004)             │
│              │ Base64 response (ADR-005)                  │
│              │ Deploy: Cloud Run (ADR-008)                │
├──────────────┼────────────────────────────────────────────┤
│  Data        │ No image storage (ADR-004)                │
│              │ In-memory rate limiting (ADR-006)          │
│              │ CSV logging (ADR-007)                      │
├──────────────┼────────────────────────────────────────────┤
│  Mobile      │ Android TWA (ADR-009)                     │
├──────────────┼────────────────────────────────────────────┤
│  Resilience  │ Fallback AI models (ADR-010)              │
└──────────────┴────────────────────────────────────────────┘
```

---

## แผนอนาคต (Future Considerations)

| หัวข้อ | สถานะปัจจุบัน | แผน Production |
|--------|---------------|----------------|
| Rate Limiting | In-memory dict | Redis |
| Feedback Storage | CSV files | PostgreSQL |
| Authentication | ไม่มี | OAuth2 / API Keys |
| Image Transfer | Base64 | พิจารณา presigned URLs (ถ้า privacy policy เปลี่ยน) |
| Model Serving | Embedded ใน backend | แยก inference service (TorchServe/Triton) |
| Monitoring | Health endpoint | Prometheus + Grafana |
| CI/CD | Manual deploy | GitHub Actions |
| Client-side Detection | ไม่มี | ONNX.js / TensorFlow.js (ลด server load) |
