from __future__ import annotations
import base64
import asyncio
import httpx
from PIL import Image
from io import BytesIO
from app.config import settings

VISION_MODEL = "qwen/qwen3.6-27b"
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"

SCENE_PROMPT = """You are a navigation assistant for a visually impaired person.
Look at this image very carefully and describe what you see.

You MUST mention:
- Any barriers, blockades, fences, cones, or obstacles blocking the path
- Any road closures, barriers with chevrons/arrows, or warning signs
- People, vehicles, animals in the scene
- Stairs, curbs, drops, or uneven surfaces
- Whether the path ahead is blocked or open

Be specific and direct. Start with the most critical safety hazard.
Example: "The road ahead is blocked by two large red and white barrier boards with chevron arrows. Do not proceed."
If the path is truly clear say so, but only if there are genuinely no obstacles."""

QA_PROMPT = """You are an AI assistant for a visually impaired person.
Answer the question based on the image. Be concise and direct.
Focus on safety-relevant information first."""


def _image_to_base64(image: Image.Image) -> str:
    buf = BytesIO()
    image.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


async def _groq_vision(image: Image.Image, prompt: str) -> str:
    if not settings.GROQ_API_KEY:
        return await _fallback_description(image)
    b64 = _image_to_base64(image)
    payload = {
        "model": VISION_MODEL,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}},
            ],
        }],
        "temperature": 0.3,
        "max_tokens": 256,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(
            GROQ_CHAT_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        )
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"].strip()


async def describe_scene(image: Image.Image) -> str:
    try:
        return await _groq_vision(image, SCENE_PROMPT)
    except Exception:
        return await _fallback_description(image)


async def visual_qa(image: Image.Image, question: str) -> str:
    try:
        return await _groq_vision(image, f"{QA_PROMPT}\n\nQuestion: {question}")
    except Exception as e:
        return f"Could not analyse image: {e}"


async def _fallback_description(image: Image.Image) -> str:
    from app.pipelines.detection import run_detection
    result = await run_detection(image)
    detections = result.get("detections", [])
    if not detections:
        return "No objects detected. Path appears clear."
    labels = [d["spokenText"] for d in detections[:3]]
    return ". ".join(labels) + "."
