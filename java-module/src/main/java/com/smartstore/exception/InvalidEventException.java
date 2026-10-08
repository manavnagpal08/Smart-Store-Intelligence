package com.smartstore.exception;

/**
 * Custom exception thrown when a store event violates domain business rules.
 */
public class InvalidEventException extends Exception {
    private final String errorCode;

    public InvalidEventException(String message) {
        super(message);
        this.errorCode = "BUSINESS_RULE_VIOLATION";
    }

    public InvalidEventException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
