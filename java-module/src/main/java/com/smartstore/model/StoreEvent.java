package com.smartstore.model;

import java.util.Objects;

/**
 * Domain model representing an operational retail event.
 * Encapsulates incident attributes and state.
 */
public class StoreEvent {
    private String eventId;
    private String eventType;
    private String cameraId;
    private String zoneId;
    private String trackId;
    private String timestamp;
    private String severity;
    private String status;
    private String description;
    private Integer peopleCount;

    public StoreEvent() {
    }

    public StoreEvent(String eventId, String eventType, String cameraId, String zoneId,
                      String timestamp, String severity, String status, String description,
                      Integer peopleCount, String trackId) {
        this.eventId = eventId;
        this.eventType = eventType;
        this.cameraId = cameraId;
        this.zoneId = zoneId;
        this.timestamp = timestamp;
        this.severity = severity;
        this.status = status != null ? status : "ACTIVE";
        this.description = description;
        this.peopleCount = peopleCount;
        this.trackId = trackId;
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getCameraId() {
        return cameraId;
    }

    public void setCameraId(String cameraId) {
        this.cameraId = cameraId;
    }

    public String getZoneId() {
        return zoneId;
    }

    public void setZoneId(String zoneId) {
        this.zoneId = zoneId;
    }

    public String getTrackId() {
        return trackId;
    }

    public void setTrackId(String trackId) {
        this.trackId = trackId;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getPeopleCount() {
        return peopleCount;
    }

    public void setPeopleCount(Integer peopleCount) {
        this.peopleCount = peopleCount;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StoreEvent that = (StoreEvent) o;
        return Objects.equals(eventId, that.eventId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(eventId);
    }

    @Override
    public String toString() {
        return "StoreEvent{" +
                "eventId='" + eventId + '\'' +
                ", eventType='" + eventType + '\'' +
                ", cameraId='" + cameraId + '\'' +
                ", zoneId='" + zoneId + '\'' +
                ", severity='" + severity + '\'' +
                ", status='" + status + '\'' +
                ", peopleCount=" + peopleCount +
                '}';
    }
}
