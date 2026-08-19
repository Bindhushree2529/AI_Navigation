from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from app.pipelines.speech import speech_to_text, text_to_speech, get_voice

router = APIRouter()


@router.post("/stt")
async def stt(file: UploadFile = File(...)):
    """Speech to text using Whisper."""
    data = await file.read()
    text = await speech_to_text(data, file.content_type or "audio/webm")
    return {"text": text}


@router.post("/tts")
async def tts(
    text: str = Form(...),
    language: str = Form(default="en-US"),
    gender: str = Form(default="female"),
    rate: str = Form(default="+0%"),
):
    """Text to speech using Edge TTS."""
    if len(text) > 500:
        raise HTTPException(400, "Text too long (max 500 chars)")
    voice = get_voice(language, gender)
    audio = await text_to_speech(text, voice, rate)
    return Response(content=audio, media_type="audio/mpeg")
