"""Severity calculation engine for operational retail events."""

from typing import Dict, Any, Optional
from .models import EventType, EventSeverity


class SeverityEngine:
    """Computes event severity based on event type, occupancy levels, duration, and configurable thresholds."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    def calculate_crowd_severity(self, count: int, thresholds: Dict[str, int]) -> Optional[str]:
        """Determine severity for crowd density event.
        
        Returns None if count is below the minimum threshold.
        """
        crit = thresholds.get("critical", 18)
        high = thresholds.get("high", 12)
        med = thresholds.get("medium", 8)
        low = thresholds.get("low", 5)

        if count >= crit:
            return EventSeverity.CRITICAL.value
        elif count >= high:
            return EventSeverity.HIGH.value
        elif count >= med:
            return EventSeverity.MEDIUM.value
        elif count >= low:
            return EventSeverity.LOW.value
        return None

    def calculate_queue_severity(self, count: int, thresholds: Dict[str, int]) -> Optional[str]:
        """Determine severity for checkout queue congestion event.
        
        Returns None if count is below the minimum threshold.
        """
        crit = thresholds.get("critical", 12)
        high = thresholds.get("high", 8)
        med = thresholds.get("medium", 5)
        low = thresholds.get("low", 3)

        if count >= crit:
            return EventSeverity.CRITICAL.value
        elif count >= high:
            return EventSeverity.HIGH.value
        elif count >= med:
            return EventSeverity.MEDIUM.value
        elif count >= low:
            return EventSeverity.LOW.value
        return None

    def calculate_restricted_severity(self, duration_frames: int = 1, default_sev: str = "HIGH") -> str:
        """Determine severity for restricted area entry."""
        if duration_frames > 60:
            return EventSeverity.CRITICAL.value
        return default_sev

    def calculate_obstruction_severity(self, duration_frames: int = 20, count: int = 1) -> str:
        """Determine severity for possible aisle obstruction."""
        if duration_frames > 80 or count > 4:
            return EventSeverity.HIGH.value
        return EventSeverity.MEDIUM.value
