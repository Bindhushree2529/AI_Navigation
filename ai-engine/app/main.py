from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import detect, describe, ocr, currency, visual_qa, speech, traffic, indoor, weather
from app.services.model_registry import ModelRegistry
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ModelRegistry.load_all()
    yield
    await ModelRegistry.unload_all()


app = FastAPI(
    title="NaviAssist AI Engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detect.router, prefix="/api")
app.include_router(describe.router, prefix="/api")
app.include_router(ocr.router, prefix="/api")
app.include_router(currency.router, prefix="/api")
app.include_router(visual_qa.router, prefix="/api")
app.include_router(speech.router, prefix="/api")
app.include_router(traffic.router, prefix="/api")
app.include_router(indoor.router, prefix="/api/indoor")
app.include_router(weather.router, prefix="/api/weather")


@app.get("/health")
async def health():
    return {"status": "ok", "models": ModelRegistry.loaded_models()}
