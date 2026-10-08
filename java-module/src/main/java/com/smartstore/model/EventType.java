package com.smartstore.model;

/**
 * Controlled enumeration of store operational event types.
 */
public enum EventType {
    CROWD_DENSITY,
    QUEUE_CONGESTION,
    RESTRICTED_AREA_ENTRY,
    AISLE_OBSTRUCTION;

    public static boolean isValid(String name) {
        if (name == null) return false;
        try {
            EventType.valueOf(name.trim().toUpperCase());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
