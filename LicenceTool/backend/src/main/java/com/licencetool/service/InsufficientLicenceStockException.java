package com.licencetool.service;

/**
 * Thrown when there are not enough available licence keys to fulfil an order line.
 */
public class InsufficientLicenceStockException extends RuntimeException {
    public InsufficientLicenceStockException(String message) {
        super(message);
    }
}

