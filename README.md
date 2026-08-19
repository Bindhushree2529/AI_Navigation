# NaviAssist — AI-Powered Smart Navigation for Visually Impaired

A production-ready, accessibility-first navigation platform powered by computer vision, LLMs, and real-time AI inference.

## Architecture Overview

```
naviassist/
├── web/          # Next.js 14 (App Router) — Website + Admin + Caregiver dashboards
├── mobile/       # React Native (Expo) — Android & iOS
├── backend/      # Node.js + Fastify — Shared REST APIs + WebSocket
├── ai-engine/    # Python + FastAPI — AI/ML inference microservice
├── shared/       # Shared TypeScript types & utilities
├── infra/        # Docker, Kubernetes, Terraform, Nginx
└── docs/         # Architecture, API docs, guides
```

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Web Frontend | Next.js 14 (App Router) + TypeScript | SSR, SEO, App Router, best DX |
| Mobile | React Native + Expo | Single codebase for Android & iOS |
| UI Library | shadcn/ui + Tailwind CSS | Accessible, composable, modern |
| State Management | Zustand + React Query | Lightweight, server-state sync |
| Backend API | Node.js + Fastify | High-performance, schema-first |
| AI Engine | Python + FastAPI | Native ML ecosystem |
| Object Detection | YOLOv8 (Ultralytics) | SOTA real-time detection |
| Depth Estimation | MiDaS / Depth Anything v2 | Monocular depth from single camera |
| Scene Understanding | GPT-4o Vision / Gemini 1.5 Pro | Natural language scene descriptions |
| OCR | PaddleOCR + Tesseract | Multilingual, offline-capable |
| Speech | Whisper (STT) + Edge TTS (TTS) | Offline-capable, natural voice |
| Database | PostgreSQL + Redis | Relational + caching/pub-sub |
| ORM | Prisma | Type-safe, migrations |
| Auth | Supabase Auth / JWT + OAuth2 | Google, OTP, email |
| Real-time | WebSocket (ws) + Redis Pub/Sub | Live location, SOS alerts |
| File Storage | AWS S3 / Cloudflare R2 | Scalable media storage |
| Deployment | Docker + Kubernetes + GitHub Actions | Production-grade CI/CD |
| Monitoring | Prometheus + Grafana + Sentry | Observability |
| GPU Inference | NVIDIA Triton / ONNX Runtime | Scalable model serving |

## Quick Start

```bash
# Clone and setup
git clone <repo>
cd naviassist

# Start all services
docker-compose up -d

# Web (dev)
cd web && npm install && npm run dev

# Backend (dev)
cd backend && npm install && npm run dev

# AI Engine (dev)
cd ai-engine && pip install -r requirements.txt && uvicorn app.main:app --reload
```

## Safety Notice

NaviAssist is an **assistive tool** designed to complement — not replace — a white cane or guide dog. Always use appropriate mobility aids alongside this application.
