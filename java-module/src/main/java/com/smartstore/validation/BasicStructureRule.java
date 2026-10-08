package com.smartstore.validation;

import com.smartstore.exception.InvalidEventException;
import com.smartstore.model.EventSeverity;
import com.smartstore.model.EventStatus;
import com.smartstore.model.EventType;
import com.smartstore.model.StoreEvent;

/**
 * Validates fundamental structural invariants: event ID format, camera ID, valid enums.
 */
public class BasicStructureRule implements BusinessRule {

    @Override
    public String getRuleName() {
        return "BasicStructureRule";
    }

    @Override
    public void validate(StoreEvent event) throws InvalidEventException {
        if (event == null) {
            throw new InvalidEventException("NULL_EVENT", "Event payload cannot be null.");
        }

        // 1. Event ID
        if (event.getEventId() == null || event.getEventId().trim().isEmpty()) {
            throw new InvalidEventException("MISSING_EVENT_ID", "Event ID is required.");
        }
        if (!event.getEventId().matches("^EVT-\\d{8}-\\d{4}$")) {
            throw new InvalidEventException("INVALID_EVENT_ID_FORMAT",
                    "Event ID '" + event.getEventId() + "' does not match standard pattern EVT-YYYYMMDD-XXXX.");
        }

        // 2. Camera ID
        if (event.getCameraId() == null || event.getCameraId().trim().isEmpty()) {
            throw new InvalidEventException("MISSING_CAMERA_ID", "Camera ID is required.");
        }

        // 3. Event Type Enum
        if (!EventType.isValid(event.getEventType())) {
            throw new InvalidEventException("INVALID_EVENT_TYPE",
                    "Unknown or unsupported event type: '" + event.getEventType() + "'.");
        }

        // 4. Severity Enum
        if (!EventSeverity.isValid(event.getSeverity())) {
            throw new InvalidEventException("INVALID_SEVERITY",
                    "Invalid severity level: '" + event.getSeverity() + "'. Expected LOW, MEDIUM, HIGH, or CRITICAL.");
        }

        // 5. Status Enum
        if (!EventStatus.isValid(event.getStatus())) {
            throw new InvalidEventException("INVALID_STATUS",
                    "Invalid status: '" + event.getStatus() + "'. Expected DETECTED, ACTIVE, ACKNOWLEDGED, or RESOLVED.");
        }

        // 6. People Count non-negative
        if (event.getPeopleCount() != null && event.getPeopleCount() < 0) {
            throw new InvalidEventException("NEGATIVE_PEOPLE_COUNT",
                    "People count cannot be negative (received: " + event.getPeopleCount() + ").");
        }
    }
}
