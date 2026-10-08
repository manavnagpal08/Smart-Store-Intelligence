package com.smartstore.model;

/**
 * Enumeration of incident severity tiers.
 */
public enum EventSeverity {
    LOW(1),
    MEDIUM(2),
    HIGH(3),
    CRITICAL(4);

    private final int level;

    EventSeverity(int level) {
        this.level = level;
    }

    public int getLevel() {
        return level;
    }

    public static boolean isValid(String name) {
        if (name == null) return false;
        try {
            EventSeverity.valueOf(name.trim().toUpperCase());
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
