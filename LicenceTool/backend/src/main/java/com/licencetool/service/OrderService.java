package com.licencetool.service;

import com.licencetool.domain.*;
import com.licencetool.repository.OrderRepository;
import com.licencetool.repository.ProductRepository;
import com.licencetool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Order lifecycle: creation (multi-item), fulfilment with licence allocation,
 * refunds and ownership-scoped reads.
 *
 * Access control mirrors the requirements:
 *  - REQUIREMENT 3.3 / 5: users only access their own orders; admin-only actions
 *    are guarded with role checks ({@link PreAuthorize}).
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final LicenceService licenceService;
    private final AuditService auditService;

    /**
     * Creates an order with one or more items and allocates a unique licence key
     * per purchased unit, all within a single transaction. If any line cannot be
     * fulfilled the whole order is rolled back.
     */
    @Transactional
    @PreAuthorize("@authz.isSelfOrAdmin(#userId)")
    public Order createOrder(UUID userId, CreateOrderCommand command) {
        if (command.items() == null || command.items().isEmpty()) {
            throw new IllegalArgumentException("At least one order item is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Order order = new Order();
        order.setUser(user);
        order.setOrderNumber(generateOrderNumber());
        order.setStatus(OrderStatus.PENDING);
        order.setBillingEmail(command.billingEmail());
        order.setCompanyName(command.companyName());
        order.setVatId(command.vatId());

        int total = 0;
        for (CreateOrderCommand.Line line : command.items()) {
            Product product = productRepository.findById(line.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + line.productId()));

            OrderItem item = new OrderItem();
            item.setProduct(product);
            item.setQuantity(line.quantity());
            item.setUnitPriceCents(product.getPriceCents());
            order.addItem(item);

            total += product.getPriceCents() * line.quantity();
        }
        order.setTotalAmountCents(total);

        // Persist order + items so generated ids are available for key allocation.
        Order saved = orderRepository.save(order);

        // Allocate unique keys per line (one per unit).
        for (OrderItem item : saved.getItems()) {
            licenceService.allocateLicencesForOrderItem(
                    item, item.getProduct().getId(), item.getQuantity(), userId);
            item.setStatus(OrderItemStatus.ASSIGNED);
        }

        auditService.logOrderCreated(userId, saved.getId(), total, saved.getItems().size());
        return initializeGraph(saved);
    }

    /**
     * Marks payment received and delivers keys.
     * REQUIREMENT 3.5: successful payment triggers fulfilment. Only the order
     * owner (or an admin) may pay for an order.
     */
    @Transactional
    @PreAuthorize("@authz.canAccessOrder(#orderId)")
    public Order markPaidAndFulfil(UUID orderId) {
        Order order = getOrderEntity(orderId);
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.PAID) {
            throw new IllegalStateException("Order cannot be fulfilled from status " + order.getStatus());
        }
        order.setStatus(OrderStatus.FULFILLED);
        order.getItems().forEach(i -> i.setStatus(OrderItemStatus.DELIVERED));
        return initializeGraph(order);
    }

    /**
     * Admin refund: revokes the linked keys and flags the order REFUNDED.
     * REQUIREMENT 3.6.
     */
    @Transactional
    @PreAuthorize("hasRole('admin')")
    public List<UUID> refundOrder(UUID orderId, UUID actorId) {
        return revokeAndClose(orderId, actorId, OrderStatus.REFUNDED);
    }

    /**
     * Admin cancellation: revokes the linked keys and flags the order CANCELLED.
     * REQUIREMENT 3.6: admin can process refunds/cancellations.
     */
    @Transactional
    @PreAuthorize("hasRole('admin')")
    public List<UUID> cancelOrder(UUID orderId, UUID actorId) {
        return revokeAndClose(orderId, actorId, OrderStatus.CANCELLED);
    }

    private List<UUID> revokeAndClose(UUID orderId, UUID actorId, OrderStatus newStatus) {
        Order order = getOrderEntity(orderId);
        if (order.getStatus() == OrderStatus.REFUNDED || order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Order is already " + order.getStatus());
        }
        List<UUID> revoked = licenceService.revokeLicencesForOrder(orderId, actorId);
        order.setStatus(newStatus);
        return revoked;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@authz.isSelfOrAdmin(#userId)")
    public List<Order> getOrdersForUser(UUID userId) {
        List<Order> orders = orderRepository.findByUser_IdOrderByCreatedAtDesc(userId);
        orders.forEach(o -> o.getItems().size()); // initialize item count within tx
        return orders;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@authz.canAccessOrder(#orderId)")
    public Order getOrder(UUID orderId) {
        return initializeGraph(getOrderEntity(orderId));
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('admin')")
    public List<Order> getAllOrders() {
        List<Order> orders = orderRepository.findAll();
        orders.forEach(o -> o.getItems().size());
        return orders;
    }

    private Order getOrderEntity(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
    }

    /**
     * Forces initialization of the lazy associations needed to build a full
     * order response, so it can be serialized after the transaction closes.
     */
    private Order initializeGraph(Order order) {
        order.getItems().forEach(item -> {
            item.getProduct().getName();
            item.getAssignedKeys().forEach(LicenceKey::getKeyValue);
        });
        return order;
    }

    private String generateOrderNumber() {
        return "ORD-%d-%04d".formatted(System.currentTimeMillis(),
                ThreadLocalRandom.current().nextInt(10_000));
    }
}

