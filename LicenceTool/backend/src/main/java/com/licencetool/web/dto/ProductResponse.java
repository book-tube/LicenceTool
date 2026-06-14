package com.licencetool.web.dto;

import java.util.UUID;

/**
 * Lightweight product view for the shopping frontend.
 */
public record ProductResponse(
        UUID id,
        String name,
        String licenceType,
        Integer durationMonths,
        int priceCents,
        String platform,
        String language,
        boolean inStock
) {
}
