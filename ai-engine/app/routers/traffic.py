from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from io import BytesIO
from app.pipelines.detection import run_detection
from app.pipelines.traffic import analyze_traffic_scene
from app.pipelines.road_safety import analyze_road_safety

router = APIRouter()


@router.post("/traffic")
async def traffic_analysis(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")

    detection_result = await run_detection(image)
    traffic_scene = analyze_traffic_scene(image, detection_result.get("detections", []))
    safety = analyze_road_safety(traffic_scene)

    return {
        "detections": detection_result.get("detections", []),
        "trafficScene": traffic_scene,
        "roadSafety": safety,
        "inferenceMs": detection_result.get("inferenceMs", 0),
    }


@router.post("/road-safety")
async def road_safety_only(file: UploadFile = File(...)):
    """Lightweight endpoint — returns only the safety summary."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Image file required")
    data = await file.read()
    image = Image.open(BytesIO(data)).convert("RGB")

    detection_result = await run_detection(image)
    traffic_scene = analyze_traffic_scene(image, detection_result.get("detections", []))
    safety = analyze_road_safety(traffic_scene)

    return safety
