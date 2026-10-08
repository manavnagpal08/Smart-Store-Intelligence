"""
System Performance & Health Verification Script for Phase 5.
Measures API latency, Java OOP validation speed, and validates multi-tier system integration.
"""

import os
import sys
import time
import json
import statistics

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.java_validation_service import JavaValidationService

client = TestClient(app)


def measure_endpoint_latency(endpoint: str, method: str = "GET", payload: dict = None, runs: int = 10):
    latencies = []
    for _ in range(runs):
        start = time.perf_counter()
        if method == "GET":
            res = client.get(endpoint)
        elif method == "POST":
            res = client.post(endpoint, json=payload)
        latencies.append((time.perf_counter() - start) * 1000)
    return {
        "endpoint": endpoint,
        "method": method,
        "avg_ms": round(statistics.mean(latencies), 2),
        "min_ms": round(min(latencies), 2),
        "max_ms": round(max(latencies), 2),
    }


def measure_java_validation_speed(runs: int = 10):
    validator = JavaValidationService()
    event_payload = {
        "event_id": "EVT-20260925-0801",
        "event_type": "CROWD_DENSITY",
        "camera_id": "CAM-01",
        "zone_id": "ENTRANCE",
        "timestamp": "2026-09-25T10:00:00",
        "severity": "HIGH",
        "status": "ACTIVE",
        "people_count": 8,
    }
    latencies = []
    for _ in range(runs):
        start = time.perf_counter()
        res = validator.validate_event(event_payload)
        latencies.append((time.perf_counter() - start) * 1000)

    return {
        "module": "Java OOP Validator (Subprocess)",
        "avg_ms": round(statistics.mean(latencies), 2),
        "min_ms": round(min(latencies), 2),
        "max_ms": round(max(latencies), 2),
        "valid": res.valid,
    }


def main():
    print("=================================================================")
    print(" Smart Store Safety & Operations - Performance & Health Audit")
    print("=================================================================")

    # 1. Measure API Latencies
    print("\n--- 1. Backend REST API Latency Benchmarks ---")
    health_bench = measure_endpoint_latency("/api/health")
    print(f"GET /api/health       : Avg {health_bench['avg_ms']}ms (Min {health_bench['min_ms']}ms, Max {health_bench['max_ms']}ms)")

    events_bench = measure_endpoint_latency("/api/events")
    print(f"GET /api/events       : Avg {events_bench['avg_ms']}ms (Min {events_bench['min_ms']}ms, Max {events_bench['max_ms']}ms)")

    active_bench = measure_endpoint_latency("/api/events/active")
    print(f"GET /api/events/active: Avg {active_bench['avg_ms']}ms (Min {active_bench['min_ms']}ms, Max {active_bench['max_ms']}ms)")

    cameras_bench = measure_endpoint_latency("/api/cameras")
    print(f"GET /api/cameras      : Avg {cameras_bench['avg_ms']}ms (Min {cameras_bench['min_ms']}ms, Max {cameras_bench['max_ms']}ms)")

    # 2. Measure Java Validation Latency
    print("\n--- 2. Java OOP Validation Speed ---")
    java_bench = measure_java_validation_speed()
    print(f"Java Subprocess Exec  : Avg {java_bench['avg_ms']}ms (Min {java_bench['min_ms']}ms, Max {java_bench['max_ms']}ms)")
    print(f"Validation Result     : Valid={java_bench['valid']}")

    print("\n=================================================================")
    print(" Performance Benchmark Completed Successfully.")
    print("=================================================================")


if __name__ == "__main__":
    main()
