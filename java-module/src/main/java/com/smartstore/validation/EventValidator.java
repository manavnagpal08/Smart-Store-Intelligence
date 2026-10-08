package com.smartstore.validation;

import com.smartstore.exception.InvalidEventException;
import com.smartstore.model.StoreEvent;
import com.smartstore.model.ValidationResult;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Composite validator that applies an extensible collection of business rules.
 */
public class EventValidator {
    private final List<BusinessRule> rules;

    public EventValidator() {
        this.rules = new ArrayList<>();
        // Default rule registry
        this.rules.add(new BasicStructureRule());
        this.rules.add(new CrowdBusinessRule());
        this.rules.add(new RestrictedAreaBusinessRule());
        this.rules.add(new QueueBusinessRule());
    }

    public EventValidator(List<BusinessRule> customRules) {
        this.rules = new ArrayList<>(customRules);
    }

    public void addRule(BusinessRule rule) {
        if (rule != null) {
            this.rules.add(rule);
        }
    }

    public List<BusinessRule> getRules() {
        return Collections.unmodifiableList(rules);
    }

    /**
     * Executes all registered business rules against the event.
     */
    public ValidationResult validate(StoreEvent event) {
        if (event == null) {
            return new ValidationResult(false, "UNKNOWN", "Event payload is null", "NullCheck");
        }

        String eventId = event.getEventId() != null ? event.getEventId() : "UNKNOWN";

        for (BusinessRule rule : rules) {
            try {
                rule.validate(event);
            } catch (InvalidEventException e) {
                return new ValidationResult(false, eventId, e.getMessage(), rule.getRuleName());
            } catch (Exception e) {
                return new ValidationResult(false, eventId, "Unexpected validation error: " + e.getMessage(), rule.getRuleName());
            }
        }

        return new ValidationResult(true, eventId, "Event passed all business validation rules.");
    }
}
