package com.licencetool.web;

import com.licencetool.domain.OrderStatus;
import com.licencetool.security.CurrentUserService;
import com.licencetool.service.OrderService;
import com.licencetool.web.dto.OrderSummaryResponse;
import com.licencetool.web.dto.RevocationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Admin order management.
 * REQUIREMENT 3.6: admin can process refunds/cancellations; linked licence keys
 * are revoked. Method-level {@code hasRole('admin')} also guards the underlying
 * service, providing defence in depth.
 */
@RestController
@RequestMapping("/api/admin/orders")
@PreAuthorize("hasRole('admin')")
@RequiredArgsConstructor
public class AdminOrderController {

    private final OrderService orderService;
    private final OrderMapper orderMapper;
    private final CurrentUserService currentUserService;

    /** List all orders. */
    @GetMapping
    public List<OrderSummaryResponse> allOrders() {
        return orderService.getAllOrders().stream()
                .map(orderMapper::toSummary)
                .toList();
    }

    /** Refund an order and revoke its licence keys. */
    @PostMapping("/{orderId}/refund")
    public RevocationResponse refund(@PathVariable UUID orderId) {
        UUID actorId = currentUserService.requireCurrentUserId();
        List<UUID> revoked = orderService.refundOrder(orderId, actorId);
        return new RevocationResponse(orderId, OrderStatus.REFUNDED.name(), revoked.size());
    }

    /** Cancel an order and revoke its licence keys. */
    @PostMapping("/{orderId}/cancel")
    public RevocationResponse cancel(@PathVariable UUID orderId) {
        UUID actorId = currentUserService.requireCurrentUserId();
        List<UUID> revoked = orderService.cancelOrder(orderId, actorId);
        return new RevocationResponse(orderId, OrderStatus.CANCELLED.name(), revoked.size());
    }
}

