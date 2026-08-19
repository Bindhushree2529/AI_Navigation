from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]
    MODEL_CACHE_DIR: str = "./models/cache"
    YOLO_MODEL: str = "yolov8n.pt"
    DEPTH_MODEL: str = "Intel/dpt-hybrid-midas"  # was dpt-large — 4x smaller, same accuracy
    DEVICE: str = "cpu"  # change to "cuda" for GPU

    class Config:
        env_file = ".env"


settings = Settings()
