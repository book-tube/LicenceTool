package com.licencetool.service;

import com.licencetool.domain.AuditLog;
import com.licencetool.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Writes audit log entries.
 * REQUIREMENT 3.7: log key events with actor and timestamp.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Audit entries are written in their own transaction so that a failing audit
     * write never rolls back the business operation, and a rolled-back business
     * operation does not erase the audit trail.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(UUID actorId, String action, String resourceType, String resourceId, Map<String, Object> details) {
        try {
            AuditLog entry = new AuditLog();
            entry.setActorId(actorId);
            entry.setAction(action);
            entry.setResourceType(resourceType);
            entry.setResourceId(resourceId);
            entry.setDetails(details);
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            log.error("Failed to persist audit log entry action={} resource={}", action, resourceType, ex);
        }
    }

    public void logKeyAssignment(UUID actorId, UUID orderId, List<UUID> keyIds) {
        log(actorId, "KEY_ASSIGNED", "licence_key",
                keyIds.stream().map(UUID::toString).reduce((a, b) -> a + "," + b).orElse(""),
                Map.of("order_id", orderId.toString(), "key_count", keyIds.size()));
    }

    public void logOrderCreated(UUID actorId, UUID orderId, int amountCents, int itemCount) {
        log(actorId, "ORDER_CREATED", "order", orderId.toString(),
                Map.of("amount_cents", amountCents, "item_count", itemCount));
    }

    public void logOrderRefunded(UUID actorId, UUID orderId, List<UUID> keyIds) {
        log(actorId, "ORDER_REFUNDED", "order", orderId.toString(),
                Map.of("revoked_keys_count", keyIds.size()));
    }

    public void logKeyResend(UUID actorId, UUID orderId) {
        log(actorId, "KEY_RESENT", "order", orderId.toString(), Map.of());
    }

    public void logAdminAction(UUID actorId, String action, String resourceType, String resourceId, Map<String, Object> details) {
        log(actorId, action, resourceType, resourceId, details);
    }
}

