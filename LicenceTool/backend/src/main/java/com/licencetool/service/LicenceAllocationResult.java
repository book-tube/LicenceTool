package com.licencetool.service;

import java.util.List;
import java.util.UUID;

/**
 * Result of allocating licence keys to a single order line.
 */
public record LicenceAllocationResult(
        UUID orderItemId,
        int quantity,
        List<UUID> assignedKeyIds
) {
}

