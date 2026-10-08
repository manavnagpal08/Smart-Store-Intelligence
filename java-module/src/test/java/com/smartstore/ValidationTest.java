package com.smartstore;

import com.smartstore.model.StoreEvent;
import com.smartstore.model.ValidationResult;
import com.smartstore.validation.EventValidator;

/**
 * Self-contained Java unit test suite demonstrating test verification without external test runners.
 */
public class ValidationTest {

    private static int passed = 0;
    private static int failed = 0;

    public static void main(String[] args) {
        System.out.println("==================================================");
        System.out.println(" Running Java OOP Business Validation Unit Tests");
        System.out.println("==================================================");

        testValidCrowdEvent();
        testInvalidEventIdFormat();
        testMissingCameraId();
        testInvalidEventType();
        testInvalidSeverity();
        testNegativePeopleCount();
        testCrowdHighDensityLowSeverityRule();
        testRestrictedAreaInvalidSeverity();
        testRestrictedAreaMissingTrackId();
        testQueueCongestionMissingZone();

        System.out.println("--------------------------------------------------");
        System.out.println(" Results: " + passed + " Passed, " + failed + " Failed");
        System.out.println("==================================================");

        if (failed > 0) {
            System.exit(1);
        } else {
            System.exit(0);
        }
    }

    private static void assertTrue(String testName, boolean condition, String message) {
        if (condition) {
            System.out.println("[PASS] " + testName);
            passed++;
        } else {
            System.err.println("[FAIL] " + testName + ": " + message);
            failed++;
        }
    }

    private static void testValidCrowdEvent() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0001", "CROWD_DENSITY", "CAM-01", "AISLE-A",
                "2026-09-25T10:15:08", "HIGH", "ACTIVE", "High density", 12, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testValidCrowdEvent", res.isValid(), res.getMessage());
    }

    private static void testInvalidEventIdFormat() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "INVALID-ID-123", "CROWD_DENSITY", "CAM-01", "AISLE-A",
                "2026-09-25T10:15:08", "HIGH", "ACTIVE", "Test", 10, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testInvalidEventIdFormat", !res.isValid(), "Expected failure on invalid ID pattern");
    }

    private static void testMissingCameraId() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0002", "CROWD_DENSITY", "", "AISLE-A",
                "2026-09-25T10:15:08", "HIGH", "ACTIVE", "Test", 10, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testMissingCameraId", !res.isValid(), "Expected failure on empty camera ID");
    }

    private static void testInvalidEventType() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0003", "UNKNOWN_TYPE", "CAM-01", "AISLE-A",
                "2026-09-25T10:15:08", "HIGH", "ACTIVE", "Test", 10, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testInvalidEventType", !res.isValid(), "Expected failure on unknown event type");
    }

    private static void testInvalidSeverity() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0004", "CROWD_DENSITY", "CAM-01", "AISLE-A",
                "2026-09-25T10:15:08", "SUPER_CRITICAL", "ACTIVE", "Test", 10, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testInvalidSeverity", !res.isValid(), "Expected failure on non-enum severity");
    }

    private static void testNegativePeopleCount() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0005", "CROWD_DENSITY", "CAM-01", "AISLE-A",
                "2026-09-25T10:15:08", "LOW", "ACTIVE", "Test", -5, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testNegativePeopleCount", !res.isValid(), "Expected failure on negative count");
    }

    private static void testCrowdHighDensityLowSeverityRule() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0006", "CROWD_DENSITY", "CAM-01", "AISLE-A",
                "2026-09-25T10:15:08", "LOW", "ACTIVE", "Crowd surge", 20, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testCrowdHighDensityLowSeverityRule", !res.isValid() && res.getMessage().contains("LOW severity"), "Expected failure on high count with LOW severity");
    }

    private static void testRestrictedAreaInvalidSeverity() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0007", "RESTRICTED_AREA_ENTRY", "CAM-01", "RESTRICTED",
                "2026-09-25T10:15:08", "LOW", "ACTIVE", "Intrusion", 1, "TRACK-001"
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testRestrictedAreaInvalidSeverity", !res.isValid() && res.getMessage().contains("HIGH or CRITICAL"), "Expected failure on restricted entry with LOW severity");
    }

    private static void testRestrictedAreaMissingTrackId() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0008", "RESTRICTED_AREA_ENTRY", "CAM-01", "RESTRICTED",
                "2026-09-25T10:15:08", "HIGH", "ACTIVE", "Intrusion", 1, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testRestrictedAreaMissingTrackId", !res.isValid(), "Expected failure on missing track ID for restricted area");
    }

    private static void testQueueCongestionMissingZone() {
        EventValidator validator = new EventValidator();
        StoreEvent evt = new StoreEvent(
                "EVT-20260925-0009", "QUEUE_CONGESTION", "CAM-01", "",
                "2026-09-25T10:15:08", "MEDIUM", "ACTIVE", "Queue", 5, null
        );
        ValidationResult res = validator.validate(evt);
        assertTrue("testQueueCongestionMissingZone", !res.isValid(), "Expected failure on missing zone for queue congestion");
    }
}
