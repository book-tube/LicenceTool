package com.licencetool.web;

import com.licencetool.domain.LicenceKey;
import com.licencetool.domain.Order;
import com.licencetool.domain.OrderItem;
import com.licencetool.web.dto.OrderResponse;
import com.licencetool.web.dto.OrderSummaryResponse;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Maps domain {@link Order} entities to API response DTOs. Expects the order's
 * lazy associations to already be initialized (see OrderService).
 */
@Component
public class OrderMapper {

    public OrderResponse toResponse(Order order) {
        List<OrderResponse.Item> items = order.getItems().stream()
                .map(this::toItem)
                .toList();

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus().name(),
                order.getTotalAmountCents(),
                order.getCurrency(),
                order.getCreatedAt(),
                items
        );
    }

    private OrderResponse.Item toItem(OrderItem item) {
        List<String> keys = item.getAssignedKeys().stream()
                .map(LicenceKey::getKeyValue)
                .toList();

        return new OrderResponse.Item(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getUnitPriceCents(),
                item.getStatus().name(),
                keys
        );
    }

    public OrderSummaryResponse toSummary(Order order) {
        return new OrderSummaryResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus().name(),
                order.getTotalAmountCents(),
                order.getCurrency(),
                order.getItems().size(),
                order.getCreatedAt()
        );
    }
}

