package com.licencetool.web;

import com.licencetool.domain.Product;
import com.licencetool.repository.ProductRepository;
import com.licencetool.web.dto.ProductResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Public product catalogue – all authenticated users can browse products.
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;

    @GetMapping
    public List<ProductResponse> listProducts() {
        return productRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    private ProductResponse toResponse(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getName(),
                p.getLicenceType(),
                p.getDurationMonths(),
                p.getPriceCents(),
                p.getPlatform(),
                p.getLanguage(),
                p.getStockCount() > 0
        );
    }
}
