package com.smartstore.model;

/**
 * Encapsulates the output of business validation rules.
 */
public class ValidationResult {
    private final boolean valid;
    private final String eventId;
    private final String message;
    private final String ruleViolated;

    public ValidationResult(boolean valid, String eventId, String message) {
        this(valid, eventId, message, null);
    }

    public ValidationResult(boolean valid, String eventId, String message, String ruleViolated) {
        this.valid = valid;
        this.eventId = eventId;
        this.message = message;
        this.ruleViolated = ruleViolated;
    }

    public boolean isValid() {
        return valid;
    }

    public String getEventId() {
        return eventId;
    }

    public String getMessage() {
        return message;
    }

    public String getRuleViolated() {
        return ruleViolated;
    }

    /**
     * Serializes result to a clean JSON string without external JSON library dependencies.
     */
    public String toJson() {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"valid\":").append(valid).append(",");
        sb.append("\"event_id\":\"").append(escapeJson(eventId)).append("\",");
        sb.append("\"message\":\"").append(escapeJson(message)).append("\"");
        if (ruleViolated != null) {
            sb.append(",\"rule_violated\":\"").append(escapeJson(ruleViolated)).append("\"");
        }
        sb.append("}");
        return sb.toString();
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    @Override
    public String toString() {
        return toJson();
    }
}
