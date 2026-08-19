# NaviAssist — Complete Architecture & API Documentation

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                  │
│  ┌──────────────────┐          ┌──────────────────────────────┐  │
│  │  Next.js Web App │          │  React Native Mobile App     │  │
│  │  (Landing, Admin,│          │  (Android + iOS via Expo)    │  │
│  │   Caregiver UI)  │          │  Camera · Voice · GPS · SOS  │  │
│  └────────┬─────────┘          └──────────────┬───────────────┘  │
└───────────┼────────────────────────────────────┼─────────────────┘
            │ HTTPS / WSS                         │ HTTPS / WSS
            ▼                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                       │
│              TLS Termination · Rate Limiting · Routing           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│   Backend    │  │  AI Engine   │  │     WebSocket Server     │
│  Node.js +   │  │  Python +    │  │  (embedded in Backend)   │
│  Fastify     │  │  FastAPI     │  │  Redis Pub/Sub           │
│  REST APIs   │  │  YOLOv8      │  └──────────────────────────┘
│  JWT Auth    │  │  MiDaS Depth │
│  Prisma ORM  │  │  PaddleOCR   │
└──────┬───────┘  │  GPT-4o      │
       │          │  Whisper TTS │
       │          └──────┬───────┘
       │                 │
       ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                               │
│  ┌──────────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   PostgreSQL 16  │    │   Redis 7    │    │    AWS S3     │  │
│  │  Primary DB      │    │  Cache/Queue │    │  Media Store  │  │
│  │  Prisma Migrate  │    │  Pub/Sub     │    │  Images/Audio │  │
│  └──────────────────┘    └──────────────┘    └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. AI Pipeline Architecture

```
Camera Frame (JPEG)
        │
        ▼
┌───────────────────┐
│  Pre-processing   │  Resize to 640×640, normalize
│  (OpenCV/Pillow)  │
└────────┬──────────┘
         │
    ┌────┴────────────────────────────────┐
    │                                     │
    ▼                                     ▼
┌──────────────┐                 ┌──────────────────┐
│  YOLOv8n     │                 │  MiDaS / DPT     │
│  Object Det. │                 │  Depth Estimator │
│  ~15ms GPU   │                 │  ~30ms GPU       │
└──────┬───────┘                 └────────┬─────────┘
       │ Bounding boxes                   │ Depth map
       │ Class labels                     │ (H×W float32)
       │ Confidence scores                │
       └──────────────┬───────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │  Fusion Layer   │  Map depth to each bbox
            │  Distance Est.  │  "Person 2.3m ahead"
            └────────┬────────┘
                     │
         ┌───────────┼───────────────┐
         │           │               │
         ▼           ▼               ▼
  ┌────────────┐ ┌────────┐  ┌──────────────┐
  │  Spoken    │ │  JSON  │  │  GPT-4o /    │
  │  Text Gen  │ │  API   │  │  Gemini 1.5  │
  │  Template  │ │  Resp  │  │  Scene Desc  │
  └────────────┘ └────────┘  └──────────────┘
         │
         ▼
  Edge TTS / Whisper
  Voice Output
```

---

## 3. Database ER Diagram

```
User ──────────────── UserSettings (1:1)
 │
 ├── NavigationSession (1:N)
 │       └── Detection (1:N)
 │       └── SosEvent (1:N)
 │
 ├── Detection (1:N)
 ├── SosEvent (1:N)
 ├── EmergencyContact (1:N)
 ├── FavoriteLocation (1:N)
 ├── Feedback (1:N)
 ├── AuditLog (1:N)
 │
 ├── CaregiverLink (as User) ──── User (as Caregiver)
 └── CaregiverLink (as Caregiver) ── User (as User)
```

---

## 4. REST API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | Public |
| POST | `/api/v1/auth/login` | Login with email/password | Public |
| POST | `/api/v1/auth/otp/send` | Send OTP to phone | Public |
| POST | `/api/v1/auth/otp/verify` | Verify OTP and login | Public |
| POST | `/api/v1/auth/refresh` | Refresh access token | Public |
| POST | `/api/v1/auth/logout` | Logout and revoke token | Bearer |
| GET  | `/api/v1/auth/me` | Get current user | Bearer |

### Navigation

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/navigation/sessions` | Start navigation session | Bearer |
| PATCH | `/api/v1/navigation/sessions/:id/end` | End session | Bearer |
| GET | `/api/v1/navigation/sessions` | Get session history | Bearer |
| GET | `/api/v1/navigation/favorites` | Get favorite locations | Bearer |
| POST | `/api/v1/navigation/favorites` | Add favorite location | Bearer |
| DELETE | `/api/v1/navigation/favorites/:id` | Remove favorite | Bearer |
| POST | `/api/v1/navigation/location` | Update live location | Bearer |

### AI Detections

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/detections/analyze` | Object detection (multipart image) | Bearer |
| POST | `/api/v1/detections/describe` | Scene description (multipart image) | Bearer |
| POST | `/api/v1/detections/ocr` | Extract text from image | Bearer |
| POST | `/api/v1/detections/currency` | Detect currency | Bearer |
| POST | `/api/v1/detections/ask` | Visual Q&A | Bearer |
| GET | `/api/v1/detections/history` | Detection history | Bearer |

### SOS & Emergency

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/sos` | Trigger SOS alert | Bearer |
| PATCH | `/api/v1/sos/:id/resolve` | Resolve SOS | Bearer |
| GET | `/api/v1/sos/history` | SOS history | Bearer |
| GET | `/api/v1/sos/contacts` | Emergency contacts | Bearer |
| POST | `/api/v1/sos/contacts` | Add emergency contact | Bearer |
| DELETE | `/api/v1/sos/contacts/:id` | Remove contact | Bearer |

### Caregiver

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/caregiver/users` | Get linked users | Bearer (CAREGIVER) |
| POST | `/api/v1/caregiver/invite` | Invite user | Bearer (CAREGIVER) |
| PATCH | `/api/v1/caregiver/invite/:id/accept` | Accept invite | Bearer |
| DELETE | `/api/v1/caregiver/users/:userId` | Remove link | Bearer |
| GET | `/api/v1/caregiver/users/:userId/session` | Get active session | Bearer (CAREGIVER) |
| GET | `/api/v1/caregiver/users/:userId/sos` | Get SOS history | Bearer (CAREGIVER) |
| GET | `/api/v1/caregiver/users/:userId/sessions` | Get nav history | Bearer (CAREGIVER) |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/admin/stats` | Platform statistics | Bearer (ADMIN) |
| GET | `/api/v1/admin/users` | User list with search | Bearer (ADMIN) |
| PATCH | `/api/v1/admin/users/:id/toggle` | Toggle user status | Bearer (ADMIN) |
| GET | `/api/v1/admin/detections/breakdown` | Detection analytics | Bearer (ADMIN) |
| GET | `/api/v1/admin/sos` | SOS events | Bearer (ADMIN) |
| GET | `/api/v1/admin/logs` | Audit logs | Bearer (ADMIN) |
| GET | `/api/v1/admin/analytics/sessions` | Sessions over time | Bearer (ADMIN) |

### AI Engine (Internal)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/detect` | YOLOv8 + depth detection |
| POST | `/api/describe` | GPT-4o scene description |
| POST | `/api/ocr` | PaddleOCR text extraction |
| POST | `/api/currency` | Currency recognition |
| POST | `/api/visual-qa` | Visual question answering |
| POST | `/api/stt` | Whisper speech-to-text |
| POST | `/api/tts` | Edge TTS text-to-speech |

### WebSocket Events

**Client → Server:**
```json
{ "type": "WATCH_USER", "userId": "uuid" }
{ "type": "PING" }
```

**Server → Client:**
```json
{ "type": "CONNECTED", "userId": "uuid" }
{ "type": "LOCATION_UPDATE", "lat": 0.0, "lng": 0.0, "timestamp": 0 }
{ "type": "SOS_ALERT", "sos": {...}, "user": { "name": "..." } }
{ "type": "SESSION_UPDATE", "event": "SESSION_STARTED", "session": {...} }
{ "type": "PONG" }
```

---

## 5. Authentication Flow

```
1. Register/Login → POST /auth/register or /auth/login
2. Server returns { accessToken (15min), refreshToken (7d) }
3. Client stores tokens securely (SecureStore on mobile, memory + httpOnly cookie on web)
4. Every API request: Authorization: Bearer <accessToken>
5. On 401: POST /auth/refresh with refreshToken → new token pair
6. On logout: POST /auth/logout → refreshToken blacklisted in Redis
```

---

## 6. Voice Commands Reference

| Command | Action |
|---------|--------|
| "Start navigation" | Starts camera analysis loop |
| "Stop navigation" | Stops camera analysis |
| "What is ahead" / "What's in front" | Captures and analyzes frame |
| "Describe surroundings" | Full scene description via LLM |
| "Read text" | OCR on current frame |
| "Detect currency" | Currency recognition |
| "Where am I" | Announces GPS location |
| "Navigate to [place]" | Opens navigation to destination |
| "Repeat" | Repeats last spoken message |
| "SOS" / "Help" / "Emergency" | Triggers SOS alert |
| "Call caregiver" | Initiates phone call |
| "Open settings" | Opens settings screen |

---

## 7. Deployment Guide

### Prerequisites
- Docker & Docker Compose
- NVIDIA GPU (optional, for faster AI inference)
- Domain with SSL certificate

### Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/naviassist
cd naviassist

# 2. Configure environment
cp .env.example .env
# Edit .env with your values

# 3. Start all services
docker compose up -d

# 4. Run database migrations
docker compose exec backend npx prisma migrate deploy

# 5. Seed admin user
docker compose exec backend npm run db:seed

# 6. Verify health
curl https://your-domain.com/health
curl https://your-domain.com/api/v1/health
```

### Environment Variables (Required)
- `POSTGRES_PASSWORD` — Strong database password
- `JWT_SECRET` — Min 32 chars random string
- `JWT_REFRESH_SECRET` — Min 32 chars random string
- `OPENAI_API_KEY` or `GOOGLE_API_KEY` — For scene description
- `TWILIO_*` — For SMS/OTP (optional, dev fallback logs OTP)

---

## 8. Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Backend unit tests | Vitest | Routes, services, middleware |
| Backend integration | Vitest + real DB | Full request/response cycle |
| AI pipeline tests | pytest + AsyncMock | Each pipeline function |
| Web component tests | Vitest + RTL | UI components |
| E2E tests | Playwright | Critical user flows |
| Mobile tests | Jest + RNTL | Screen components |

---

## 9. Future Enhancements

- **Indoor Navigation** — BLE beacon + floor plan mapping
- **Face Recognition** — Recognize saved contacts (on-device, privacy-first)
- **AR Overlays** — Bounding box visualization for sighted caregivers
- **Wearable Integration** — Apple Watch / WearOS haptic alerts
- **Multi-language OCR** — Arabic, Hindi, Chinese support
- **Crowd Density Estimation** — Avoid crowded areas
- **Bus/Train Recognition** — Public transport assistance
- **Offline LLM** — Llama 3 on-device for scene description
- **Smart Glasses Support** — Meta Ray-Ban, Google Glass integration
- **Community Map** — Crowdsourced hazard reporting
