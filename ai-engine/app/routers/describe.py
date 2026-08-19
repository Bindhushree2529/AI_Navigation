from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from PIL import Image
from io import BytesIO
from app.pipelines.scene import describe_scene

router = APIRouter()


@router.post("/describe")
async def describe(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")
    description = await describe_scene(image)
    return {"description": description}
