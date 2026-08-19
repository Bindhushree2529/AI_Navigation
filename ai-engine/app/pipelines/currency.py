from __future__ import annotations
import asyncio
from PIL import Image
from app.pipelines.scene import visual_qa

CURRENCY_PROMPT = (
    "Identify any currency notes or coins in this image. "
    "State the denomination and currency type. "
    "If no currency is visible, say 'No currency detected'. "
    "Be brief and direct."
)


async def detect_currency(image: Image.Image) -> dict:
    answer = await visual_qa(image, CURRENCY_PROMPT)
    return {
        "description": answer,
        "spokenText": answer,
    }
