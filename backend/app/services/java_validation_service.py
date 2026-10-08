"""Java Business Validation Integration Service."""

import os
import json
import logging
import subprocess
from typing import Dict, Any, Optional

from backend.app.config import settings
from backend.app.schemas.event import ValidationResultSchema

logger = logging.getLogger("backend.java_service")


class JavaValidationService:
    """Invokes the Java OOP Business Validation Module to validate events against business rules."""

    def __init__(self, java_bin_dir: Optional[str] = None):
        # Resolve path to compiled Java classes
        if java_bin_dir:
            self.java_bin_dir = java_bin_dir
        else:
            # Look in standard locations
            candidate = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../java-module/bin"))
            if not os.path.exists(candidate):
                candidate = os.path.abspath(os.path.join(os.getcwd(), "java-module/bin"))
            self.java_bin_dir = candidate

    def validate_event(self, event_data: Dict[str, Any]) -> ValidationResultSchema:
        """Validate an event dictionary against the Java OOP Business Module."""
        json_payload = json.dumps(event_data, default=str)
        event_id = str(event_data.get("event_id", "UNKNOWN"))

        # Try executing Java CLI validator
        try:
            cmd = ["java", "-cp", self.java_bin_dir, "com.smartstore.Main", "--json", json_payload]
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=5
            )

            stdout_clean = proc.stdout.strip()
            if stdout_clean:
                try:
                    res_json = json.loads(stdout_clean)
                    return ValidationResultSchema(
                        valid=bool(res_json.get("valid", False)),
                        event_id=res_json.get("event_id", event_id),
                        message=res_json.get("message", "Validation completed."),
                        rule_violated=res_json.get("rule_violated")
                    )
                except json.JSONDecodeError:
                    pass

            if proc.returncode != 0:
                err_msg = proc.stderr.strip() or stdout_clean or "Validation failed in Java business module."
                return ValidationResultSchema(
                    valid=False,
                    event_id=event_id,
                    message=err_msg,
                    rule_violated="JavaExecutionError"
                )

        except FileNotFoundError:
            logger.warning("Java runtime not found on PATH. Falling back to native Python business validation.")
        except subprocess.TimeoutExpired:
            logger.error("Java validation subprocess timed out.")
            return ValidationResultSchema(
                valid=False,
                event_id=event_id,
                message="Java validation subprocess timed out.",
                rule_violated="Timeout"
            )
        except Exception as e:
            logger.warning(f"Java validation invocation exception: {e}. Running fallback validation.")

        # Fallback Python-side business validation if Java subprocess could not be launched
        return self._python_fallback_validate(event_data)

    def _python_fallback_validate(self, event_data: Dict[str, Any]) -> ValidationResultSchema:
        """Native fallback business rules mirroring Java OOP rules."""
        event_id = str(event_data.get("event_id", ""))
        event_type = str(event_data.get("event_type", "")).upper()
        severity = str(event_data.get("severity", "")).upper()
        people_count = event_data.get("people_count")

        # 1. Event ID format
        if not event_id or not event_id.startswith("EVT-"):
            return ValidationResultSchema(
                valid=False, event_id=event_id, message="Invalid event ID pattern.", rule_violated="BasicStructureRule"
            )

        # 2. Negative count check
        if people_count is not None and people_count < 0:
            return ValidationResultSchema(
                valid=False, event_id=event_id, message="People count cannot be negative.", rule_violated="BasicStructureRule"
            )

        # 3. Crowd high count cannot be LOW severity
        if event_type == "CROWD_DENSITY" and people_count and people_count >= 15 and severity == "LOW":
            return ValidationResultSchema(
                valid=False, event_id=event_id,
                message=f"Crowd count of {people_count} exceeds critical threshold and cannot be LOW severity.",
                rule_violated="CrowdBusinessRule"
            )

        # 4. Restricted area requires HIGH or CRITICAL
        if event_type == "RESTRICTED_AREA_ENTRY" and severity not in ("HIGH", "CRITICAL"):
            return ValidationResultSchema(
                valid=False, event_id=event_id,
                message="Restricted area entries require HIGH or CRITICAL severity.",
                rule_violated="RestrictedAreaBusinessRule"
            )

        return ValidationResultSchema(
            valid=True, event_id=event_id, message="Event passed fallback business validation."
        )


java_validator = JavaValidationService()
