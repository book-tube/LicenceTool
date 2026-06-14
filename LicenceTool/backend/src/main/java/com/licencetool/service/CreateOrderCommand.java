package com.licencetool.service;

import java.util.List;
import java.util.UUID;

/**
 * Command to create a multi-item order.
 * REQUIREMENT 3.2: multiple quantities and/or multiple products in one checkout.
 */
public record CreateOrderCommand(
        List<Line> items,
        String billingEmail,
        String companyName,
        String vatId
) {
    public record Line(UUID productId, int quantity) {
    }
}

