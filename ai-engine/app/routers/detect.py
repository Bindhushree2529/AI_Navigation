from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from io import BytesIO
from app.pipelines.detection import run_detection

router = APIRouter()


@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")
    return await run_detection(image)
