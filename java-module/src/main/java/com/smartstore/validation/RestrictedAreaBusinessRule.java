package com.smartstore.validation;

import com.smartstore.exception.InvalidEventException;
import com.smartstore.model.EventType;
import com.smartstore.model.StoreEvent;

/**
 * Business Rule for Restricted Area Entry:
 * Requires restricted entry events to have a minimum severity of HIGH or CRITICAL,
 * and mandates a valid anonymous track ID.
 */
public class RestrictedAreaBusinessRule implements BusinessRule {

    @Override
    public String getRuleName() {
        return "RestrictedAreaBusinessRule";
    }

    @Override
    public void validate(StoreEvent event) throws InvalidEventException {
        if (!EventType.RESTRICTED_AREA_ENTRY.name().equalsIgnoreCase(event.getEventType())) {
            return;
        }

        String severity = event.getSeverity() != null ? event.getSeverity().toUpperCase() : "";
        if (!"HIGH".equals(severity) && !"CRITICAL".equals(severity)) {
            throw new InvalidEventException("INVALID_RESTRICTED_SEVERITY",
                    "Restricted area entries constitute high-security risks and require HIGH or CRITICAL severity (received: " + severity + ").");
        }

        if (event.getTrackId() == null || event.getTrackId().trim().isEmpty()) {
            throw new InvalidEventException("MISSING_INTRUDER_TRACK_ID",
                    "Restricted area entry events must specify the target anonymous track_id.");
        }
    }
}
