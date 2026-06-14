package com.licencetool.service;

/**
 * Thrown when a referenced entity (product, order, user) cannot be found.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}

