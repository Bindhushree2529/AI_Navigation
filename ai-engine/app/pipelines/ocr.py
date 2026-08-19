from __future__ import annotations
import base64
import httpx
from PIL import Image
from io import BytesIO
from app.config import settings

VISION_MODEL = "qwen/qwen3.6-27b"
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

OCR_PROMPT = """Extract ALL visible text from this image exactly as it appears.
Return only the raw text, one line per text block.
If there is no text, reply with exactly: NO_TEXT_FOUND"""


def _to_base64(image: Image.Image) -> str:
    buf = BytesIO()
    image.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode()


async def extract_text(image: Image.Image) -> str:
    if not settings.GROQ_API_KEY:
        return "OCR requires GROQ_API_KEY to be configured."

    b64 = _to_base64(image)
    payload = {
        "model": VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": OCR_PROMPT},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            ],
        }],
        "temperature": 0.1,
        "max_tokens": 512,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            GROQ_CHAT_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        )
        res.raise_for_status()
        text = res.json()["choices"][0]["message"]["content"].strip()
        return "" if text == "NO_TEXT_FOUND" else text
