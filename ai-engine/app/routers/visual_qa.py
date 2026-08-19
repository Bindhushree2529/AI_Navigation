from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image
from io import BytesIO
from app.pipelines.scene import visual_qa

router = APIRouter()


@router.post("/visual-qa")
async def visual_question_answer(
    file: UploadFile = File(...),
    question: str = Form(default="What do you see?"),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")
    answer = await visual_qa(image, question)
    return {"answer": answer}
