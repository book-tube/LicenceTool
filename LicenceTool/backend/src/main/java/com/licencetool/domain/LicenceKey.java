package com.licencetool.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A globally unique licence key.
 * REQUIREMENT 3.1: a key can only be assigned once to one order line. The
 * The {@code orderItem} association records the single order line that owns a
 * key; multiple key rows may belong to the same multi-quantity order line.
 */
@Entity
@Table(name = "licence_keys")
@Getter
@Setter
@NoArgsConstructor
public class LicenceKey {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "key_value", nullable = false, unique = true)
    private String keyValue;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /** Set once the key is allocated to a specific order line. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id")
    private OrderItem orderItem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private LicenceKeyStatus status = LicenceKeyStatus.AVAILABLE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}

