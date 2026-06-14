package com.licencetool.web.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Lightweight order view for list endpoints (no licence keys).
 */
public record OrderSummaryResponse(
        UUID id,
        String orderNumber,
        String status,
        int totalAmountCents,
        String currency,
        int itemCount,
        Instant createdAt
) {
}

