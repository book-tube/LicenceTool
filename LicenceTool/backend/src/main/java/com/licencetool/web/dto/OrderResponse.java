package com.licencetool.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Full order view including the allocated unique licence keys per line.
 */
public record OrderResponse(
        UUID id,
        String orderNumber,
        String status,
        int totalAmountCents,
        String currency,
        Instant createdAt,
        List<Item> items
) {
    public record Item(
            UUID itemId,
            UUID productId,
            String productName,
            int quantity,
            int unitPriceCents,
            String status,
            List<String> licenceKeys
    ) {
    }
}

