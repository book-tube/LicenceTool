package com.licencetool.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

/**
 * Checkout payload for creating a multi-item order.
 * REQUIREMENT 3.2: multiple quantities and/or multiple products in one checkout.
 */
public record CreateOrderRequest(
        @NotEmpty(message = "At least one item is required")
        @Valid
        List<Line> items,

        @Email(message = "billingEmail must be a valid email")
        String billingEmail,

        String companyName,

        String vatId
) {
    public record Line(
            @NotNull(message = "productId is required")
            UUID productId,

            @Min(value = 1, message = "quantity must be at least 1")
            int quantity
    ) {
    }
}

