package com.licencetool.service;

import com.licencetool.domain.LicenceKey;
import com.licencetool.domain.LicenceKeyStatus;
import com.licencetool.domain.OrderItem;
import com.licencetool.repository.LicenceKeyRepository;
import com.licencetool.repository.OrderItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Licence key lifecycle management.
 * REQUIREMENT 3.1: every sold licence is globally unique and assigned only once.
 */
@Service
@RequiredArgsConstructor
public class LicenceService {

    private final LicenceKeyRepository licenceKeyRepository;
    private final OrderItemRepository orderItemRepository;
    private final AuditService auditService;

    /**
     * Allocates {@code quantity} unique licence keys to an order line. Rows are
     * locked (pessimistic write) so two concurrent checkouts can never receive the
     * same key. Runs inside the caller's transaction.
     */
    @Transactional
    public LicenceAllocationResult allocateLicencesForOrderItem(OrderItem orderItem, UUID productId,
                                                                int quantity, UUID actorId) {
        List<LicenceKey> available =
                licenceKeyRepository.findAvailableForUpdate(productId, PageRequest.of(0, quantity));

        if (available.size() < quantity) {
            throw new InsufficientLicenceStockException(
                    "Not enough licence keys for product %s: requested %d, available %d"
                            .formatted(productId, quantity, available.size()));
        }

        for (LicenceKey key : available) {
            key.setStatus(LicenceKeyStatus.ASSIGNED);
            key.setOrderItem(orderItem);
        }
        licenceKeyRepository.saveAll(available);
        // Keep the in-memory graph consistent so the order response can list the keys.
        orderItem.getAssignedKeys().addAll(available);

        List<UUID> assignedKeyIds = available.stream().map(LicenceKey::getId).toList();
        auditService.logKeyAssignment(actorId, orderItem.getOrder().getId(), assignedKeyIds);

        return new LicenceAllocationResult(orderItem.getId(), quantity, assignedKeyIds);
    }

    /**
     * Revokes all licence keys linked to an order (used on refund).
     * REQUIREMENT 3.6: refunded keys are marked according to policy.
     */
    @Transactional
    @PreAuthorize("hasRole('admin')")
    public List<UUID> revokeLicencesForOrder(UUID orderId, UUID actorId) {
        List<LicenceKey> keys = licenceKeyRepository.findByOrderItem_Order_Id(orderId);
        keys.forEach(k -> k.setStatus(LicenceKeyStatus.REVOKED));
        licenceKeyRepository.saveAll(keys);

        List<UUID> keyIds = keys.stream().map(LicenceKey::getId).toList();
        if (!keyIds.isEmpty()) {
            auditService.logOrderRefunded(actorId, orderId, keyIds);
        }
        return keyIds;
    }

    /** Number of keys currently available for a product (stock visibility). */
    @Transactional(readOnly = true)
    public long availableStock(UUID productId) {
        return licenceKeyRepository.countByProductIdAndStatus(productId, LicenceKeyStatus.AVAILABLE);
    }

    /** Validates that a key value has never been used (uniqueness check). */
    @Transactional(readOnly = true)
    public boolean isKeyValueUnique(String keyValue) {
        return !licenceKeyRepository.existsByKeyValue(keyValue);
    }
}

