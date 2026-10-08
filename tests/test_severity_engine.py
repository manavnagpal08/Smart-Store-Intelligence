"""Unit tests for SeverityEngine."""

import pytest
from ml.intelligence.severity_engine import SeverityEngine
from ml.intelligence.models import EventSeverity


def test_crowd_severity_levels():
    engine = SeverityEngine()
    thresholds = {"low": 5, "medium": 8, "high": 12, "critical": 18}

    assert engine.calculate_crowd_severity(3, thresholds) is None
    assert engine.calculate_crowd_severity(5, thresholds) == EventSeverity.LOW.value
    assert engine.calculate_crowd_severity(8, thresholds) == EventSeverity.MEDIUM.value
    assert engine.calculate_crowd_severity(10, thresholds) == EventSeverity.MEDIUM.value
    assert engine.calculate_crowd_severity(12, thresholds) == EventSeverity.HIGH.value
    assert engine.calculate_crowd_severity(15, thresholds) == EventSeverity.HIGH.value
    assert engine.calculate_crowd_severity(18, thresholds) == EventSeverity.CRITICAL.value
    assert engine.calculate_crowd_severity(25, thresholds) == EventSeverity.CRITICAL.value


def test_queue_severity_levels():
    engine = SeverityEngine()
    thresholds = {"low": 3, "medium": 5, "high": 8, "critical": 12}

    assert engine.calculate_queue_severity(2, thresholds) is None
    assert engine.calculate_queue_severity(3, thresholds) == EventSeverity.LOW.value
    assert engine.calculate_queue_severity(5, thresholds) == EventSeverity.MEDIUM.value
    assert engine.calculate_queue_severity(8, thresholds) == EventSeverity.HIGH.value
    assert engine.calculate_queue_severity(14, thresholds) == EventSeverity.CRITICAL.value


def test_restricted_severity():
    engine = SeverityEngine()
    assert engine.calculate_restricted_severity(duration_frames=5) == EventSeverity.HIGH.value
    assert engine.calculate_restricted_severity(duration_frames=100) == EventSeverity.CRITICAL.value


def test_obstruction_severity():
    engine = SeverityEngine()
    assert engine.calculate_obstruction_severity(duration_frames=20, count=2) == EventSeverity.MEDIUM.value
    assert engine.calculate_obstruction_severity(duration_frames=90, count=2) == EventSeverity.HIGH.value
    assert engine.calculate_obstruction_severity(duration_frames=20, count=5) == EventSeverity.HIGH.value
