package com.licencetool.web.dto;

import java.util.UUID;

/**
 * Result of a refund or cancellation.
 * REQUIREMENT 3.6: linked licence keys are revoked.
 */
public record RevocationResponse(
        UUID orderId,
        String status,
        int revokedKeyCount
) {
}

