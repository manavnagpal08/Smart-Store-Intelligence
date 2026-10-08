package com.smartstore.validation;

import com.smartstore.exception.InvalidEventException;
import com.smartstore.model.EventType;
import com.smartstore.model.StoreEvent;

/**
 * Business Rule for Checkout Queue Congestion:
 * Validates checkout zone association and enforces non-zero queue counts.
 */
public class QueueBusinessRule implements BusinessRule {

    @Override
    public String getRuleName() {
        return "QueueBusinessRule";
    }

    @Override
    public void validate(StoreEvent event) throws InvalidEventException {
        if (!EventType.QUEUE_CONGESTION.name().equalsIgnoreCase(event.getEventType())) {
            return;
        }

        Integer count = event.getPeopleCount();
        if (count == null || count <= 0) {
            throw new InvalidEventException("INVALID_QUEUE_COUNT",
                    "Queue congestion events must record a positive people_count.");
        }

        if (event.getZoneId() == null || event.getZoneId().trim().isEmpty()) {
            throw new InvalidEventException("MISSING_QUEUE_ZONE",
                    "Queue congestion events must identify the affected checkout lane zone_id.");
        }
    }
}
