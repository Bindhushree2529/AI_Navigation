from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from io import BytesIO
from app.pipelines.currency import detect_currency

router = APIRouter()


@router.post("/currency")
async def currency(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")
    return await detect_currency(image)
