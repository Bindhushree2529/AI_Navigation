from __future__ import annotations
import heapq
import math
from typing import Dict, List, Optional, Tuple, Any

# ---------------------------------------------------------------------------
# Floor map data structure
# Each node: { "id": str, "label": str, "type": str, "x": float, "y": float,
#              "floor": int, "accessible": bool }
# Each edge: { "from": str, "to": str, "distanceM": float, "type": str }
# type: "corridor" | "stairs" | "elevator" | "door"
# ---------------------------------------------------------------------------

_MAPS: Dict[str, Dict] = {}  # building_id -> map data


def register_map(building_id: str, floor_map: dict) -> None:
    _MAPS[building_id] = floor_map


def get_map(building_id: str) -> Optional[dict]:
    return _MAPS.get(building_id)


def list_buildings() -> List[str]:
    return list(_MAPS.keys())


# ---------------------------------------------------------------------------
# A* path finding
# ---------------------------------------------------------------------------

def _heuristic(a: dict, b: dict) -> float:
    return math.sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)


def find_route(
    floor_map: dict,
    start_id: str,
    end_id: str,
    prefer_accessible: bool = True,
) -> Optional[dict]:
    nodes: Dict[str, dict] = {n["id"]: n for n in floor_map.get("nodes", [])}
    edges: List[dict] = floor_map.get("edges", [])

    if start_id not in nodes or end_id not in nodes:
        return None

    # Build adjacency list
    adj: Dict[str, List[Tuple[str, float, str]]] = {nid: [] for nid in nodes}
    for e in edges:
        f, t, dist, etype = e["from"], e["to"], e["distanceM"], e.get("type", "corridor")
        # Skip stairs if accessible route preferred
        if prefer_accessible and etype == "stairs":
            continue
        adj[f].append((t, dist, etype))
        adj[t].append((f, dist, etype))  # bidirectional

    # A*
    open_heap: List[Tuple[float, str]] = [(0.0, start_id)]
    came_from: Dict[str, Optional[Tuple[str, str]]] = {start_id: None}  # id -> (prev_id, edge_type)
    g_score: Dict[str, float] = {start_id: 0.0}

    while open_heap:
        _, current = heapq.heappop(open_heap)
        if current == end_id:
            break
        for neighbor, dist, etype in adj.get(current, []):
            tentative = g_score[current] + dist
            if tentative < g_score.get(neighbor, float("inf")):
                g_score[neighbor] = tentative
                came_from[neighbor] = (current, etype)
                f = tentative + _heuristic(nodes[neighbor], nodes[end_id])
                heapq.heappush(open_heap, (f, neighbor))

    if end_id not in came_from:
        return None  # no path found

    # Reconstruct path
    path: List[Tuple[str, str]] = []
    cur = end_id
    while came_from[cur] is not None:
        prev, etype = came_from[cur]
        path.append((cur, etype))
        cur = prev
    path.reverse()

    # Build steps
    steps: List[dict] = []
    for node_id, etype in path:
        node = nodes[node_id]
        steps.append({
            "nodeId": node_id,
            "label": node["label"],
            "type": node["type"],
            "edgeType": etype,
            "floor": node.get("floor", 1),
            "instruction": _build_instruction(node, etype),
        })

    total_dist = g_score.get(end_id, 0)

    return {
        "startId": start_id,
        "endId": end_id,
        "totalDistanceM": round(total_dist, 1),
        "steps": steps,
        "summary": f"{len(steps)} steps, approximately {round(total_dist)} meters.",
    }


def _build_instruction(node: dict, edge_type: str) -> str:
    label = node["label"]
    if edge_type == "elevator":
        return f"Take the elevator to reach {label}."
    if edge_type == "stairs":
        return f"Use the stairs to reach {label}."
    if edge_type == "door":
        return f"Go through the door to {label}."
    return f"Continue to {label}."


def find_node_by_label(floor_map: dict, query: str) -> Optional[str]:
    """Fuzzy match a destination label to a node id."""
    query_lower = query.lower()
    nodes = floor_map.get("nodes", [])
    # Exact match first
    for n in nodes:
        if n["label"].lower() == query_lower:
            return n["id"]
    # Partial match
    for n in nodes:
        if query_lower in n["label"].lower() or n["label"].lower() in query_lower:
            return n["id"]
    return None


# ---------------------------------------------------------------------------
# Demo building map — loaded at startup
# Replace with real floor maps loaded from DB or files
# ---------------------------------------------------------------------------

DEMO_MAP = {
    "buildingId": "demo-building",
    "buildingName": "NaviAssist Demo Building",
    "nodes": [
        {"id": "entrance", "label": "Main Entrance", "type": "entrance", "x": 0, "y": 0, "floor": 1, "accessible": True},
        {"id": "lobby",    "label": "Lobby",          "type": "corridor", "x": 10, "y": 0, "floor": 1, "accessible": True},
        {"id": "lift1",    "label": "Elevator",        "type": "elevator", "x": 10, "y": 10, "floor": 1, "accessible": True},
        {"id": "stairs1",  "label": "Staircase",       "type": "stairs",   "x": 15, "y": 10, "floor": 1, "accessible": False},
        {"id": "room101",  "label": "Room 101",         "type": "room",     "x": 20, "y": 0, "floor": 1, "accessible": True},
        {"id": "room102",  "label": "Room 102",         "type": "room",     "x": 30, "y": 0, "floor": 1, "accessible": True},
        {"id": "washroom1","label": "Washroom",         "type": "washroom", "x": 25, "y": 5, "floor": 1, "accessible": True},
        {"id": "f2_lobby", "label": "Floor 2 Lobby",   "type": "corridor", "x": 10, "y": 10, "floor": 2, "accessible": True},
        {"id": "room201",  "label": "Room 201",         "type": "room",     "x": 20, "y": 10, "floor": 2, "accessible": True},
        {"id": "room204",  "label": "Room 204",         "type": "room",     "x": 50, "y": 10, "floor": 2, "accessible": True},
        {"id": "reception","label": "Reception",        "type": "reception","x": 5,  "y": 0, "floor": 1, "accessible": True},
        {"id": "exit1",    "label": "Emergency Exit",   "type": "exit",     "x": 35, "y": 0, "floor": 1, "accessible": True},
    ],
    "edges": [
        {"from": "entrance", "to": "lobby",    "distanceM": 10, "type": "corridor"},
        {"from": "entrance", "to": "reception","distanceM": 5,  "type": "corridor"},
        {"from": "lobby",    "to": "lift1",    "distanceM": 10, "type": "corridor"},
        {"from": "lobby",    "to": "stairs1",  "distanceM": 15, "type": "corridor"},
        {"from": "lobby",    "to": "room101",  "distanceM": 20, "type": "corridor"},
        {"from": "room101",  "to": "room102",  "distanceM": 10, "type": "corridor"},
        {"from": "room101",  "to": "washroom1","distanceM": 8,  "type": "corridor"},
        {"from": "room102",  "to": "exit1",    "distanceM": 5,  "type": "door"},
        {"from": "lift1",    "to": "f2_lobby", "distanceM": 5,  "type": "elevator"},
        {"from": "stairs1",  "to": "f2_lobby", "distanceM": 8,  "type": "stairs"},
        {"from": "f2_lobby", "to": "room201",  "distanceM": 10, "type": "corridor"},
        {"from": "room201",  "to": "room204",  "distanceM": 30, "type": "corridor"},
    ],
}

register_map("demo-building", DEMO_MAP)
