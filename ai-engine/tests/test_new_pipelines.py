"""
Tests for new NaviAssist pipelines:
- Traffic light color analysis
- Zebra crossing detection
- Road safety decision engine
- Indoor navigation (A* path planning)
- Weather pipeline (mocked)
"""
import pytest
import numpy as np
from PIL import Image
from unittest.mock import AsyncMock, patch


# ── Helpers ───────────────────────────────────────────────────────────────────

def _solid_image(r, g, b, size=(100, 100)) -> Image.Image:
    arr = np.full((size[1], size[0], 3), [r, g, b], dtype=np.uint8)
    return Image.fromarray(arr)


# ── Traffic light color analysis ──────────────────────────────────────────────

class TestTrafficLightColor:
    def test_red_light_detected(self):
        from app.pipelines.traffic import _analyze_traffic_light_color
        # Pure red image
        img = _solid_image(220, 20, 20)
        bbox = {"x1": 0, "y1": 0, "x2": 100, "y2": 100}
        result = _analyze_traffic_light_color(img, bbox)
        assert result == "red"

    def test_green_light_detected(self):
        from app.pipelines.traffic import _analyze_traffic_light_color
        img = _solid_image(20, 200, 20)
        bbox = {"x1": 0, "y1": 0, "x2": 100, "y2": 100}
        result = _analyze_traffic_light_color(img, bbox)
        assert result == "green"

    def test_yellow_light_detected(self):
        from app.pipelines.traffic import _analyze_traffic_light_color
        img = _solid_image(220, 180, 20)
        bbox = {"x1": 0, "y1": 0, "x2": 100, "y2": 100}
        result = _analyze_traffic_light_color(img, bbox)
        assert result == "yellow"

    def test_empty_bbox_returns_unknown(self):
        from app.pipelines.traffic import _analyze_traffic_light_color
        img = _solid_image(220, 20, 20)
        bbox = {"x1": 50, "y1": 50, "x2": 50, "y2": 50}  # zero area
        result = _analyze_traffic_light_color(img, bbox)
        assert result == "unknown"


# ── Zebra crossing detection ──────────────────────────────────────────────────

class TestZebraCrossing:
    def test_no_crossing_on_blank_image(self):
        from app.pipelines.traffic import _detect_zebra_crossing
        img = _solid_image(128, 128, 128, size=(640, 480))
        assert _detect_zebra_crossing(img) is False

    def test_crossing_detected_with_stripes(self):
        from app.pipelines.traffic import _detect_zebra_crossing
        # Create image with horizontal white stripes in lower half
        arr = np.zeros((480, 640, 3), dtype=np.uint8)
        arr[:] = 100  # gray background
        for y in range(290, 480, 20):
            arr[y:y+10, 50:590] = 255  # white stripes
        img = Image.fromarray(arr)
        assert _detect_zebra_crossing(img) is True


# ── Road safety decision engine ───────────────────────────────────────────────

class TestRoadSafety:
    def _make_vehicle(self, dist=3.0, direction="ahead"):
        return {
            "label": "car", "category": "VEHICLE",
            "distanceM": dist, "confidence": 0.9,
            "spokenText": f"Car {direction}",
            "boundingBox": {"x1": 200, "y1": 100, "x2": 400, "y2": 300},
        }

    def test_red_light_warning_present(self):
        from app.pipelines.road_safety import analyze_road_safety
        scene = {
            "trafficLights": [{"lightColor": "red", "label": "traffic light"}],
            "vehicles": [], "pedestrians": [], "stopSigns": [], "zebraCrossing": False,
        }
        result = analyze_road_safety(scene)
        assert result["trafficLightColor"] == "red"
        assert "red" in result["primaryAlert"].lower()

    def test_vehicle_warning_high_priority(self):
        from app.pipelines.road_safety import analyze_road_safety
        scene = {
            "trafficLights": [],
            "vehicles": [self._make_vehicle(dist=2.0)],
            "pedestrians": [], "stopSigns": [], "zebraCrossing": False,
        }
        result = analyze_road_safety(scene)
        assert result["vehicleCount"] == 1
        assert any(w["type"] == "VEHICLE" for w in result["warnings"])

    def test_zebra_crossing_with_red_light_guidance(self):
        from app.pipelines.road_safety import analyze_road_safety
        scene = {
            "trafficLights": [{"lightColor": "red"}],
            "vehicles": [], "pedestrians": [], "stopSigns": [],
            "zebraCrossing": True,
        }
        result = analyze_road_safety(scene)
        assert result["zebraCrossing"] is True
        assert result["crossingGuidance"] is not None
        assert "red" in result["crossingGuidance"].lower()

    def test_clear_path(self):
        from app.pipelines.road_safety import analyze_road_safety
        scene = {
            "trafficLights": [], "vehicles": [],
            "pedestrians": [], "stopSigns": [], "zebraCrossing": False,
        }
        result = analyze_road_safety(scene)
        assert "clear" in result["primaryAlert"].lower()

    def test_warnings_sorted_by_priority(self):
        from app.pipelines.road_safety import analyze_road_safety
        scene = {
            "trafficLights": [{"lightColor": "green"}],
            "vehicles": [self._make_vehicle(dist=1.0)],
            "pedestrians": [{"spokenText": "Person ahead"}],
            "stopSigns": [], "zebraCrossing": False,
        }
        result = analyze_road_safety(scene)
        priorities = [w["priority"] for w in result["warnings"]]
        assert priorities == sorted(priorities)


# ── Indoor navigation ─────────────────────────────────────────────────────────

class TestIndoorNavigation:
    def test_route_entrance_to_room204(self):
        from app.pipelines.indoor_nav import find_route, get_map
        floor_map = get_map("demo-building")
        assert floor_map is not None
        route = find_route(floor_map, "entrance", "room204", prefer_accessible=True)
        assert route is not None
        assert route["totalDistanceM"] > 0
        assert len(route["steps"]) > 0
        # Should use elevator (accessible), not stairs
        edge_types = [s["edgeType"] for s in route["steps"]]
        assert "stairs" not in edge_types

    def test_accessible_route_avoids_stairs(self):
        from app.pipelines.indoor_nav import find_route, get_map
        floor_map = get_map("demo-building")
        route = find_route(floor_map, "entrance", "room201", prefer_accessible=True)
        assert route is not None
        edge_types = [s["edgeType"] for s in route["steps"]]
        assert "stairs" not in edge_types
        assert "elevator" in edge_types

    def test_nonexistent_destination_returns_none(self):
        from app.pipelines.indoor_nav import find_route, get_map
        floor_map = get_map("demo-building")
        route = find_route(floor_map, "entrance", "nonexistent_node")
        assert route is None

    def test_find_node_by_label(self):
        from app.pipelines.indoor_nav import find_node_by_label, get_map
        floor_map = get_map("demo-building")
        node_id = find_node_by_label(floor_map, "Room 204")
        assert node_id == "room204"

    def test_find_node_partial_match(self):
        from app.pipelines.indoor_nav import find_node_by_label, get_map
        floor_map = get_map("demo-building")
        node_id = find_node_by_label(floor_map, "washroom")
        assert node_id == "washroom1"

    def test_same_start_end(self):
        from app.pipelines.indoor_nav import find_route, get_map
        floor_map = get_map("demo-building")
        route = find_route(floor_map, "entrance", "entrance")
        # A* with same start/end returns empty path
        assert route is not None
        assert route["totalDistanceM"] == 0.0


# ── Weather pipeline ──────────────────────────────────────────────────────────

class TestWeather:
    @pytest.mark.asyncio
    async def test_weather_returns_expected_fields(self):
        from app.pipelines.weather import get_weather
        mock_response = {
            "current": {
                "weather_code": 61,
                "temperature_2m": 22.5,
                "wind_speed_10m": 15.0,
                "relative_humidity_2m": 70,
                "visibility": 8000,
            }
        }
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value.raise_for_status = lambda: None
            mock_get.return_value.json = lambda: mock_response
            result = await get_weather(12.9716, 77.5946)

        assert result["condition"] == "Slight rain"
        assert result["isRaining"] is True
        assert result["isHazardous"] is False
        assert "Rain" in result["navigationAdvice"]
        assert result["temperatureC"] == 22.5

    @pytest.mark.asyncio
    async def test_thunderstorm_is_hazardous(self):
        from app.pipelines.weather import get_weather
        mock_response = {
            "current": {
                "weather_code": 95,
                "temperature_2m": 18.0,
                "wind_speed_10m": 60.0,
                "relative_humidity_2m": 90,
                "visibility": 500,
            }
        }
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value.raise_for_status = lambda: None
            mock_get.return_value.json = lambda: mock_response
            result = await get_weather(12.9716, 77.5946)

        assert result["isHazardous"] is True
        assert len(result["alerts"]) > 0

    @pytest.mark.asyncio
    async def test_clear_weather_no_alerts(self):
        from app.pipelines.weather import get_weather
        mock_response = {
            "current": {
                "weather_code": 0,
                "temperature_2m": 25.0,
                "wind_speed_10m": 10.0,
                "relative_humidity_2m": 50,
                "visibility": 10000,
            }
        }
        with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value.raise_for_status = lambda: None
            mock_get.return_value.json = lambda: mock_response
            result = await get_weather(12.9716, 77.5946)

        assert result["isHazardous"] is False
        assert result["isRaining"] is False
        assert result["alerts"] == []
