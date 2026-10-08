package com.smartstore.model;

/**
 * Operational incident lifecycle statuses.
 */
public enum EventStatus {
    DETECTED,
    ACTIVE,
    ACKNOWLEDGED,
    RESOLVED;

    public static boolean isValid(String name) {
        if (name == null) return false;
        try {
            EventStatus.valueOf(name.trim().toUpperCase());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
