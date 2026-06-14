package com.licencetool.web;

import com.licencetool.security.CurrentUserService;
import com.licencetool.service.CreateOrderCommand;
import com.licencetool.service.OrderService;
import com.licencetool.web.dto.CreateOrderRequest;
import com.licencetool.web.dto.OrderResponse;
import com.licencetool.web.dto.OrderSummaryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Customer-facing order & checkout API (private and business users).
 *
 *  - REQUIREMENT 3.2: multi-item order creation / checkout
 *  - REQUIREMENT 3.1: unique licence keys are allocated automatically on creation
 *  - REQUIREMENT 3.5: payment triggers fulfilment and key delivery
 *
 * The acting user is always derived from the Keycloak JWT, never from the
 * request body, so users can only operate on their own data.
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final OrderMapper orderMapper;
    private final CurrentUserService currentUserService;

    /** Create a multi-item order and auto-allocate one unique key per unit. */
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        UUID userId = currentUserService.requireCurrentUserId();

        CreateOrderCommand command = new CreateOrderCommand(
                request.items().stream()
                        .map(l -> new CreateOrderCommand.Line(l.productId(), l.quantity()))
                        .toList(),
                request.billingEmail(),
                request.companyName(),
                request.vatId()
        );

        var order = orderService.createOrder(userId, command);
        return ResponseEntity.status(HttpStatus.CREATED).body(orderMapper.toResponse(order));
    }

    /** Confirm payment for an order, fulfilling it and delivering the keys. */
    @PostMapping("/{orderId}/pay")
    public OrderResponse pay(@PathVariable UUID orderId) {
        return orderMapper.toResponse(orderService.markPaidAndFulfil(orderId));
    }

    /** List the current user's orders. */
    @GetMapping
    public List<OrderSummaryResponse> myOrders() {
        UUID userId = currentUserService.requireCurrentUserId();
        return orderService.getOrdersForUser(userId).stream()
                .map(orderMapper::toSummary)
                .toList();
    }

    /** Get a single order with its assigned licence keys. */
    @GetMapping("/{orderId}")
    public OrderResponse getOrder(@PathVariable UUID orderId) {
        return orderMapper.toResponse(orderService.getOrder(orderId));
    }
}

