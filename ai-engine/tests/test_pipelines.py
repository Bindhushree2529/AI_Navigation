"""
AI Engine Tests
Run: pytest tests/ -v
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from PIL import Image
import numpy as np
import io


def make_test_image(width=640, height=480) -> Image.Image:
    arr = np.random.randint(0, 255, (height, width, 3), dtype=np.uint8)
    return Image.fromarray(arr)


# ─── Detection Pipeline Tests ─────────────────────────────────────────────────

class TestDetectionPipeline:
    @pytest.mark.asyncio
    async def test_run_detection_no_model_returns_empty(self):
        from app.pipelines.detection import run_detection
        with patch("app.pipelines.detection.ModelRegistry.get", return_value=None):
            result = await run_detection(make_test_image())
        assert result["detections"] == []
        assert result["modelName"] == "yolo"

    @pytest.mark.asyncio
    async def test_run_detection_with_mock_yolo(self):
        from app.pipelines.detection import run_detection

        mock_box = MagicMock()
        mock_box.conf = [0.85]
        mock_box.cls = [0]
        mock_box.xyxy = [MagicMock(tolist=lambda: [100, 100, 200, 300])]

        mock_result = MagicMock()
        mock_result.boxes = [mock_box]

        mock_yolo = MagicMock()
        mock_yolo.return_value = [mock_result]
        mock_yolo.names = {0: "person"}

        with patch("app.pipelines.detection.ModelRegistry.get") as mock_get, \
             patch("app.pipelines.detection.run_depth_estimation", new_callable=AsyncMock, return_value=None):
            mock_get.side_effect = lambda name: mock_yolo if name == "yolo" else None
            result = await run_detection(make_test_image())

        assert len(result["detections"]) == 1
        assert result["detections"][0]["label"] == "person"
        assert result["detections"][0]["category"] == "PERSON"
        assert result["detections"][0]["confidence"] == 0.85

    def test_get_direction_left(self):
        from app.pipelines.detection import _get_direction
        assert _get_direction(50, 640) == "on your left"

    def test_get_direction_right(self):
        from app.pipelines.detection import _get_direction
        assert _get_direction(500, 640) == "on your right"

    def test_get_direction_ahead(self):
        from app.pipelines.detection import _get_direction
        assert _get_direction(320, 640) == "ahead"

    def test_distance_from_depth(self):
        from app.pipelines.detection import _estimate_distance_from_depth
        depth_map = np.ones((480, 640)) * 5.0
        dist = _estimate_distance_from_depth(depth_map, [100, 100, 200, 200])
        assert dist is not None
        assert dist > 0


# ─── OCR Pipeline Tests ───────────────────────────────────────────────────────

class TestOcrPipeline:
    @pytest.mark.asyncio
    async def test_extract_text_returns_string(self):
        from app.pipelines.ocr import extract_text

        mock_ocr = MagicMock()
        mock_ocr.ocr.return_value = [[[None, ("Hello World", 0.95)]]]

        with patch("app.pipelines.ocr._get_ocr", return_value=mock_ocr):
            result = await extract_text(make_test_image())

        assert "Hello World" in result

    @pytest.mark.asyncio
    async def test_extract_text_filters_low_confidence(self):
        from app.pipelines.ocr import extract_text

        mock_ocr = MagicMock()
        mock_ocr.ocr.return_value = [[[None, ("Low conf", 0.3)]]]

        with patch("app.pipelines.ocr._get_ocr", return_value=mock_ocr):
            result = await extract_text(make_test_image())

        assert result == ""

    @pytest.mark.asyncio
    async def test_extract_text_empty_image(self):
        from app.pipelines.ocr import extract_text

        mock_ocr = MagicMock()
        mock_ocr.ocr.return_value = [[]]

        with patch("app.pipelines.ocr._get_ocr", return_value=mock_ocr):
            result = await extract_text(make_test_image())

        assert result == ""


# ─── Scene Description Tests ──────────────────────────────────────────────────

class TestScenePipeline:
    @pytest.mark.asyncio
    async def test_fallback_description_no_detections(self):
        from app.pipelines.scene import _fallback_description

        with patch("app.pipelines.scene.run_detection", new_callable=AsyncMock) as mock_detect:
            mock_detect.return_value = {"detections": []}
            result = await _fallback_description(make_test_image())

        assert "clear" in result.lower() or "no objects" in result.lower()

    @pytest.mark.asyncio
    async def test_fallback_description_with_detections(self):
        from app.pipelines.scene import _fallback_description

        with patch("app.pipelines.scene.run_detection", new_callable=AsyncMock) as mock_detect:
            mock_detect.return_value = {
                "detections": [{"spokenText": "Person ahead, 2 meters"}]
            }
            result = await _fallback_description(make_test_image())

        assert "Person ahead" in result


# ─── Speech Pipeline Tests ────────────────────────────────────────────────────

class TestSpeechPipeline:
    def test_get_voice_english(self):
        from app.pipelines.speech import get_voice
        voice = get_voice("en-US", "female")
        assert "Jenny" in voice or "en-US" in voice

    def test_get_voice_fallback(self):
        from app.pipelines.speech import get_voice
        voice = get_voice("xx-XX", "female")
        assert "en-US" in voice

    @pytest.mark.asyncio
    async def test_tts_returns_bytes(self):
        from app.pipelines.speech import text_to_speech

        mock_audio = b"fake_audio_data"

        async def mock_stream():
            yield {"type": "audio", "data": mock_audio}

        mock_communicate = MagicMock()
        mock_communicate.stream.return_value = mock_stream()

        with patch("app.pipelines.speech.edge_tts.Communicate", return_value=mock_communicate):
            result = await text_to_speech("Hello world")

        assert result == mock_audio


# ─── API Router Tests ─────────────────────────────────────────────────────────

class TestDetectRouter:
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from app.main import app
        return TestClient(app)

    def test_detect_requires_image(self, client):
        res = client.post("/api/detect")
        assert res.status_code == 422

    def test_detect_rejects_non_image(self, client):
        res = client.post("/api/detect", files={"file": ("test.txt", b"hello", "text/plain")})
        assert res.status_code == 400

    def test_health_endpoint(self, client):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
