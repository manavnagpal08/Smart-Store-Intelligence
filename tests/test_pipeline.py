"""Unit and Integration tests for Vision Pipeline and JSON Exporter."""

import os
import tempfile
import json
import pytest
import numpy as np

from ml.output.json_exporter import JSONExporter
from ml.zones.zone_config import Zone
from ml.zones.zone_manager import ZoneManager
from ml.pipeline.vision_pipeline import VisionPipeline


def test_json_exporter():
    with tempfile.TemporaryDirectory() as tmpdir:
        json_path = os.path.join(tmpdir, "test_out.json")
        exporter = JSONExporter(output_path=json_path, sample_interval=1)

        tracks = [
            {
                "track_id": "TRACK-001",
                "bbox": [10, 20, 50, 100],
                "confidence": 0.9523,
                "center": [30, 60],
                "zone_id": "AISLE-A"
            }
        ]
        counts = {"AISLE-A": 1, "CHECKOUT": 0}

        record = exporter.add_frame_result(
            camera_id="CAM-TEST",
            frame_number=1,
            tracks=tracks,
            zone_counts=counts,
            timestamp="2026-09-24T22:00:00"
        )

        assert record is not None
        assert record["camera_id"] == "CAM-TEST"
        assert record["tracks"][0]["track_id"] == "TRACK-001"
        assert record["tracks"][0]["confidence"] == 0.952
        assert record["zone_counts"]["AISLE-A"] == 1

        saved_path = exporter.save()
        assert os.path.exists(saved_path)

        with open(saved_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert len(data) == 1
            assert data[0]["frame_number"] == 1


def test_pipeline_missing_video_error():
    pipeline = VisionPipeline(
        config_dict={
            "camera_id": "CAM-01",
            "model_path": "yolov8n.pt",
            "zones": []
        }
    )
    with pytest.raises(FileNotFoundError):
        pipeline.process_video("datasets/non_existent_video.mp4")


def test_pipeline_empty_frame_handling():
    pipeline = VisionPipeline(
        config_dict={
            "camera_id": "CAM-01",
            "model_path": "yolov8n.pt",
            "zones": []
        }
    )
    with pytest.raises(ValueError, match="empty or invalid frame"):
        pipeline.process_frame(np.array([]), frame_number=1)
