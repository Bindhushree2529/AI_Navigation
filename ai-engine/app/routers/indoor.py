from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.pipelines.indoor_nav import get_map, find_route, find_node_by_label, list_buildings, DEMO_MAP

router = APIRouter()


class RouteRequest(BaseModel):
    buildingId: str = "demo-building"
    startId: Optional[str] = None
    startLabel: Optional[str] = None
    destination: str
    preferAccessible: bool = True


@router.get("/buildings")
async def buildings():
    return {"buildings": list_buildings()}


@router.get("/map/{building_id}")
async def get_floor_map(building_id: str):
    floor_map = get_map(building_id)
    if not floor_map:
        raise HTTPException(404, f"Building '{building_id}' not found")
    return floor_map


@router.post("/route")
async def indoor_route(req: RouteRequest):
    floor_map = get_map(req.buildingId)
    if not floor_map:
        raise HTTPException(404, f"Building '{req.buildingId}' not found")

    # Resolve start node
    start_id = req.startId
    if not start_id and req.startLabel:
        start_id = find_node_by_label(floor_map, req.startLabel)
    if not start_id:
        start_id = "entrance"  # default to entrance

    # Resolve destination node
    end_id = find_node_by_label(floor_map, req.destination)
    if not end_id:
        raise HTTPException(404, f"Destination '{req.destination}' not found in building map")

    route = find_route(floor_map, start_id, end_id, prefer_accessible=req.preferAccessible)
    if not route:
        raise HTTPException(422, "No route found. Try disabling accessible-only mode.")

    return route


@router.get("/locations/{building_id}")
async def list_locations(building_id: str):
    floor_map = get_map(building_id)
    if not floor_map:
        raise HTTPException(404, f"Building '{building_id}' not found")
    return {
        "buildingId": building_id,
        "locations": [
            {"id": n["id"], "label": n["label"], "type": n["type"], "floor": n.get("floor", 1)}
            for n in floor_map.get("nodes", [])
        ],
    }
