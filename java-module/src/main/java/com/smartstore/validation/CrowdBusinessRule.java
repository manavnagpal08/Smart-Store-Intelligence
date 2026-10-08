package com.smartstore.validation;

import com.smartstore.exception.InvalidEventException;
import com.smartstore.model.EventType;
import com.smartstore.model.StoreEvent;

/**
 * Business Rule for Crowd Density Events:
 * Ensures crowd events have positive people count and enforces that high density (>= 15 people)
 * cannot be classified as LOW severity.
 */
public class CrowdBusinessRule implements BusinessRule {

    @Override
    public String getRuleName() {
        return "CrowdBusinessRule";
    }

    @Override
    public void validate(StoreEvent event) throws InvalidEventException {
        if (!EventType.CROWD_DENSITY.name().equalsIgnoreCase(event.getEventType())) {
            return; // Not applicable
        }

        Integer count = event.getPeopleCount();
        if (count == null || count <= 0) {
            throw new InvalidEventException("INVALID_CROWD_COUNT",
                    "Crowd density events must specify a positive people_count.");
        }

        String severity = event.getSeverity() != null ? event.getSeverity().toUpperCase() : "";

        // Business Rule: High crowd surge cannot be marked as LOW severity
        if (count >= 15 && "LOW".equals(severity)) {
            throw new InvalidEventException("INCONSISTENT_CROWD_SEVERITY",
                    "A crowd count of " + count + " people exceeds critical thresholds and cannot be assigned LOW severity.");
        }
    }
}
