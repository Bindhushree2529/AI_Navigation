from __future__ import annotations
import asyncio
from typing import Dict, Any
from app.config import settings


class ModelRegistry:
    _models: Dict[str, Any] = {}

    @classmethod
    async def load_all(cls):
        """Load all models at startup in parallel."""
        await asyncio.gather(
            cls._load_yolo(),
            cls._load_depth(),
            return_exceptions=True,
        )

    @classmethod
    async def _load_yolo(cls):
        from ultralytics import YOLO
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(None, lambda: YOLO(settings.YOLO_MODEL))
        cls._models["yolo"] = model
        print(f"✅ YOLO loaded: {settings.YOLO_MODEL}")

    @classmethod
    async def _load_depth(cls):
        try:
            from transformers import DPTForDepthEstimation, DPTImageProcessor
            import torch
            loop = asyncio.get_event_loop()

            def _load():
                processor = DPTImageProcessor.from_pretrained(settings.DEPTH_MODEL, cache_dir=settings.MODEL_CACHE_DIR)
                model = DPTForDepthEstimation.from_pretrained(settings.DEPTH_MODEL, cache_dir=settings.MODEL_CACHE_DIR)
                device = settings.DEVICE if torch.cuda.is_available() else "cpu"
                model.to(device)
                return processor, model, device

            processor, model, device = await loop.run_in_executor(None, _load)
            cls._models["depth_processor"] = processor
            cls._models["depth_model"] = model
            cls._models["device"] = device
            print(f"✅ Depth model loaded on {device}")
        except Exception as e:
            print(f"⚠️  Depth model skipped: {e}")

    @classmethod
    def get(cls, name: str) -> Any:
        return cls._models.get(name)

    @classmethod
    def loaded_models(cls) -> list[str]:
        return list(cls._models.keys())

    @classmethod
    async def unload_all(cls):
        cls._models.clear()
