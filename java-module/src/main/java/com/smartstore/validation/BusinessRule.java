package com.smartstore.validation;

import com.smartstore.exception.InvalidEventException;
import com.smartstore.model.StoreEvent;

/**
 * Interface demonstrating polymorphism across diverse business domain rules.
 */
public interface BusinessRule {
    /**
     * Executes the domain rule check.
     * @param event The store event to validate.
     * @throws InvalidEventException if the event fails the business constraint.
     */
    void validate(StoreEvent event) throws InvalidEventException;

    /**
     * Returns human-readable name of the business rule.
     */
    String getRuleName();
}
