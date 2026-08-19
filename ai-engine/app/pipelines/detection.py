from __future__ import annotations
import time
import numpy as np
from PIL import Image
from typing import List, Dict, Any, Optional
from app.services.model_registry import ModelRegistry

# Maps YOLO class names to our DetectionCategory enum
CATEGORY_MAP = {
    "person": "PERSON",
    "car": "VEHICLE", "truck": "VEHICLE", "bus": "VEHICLE", "motorcycle": "VEHICLE", "bicycle": "VEHICLE",
    "chair": "OBSTACLE", "couch": "OBSTACLE", "dining table": "OBSTACLE", "bed": "OBSTACLE",
    "door": "OBSTACLE", "stairs": "STAIRCASE",
    "traffic light": "TRAFFIC_SIGNAL", "stop sign": "TRAFFIC_SIGNAL",
    "pothole": "HAZARD", "fire hydrant": "HAZARD",
    "dog": "OBSTACLE", "cat": "OBSTACLE",
}

SPOKEN_TEMPLATES = {
    "PERSON": "Person {direction}",
    "VEHICLE": "{label} {direction}",
    "OBSTACLE": "{label} {direction}",
    "STAIRCASE": "Staircase {direction}",
    "TRAFFIC_SIGNAL": "Traffic light {direction}",
    "HAZARD": "Hazard: {label} {direction}",
}

DISTANCE_THRESHOLDS = {
    "CRITICAL": 1.5,
    "WARNING": 3.0,
    "INFO": 6.0,
}


def _get_direction(cx: float, img_width: float) -> str:
    ratio = cx / img_width
    if ratio < 0.33:
        return "on your left"
    elif ratio > 0.67:
        return "on your right"
    return "ahead"


def _estimate_distance_from_depth(depth_map: np.ndarray, bbox: List[float]) -> Optional[float]:
    """Sample depth map in the bounding box region."""
    x1, y1, x2, y2 = [int(v) for v in bbox]
    h, w = depth_map.shape
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return None
    region = depth_map[y1:y2, x1:x2]
    # Normalize inverse depth to approximate meters (heuristic)
    median_depth = float(np.median(region))
    if median_depth <= 0:
        return None
    return round(10.0 / (median_depth + 1e-6), 1)


async def run_depth_estimation(image: Image.Image) -> Optional[np.ndarray]:
    import torch
    processor = ModelRegistry.get("depth_processor")
    model = ModelRegistry.get("depth_model")
    device = ModelRegistry.get("device") or "cpu"
    if not processor or not model:
        return None

    import asyncio
    loop = asyncio.get_event_loop()

    def _infer():
        inputs = processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model(**inputs)
        depth = outputs.predicted_depth.squeeze().cpu().numpy()
        return depth

    return await loop.run_in_executor(None, _infer)


async def run_detection(image: Image.Image) -> Dict[str, Any]:
    yolo = ModelRegistry.get("yolo")
    if not yolo:
        return {"detections": [], "modelName": "yolo", "modelVersion": "unavailable", "inferenceMs": 0}

    import asyncio
    loop = asyncio.get_event_loop()
    start = time.monotonic()

    results = await loop.run_in_executor(None, lambda: yolo(image, verbose=False))
    depth_map = await run_depth_estimation(image)

    inference_ms = int((time.monotonic() - start) * 1000)
    detections: List[Dict] = []

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
        img_w = image.width

        for box in boxes:
            conf = float(box.conf[0])
            if conf < 0.4:
                continue

            cls_id = int(box.cls[0])
            label = yolo.names[cls_id]
            category = CATEGORY_MAP.get(label, "OBSTACLE")
            bbox = box.xyxy[0].tolist()
            cx = (bbox[0] + bbox[2]) / 2
            direction = _get_direction(cx, img_w)

            distance_m = None
            if depth_map is not None:
                distance_m = _estimate_distance_from_depth(depth_map, bbox)

            template = SPOKEN_TEMPLATES.get(category, "{label} {direction}")
            spoken = template.format(label=label.capitalize(), direction=direction)
            if distance_m:
                spoken += f", {distance_m} meters"

            detections.append({
                "category": category,
                "label": label,
                "confidence": round(conf, 3),
                "distanceM": distance_m,
                "boundingBox": {"x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]},
                "spokenText": spoken,
            })

    # Sort by distance (closest first)
    detections.sort(key=lambda d: d["distanceM"] or 999)

    return {
        "detections": detections,
        "modelName": "yolov8",
        "modelVersion": settings_version(),
        "inferenceMs": inference_ms,
    }


def settings_version() -> str:
    from app.config import settings
    return settings.YOLO_MODEL.replace(".pt", "")
