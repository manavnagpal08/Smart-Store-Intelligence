package com.smartstore;

import com.smartstore.model.StoreEvent;
import com.smartstore.model.ValidationResult;
import com.smartstore.validation.EventValidator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * CLI Entry point for Java Business Validation Module.
 * Consumes JSON event telemetry from arguments, files, or stdin,
 * applies domain business rules, and outputs structured JSON validation results.
 */
public class Main {

    public static void main(String[] args) {
        String jsonInput = null;

        if (args.length >= 2 && "--file".equalsIgnoreCase(args[0])) {
            try {
                File file = new File(args[1]);
                if (!file.exists()) {
                    System.err.println("File not found: " + args[1]);
                    System.out.println(new ValidationResult(false, "ERROR", "File not found: " + args[1]).toJson());
                    System.exit(1);
                }
                StringBuilder sb = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        sb.append(line).append("\n");
                    }
                }
                jsonInput = sb.toString();
            } catch (Exception e) {
                System.out.println(new ValidationResult(false, "ERROR", "Error reading file: " + e.getMessage()).toJson());
                System.exit(1);
            }
        } else if (args.length >= 2 && "--json".equalsIgnoreCase(args[0])) {
            jsonInput = args[1];
        } else if (args.length == 1 && !args[0].startsWith("-")) {
            // Check if argument is a file path or raw JSON string
            if (new File(args[0]).exists()) {
                try {
                    StringBuilder sb = new StringBuilder();
                    try (BufferedReader reader = new BufferedReader(new FileReader(args[0], StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            sb.append(line).append("\n");
                        }
                    }
                    jsonInput = sb.toString();
                } catch (Exception e) {
                    jsonInput = args[0];
                }
            } else {
                jsonInput = args[0];
            }
        } else {
            // Read from Standard Input
            try {
                BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
                jsonInput = sb.toString().trim();
            } catch (Exception e) {
                jsonInput = null;
            }
        }

        if (jsonInput == null || jsonInput.trim().isEmpty()) {
            System.out.println(new ValidationResult(false, "ERROR", "No JSON input provided for validation.").toJson());
            System.exit(1);
        }

        try {
            StoreEvent event = parseEventJson(jsonInput);
            EventValidator validator = new EventValidator();
            ValidationResult result = validator.validate(event);

            // Output JSON to standard out
            System.out.println(result.toJson());

            if (!result.isValid()) {
                System.exit(1);
            } else {
                System.exit(0);
            }
        } catch (Exception e) {
            System.out.println(new ValidationResult(false, "ERROR", "JSON parsing failure: " + e.getMessage()).toJson());
            System.exit(2);
        }
    }

    /**
     * Lightweight JSON parser for StoreEvent properties to eliminate external dependency requirements.
     */
    public static StoreEvent parseEventJson(String json) {
        StoreEvent event = new StoreEvent();
        event.setEventId(extractField(json, "event_id"));
        event.setEventType(extractField(json, "event_type"));
        event.setCameraId(extractField(json, "camera_id"));
        event.setZoneId(extractField(json, "zone_id"));
        event.setTrackId(extractField(json, "track_id"));
        event.setTimestamp(extractField(json, "timestamp"));
        event.setSeverity(extractField(json, "severity"));
        event.setStatus(extractField(json, "status"));
        event.setDescription(extractField(json, "description"));

        String peopleCountStr = extractField(json, "people_count");
        if (peopleCountStr != null && !peopleCountStr.isEmpty()) {
            try {
                event.setPeopleCount(Integer.parseInt(peopleCountStr.replaceAll("[^0-9-]", "")));
            } catch (NumberFormatException ignored) {}
        }

        return event;
    }

    private static String extractField(String json, String key) {
        // Match: "key"\s*:\s*"([^"]*)" or "key"\s*:\s*([^,}\s]+)
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(?:\"([^\"]*)\"|([null|true|false|\\-?\\d+\\.?\\d*]+))", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            String strVal = matcher.group(1);
            if (strVal != null) {
                return strVal;
            }
            String rawVal = matcher.group(2);
            if (rawVal != null && !"null".equalsIgnoreCase(rawVal)) {
                return rawVal;
            }
        }
        return null;
    }
}
