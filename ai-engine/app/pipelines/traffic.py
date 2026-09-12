from __future__ import annotations
import cv2
import numpy as np
from PIL import Image
from typing import Optional

# HSV ranges for traffic light colors
_RED_LOWER1 = np.array([0, 120, 100])
_RED_UPPER1 = np.array([10, 255, 255])
_RED_LOWER2 = np.array([160, 120, 100])
_RED_UPPER2 = np.array([180, 255, 255])
_YELLOW_LOWER = np.array([18, 100, 100])
_YELLOW_UPPER = np.array([35, 255, 255])
_GREEN_LOWER = np.array([36, 80, 80])
_GREEN_UPPER = np.array([90, 255, 255])


def _analyze_traffic_light_color(image: Image.Image, bbox: dict) -> str:
    """Crop the traffic light region and determine color via HSV analysis."""
    img_np = np.array(image)
    x1, y1, x2, y2 = int(bbox["x1"]), int(bbox["y1"]), int(bbox["x2"]), int(bbox["y2"])
    h, w = img_np.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)

    if x2 <= x1 or y2 <= y1:
        return "unknown"

    crop = img_np[y1:y2, x1:x2]
    if crop.size == 0:
        return "unknown"

    hsv = cv2.cvtColor(crop, cv2.COLOR_RGB2HSV)

    red_mask = cv2.inRange(hsv, _RED_LOWER1, _RED_UPPER1) | cv2.inRange(hsv, _RED_LOWER2, _RED_UPPER2)
    yellow_mask = cv2.inRange(hsv, _YELLOW_LOWER, _YELLOW_UPPER)
    green_mask = cv2.inRange(hsv, _GREEN_LOWER, _GREEN_UPPER)

    red_px = int(np.sum(red_mask > 0))
    yellow_px = int(np.sum(yellow_mask > 0))
    green_px = int(np.sum(green_mask > 0))

    total = crop.shape[0] * crop.shape[1]
    threshold = max(total * 0.03, 10)  # at least 3% of crop

    scores = {"red": red_px, "yellow": yellow_px, "green": green_px}
    best = max(scores, key=lambda k: scores[k])

    if scores[best] < threshold:
        return "unknown"
    return best


def _detect_zebra_crossing(image: Image.Image) -> bool:
    """Detect zebra crossing using horizontal stripe pattern in lower image region."""
    img_np = np.array(image)
    h, w = img_np.shape[:2]

    # Focus on lower 40% of image (ground level)
    roi = img_np[int(h * 0.6):h, :]
    gray = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    # Detect horizontal lines via HoughLines
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=40,
                             minLineLength=w // 6, maxLineGap=20)
    if lines is None:
        return False

    horizontal = 0
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = abs(np.degrees(np.arctan2(y2 - y1, x2 - x1)))
        if angle < 15 or angle > 165:
            horizontal += 1

    # 5+ horizontal lines in lower region = likely zebra crossing
    return horizontal >= 5


def analyze_traffic_scene(image: Image.Image, detections: list) -> dict:
    """
    Analyze traffic-related detections and return enriched traffic scene info.
    detections: list of detection dicts from run_detection()
    """
    traffic_lights = []
    vehicles = []
    pedestrians = []
    stop_signs = []

    for d in detections:
        label = d.get("label", "")
        bbox = d.get("boundingBox", {})

        if label == "traffic light":
            color = _analyze_traffic_light_color(image, bbox)
            traffic_lights.append({**d, "lightColor": color})

        elif d.get("category") == "VEHICLE":
            vehicles.append(d)

        elif label == "person":
            pedestrians.append(d)

        elif label == "stop sign":
            stop_signs.append(d)

    zebra = _detect_zebra_crossing(image)

    return {
        "trafficLights": traffic_lights,
        "vehicles": vehicles,
        "pedestrians": pedestrians,
        "stopSigns": stop_signs,
        "zebraCrossing": zebra,
    }
