from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from io import BytesIO
from app.pipelines.ocr import extract_text

router = APIRouter()


@router.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")
    text = await extract_text(image)
    return {"text": text or "No text detected"}
