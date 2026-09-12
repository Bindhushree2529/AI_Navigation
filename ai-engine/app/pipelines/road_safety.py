from __future__ import annotations
from typing import List, Dict, Any

# Priority levels (lower = more urgent)
PRIORITY = {"EMERGENCY": 0, "VEHICLE": 1, "OBSTACLE": 2, "TRAFFIC": 3, "INFO": 4}

LIGHT_MESSAGES = {
    "red":     "Traffic light is red. Stop and wait.",
    "yellow":  "Traffic light is yellow. Prepare to stop.",
    "green":   "Traffic light is green. Proceed with caution.",
    "unknown": "Traffic light detected. State unclear.",
}


def _vehicle_warning(v: dict) -> str:
    dist = v.get("distanceM")
    direction = "ahead"
    bbox = v.get("boundingBox", {})
    # Re-derive direction from bbox center if available
    if bbox:
        cx = (bbox.get("x1", 0) + bbox.get("x2", 1)) / 2
        # We don't have image width here, use spokenText direction
    spoken = v.get("spokenText", "")
    if "left" in spoken:
        direction = "from your left"
    elif "right" in spoken:
        direction = "from your right"
    else:
        direction = "ahead"

    label = v.get("label", "vehicle").capitalize()
    if dist:
        return f"{label} approaching {direction}, approximately {dist} meters away."
    return f"{label} detected {direction}."


def analyze_road_safety(traffic_scene: dict) -> dict:
    """
    Combine traffic signals into a prioritized list of warnings and a primary alert.
    traffic_scene: output of analyze_traffic_scene()
    """
    warnings: List[Dict[str, Any]] = []

    # 1. Traffic lights
    for tl in traffic_scene.get("trafficLights", []):
        color = tl.get("lightColor", "unknown")
        warnings.append({
            "priority": PRIORITY["TRAFFIC"],
            "type": "TRAFFIC_LIGHT",
            "color": color,
            "message": LIGHT_MESSAGES.get(color, LIGHT_MESSAGES["unknown"]),
        })

    # 2. Stop signs
    for _ in traffic_scene.get("stopSigns", []):
        warnings.append({
            "priority": PRIORITY["TRAFFIC"],
            "type": "STOP_SIGN",
            "message": "Stop sign detected ahead.",
        })

    # 3. Zebra crossing
    if traffic_scene.get("zebraCrossing"):
        warnings.append({
            "priority": PRIORITY["INFO"],
            "type": "ZEBRA_CROSSING",
            "message": "Zebra crossing detected ahead.",
        })

    # 4. Vehicles — close ones are higher priority
    for v in traffic_scene.get("vehicles", []):
        dist = v.get("distanceM")
        priority = PRIORITY["VEHICLE"] if (dist is None or dist < 5) else PRIORITY["OBSTACLE"]
        warnings.append({
            "priority": priority,
            "type": "VEHICLE",
            "message": _vehicle_warning(v),
            "distanceM": dist,
        })

    # 5. Pedestrians
    for p in traffic_scene.get("pedestrians", []):
        spoken = p.get("spokenText", "Person ahead.")
        warnings.append({
            "priority": PRIORITY["INFO"],
            "type": "PEDESTRIAN",
            "message": spoken,
        })

    # Sort by priority
    warnings.sort(key=lambda w: w["priority"])

    # Primary alert = highest priority warning
    primary = warnings[0]["message"] if warnings else "Path appears clear."

    # Crossing safety assessment
    lights = traffic_scene.get("trafficLights", [])
    vehicles = traffic_scene.get("vehicles", [])
    zebra = traffic_scene.get("zebraCrossing", False)

    crossing_safe: str | None = None
    if zebra:
        green_lights = [tl for tl in lights if tl.get("lightColor") == "green"]
        red_lights = [tl for tl in lights if tl.get("lightColor") == "red"]
        close_vehicles = [v for v in vehicles if (v.get("distanceM") or 999) < 8]

        if red_lights and not close_vehicles:
            crossing_safe = "Zebra crossing ahead. Traffic light is red. Listen carefully before crossing."
        elif green_lights:
            crossing_safe = "Zebra crossing ahead. Traffic light is green for vehicles. Do not cross yet."
        elif close_vehicles:
            crossing_safe = "Zebra crossing ahead. Vehicles nearby. Wait before crossing."
        else:
            crossing_safe = "Zebra crossing ahead. No traffic light detected. Proceed with caution."

    return {
        "primaryAlert": primary,
        "warnings": warnings,
        "crossingGuidance": crossing_safe,
        "trafficLightColor": lights[0].get("lightColor") if lights else None,
        "vehicleCount": len(vehicles),
        "pedestrianCount": len(traffic_scene.get("pedestrians", [])),
        "zebraCrossing": zebra,
    }
