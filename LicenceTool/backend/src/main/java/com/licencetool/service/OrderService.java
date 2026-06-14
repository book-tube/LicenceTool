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
        return saved;
    }

    /**
     * Marks payment received and delivers keys.
     * REQUIREMENT 3.5: successful payment triggers fulfilment.
     */
    @Transactional
    public Order markPaidAndFulfil(UUID orderId) {
        Order order = getOrderEntity(orderId);
        order.setStatus(OrderStatus.FULFILLED);
        order.getItems().forEach(i -> i.setStatus(OrderItemStatus.DELIVERED));
        return order;
    }

    /**
     * Admin refund: revokes the linked keys and flags the order.
     * REQUIREMENT 3.6.
     */
    @Transactional
    @PreAuthorize("hasRole('admin')")
    public List<UUID> refundOrder(UUID orderId, UUID actorId) {
        Order order = getOrderEntity(orderId);
        List<UUID> revoked = licenceService.revokeLicencesForOrder(orderId, actorId);
        order.setStatus(OrderStatus.REFUNDED);
        return revoked;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@authz.isSelfOrAdmin(#userId)")
    public List<Order> getOrdersForUser(UUID userId) {
        return orderRepository.findByUser_IdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@authz.canAccessOrder(#orderId)")
    public Order getOrder(UUID orderId) {
        return getOrderEntity(orderId);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('admin')")
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    private Order getOrderEntity(UUID orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
    }

    private String generateOrderNumber() {
        return "ORD-%d-%04d".formatted(System.currentTimeMillis(),
                ThreadLocalRandom.current().nextInt(10_000));
    }
}

