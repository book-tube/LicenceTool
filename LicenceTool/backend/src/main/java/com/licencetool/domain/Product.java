package com.licencetool.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "licence_type", nullable = false, length = 100)
    private String licenceType;

    @Column(name = "duration_months")
    private Integer durationMonths;

    @Column(name = "price_cents", nullable = false)
    private Integer priceCents;

    @Column(length = 100)
    private String platform;

    @Column(length = 20)
    private String language;

    @Column(name = "stock_count", nullable = false)
    private Integer stockCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }
}

