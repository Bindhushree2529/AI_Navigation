from __future__ import annotations
import os
import tempfile
from app.config import settings

STT_MODEL = "whisper-large-v3-turbo"


async def speech_to_text(audio_bytes: bytes, mime_type: str = "audio/webm") -> str:
    """Transcribe audio using Groq Whisper API (no local model needed)."""
    from groq import AsyncGroq

    client = AsyncGroq(api_key=settings.GROQ_API_KEY)

    ext = "webm"
    if "wav" in mime_type:
        ext = "wav"
    elif "mp4" in mime_type or "m4a" in mime_type:
        ext = "mp4"
    elif "ogg" in mime_type:
        ext = "ogg"
    elif "flac" in mime_type:
        ext = "flac"

    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        with open(tmp_path, "rb") as audio_file:
            transcription = await client.audio.transcriptions.create(
                file=(f"audio.{ext}", audio_file, mime_type),
                model=STT_MODEL,
                response_format="verbose_json",
            )
        return transcription.text.strip() if transcription.text else ""
    finally:
        os.unlink(tmp_path)


# TTS is handled by the device (window.speechSynthesis on web, expo-speech on mobile)
# These stubs are kept so existing imports don't break
def get_voice(language: str, gender: str = "female") -> str:
    return language


async def text_to_speech(text: str, voice: str = "en-US", rate: str = "+0%") -> bytes:
    raise NotImplementedError(
        "TTS is handled by the client device. "
        "Use window.speechSynthesis (web) or expo-speech (mobile)."
    )
