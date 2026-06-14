package com.licencetool.repository;

import com.licencetool.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByUser_IdOrderByCreatedAtDesc(UUID userId);
}

