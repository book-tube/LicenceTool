package com.licencetool.repository;

import com.licencetool.domain.LicenceKey;
import com.licencetool.domain.LicenceKeyStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LicenceKeyRepository extends JpaRepository<LicenceKey, UUID> {

    /**
     * Selects available keys for a product and locks the rows so two concurrent
     * checkouts can never grab the same key.
     * REQUIREMENT 3.1 / 3.2: one unique key allocated per purchased unit.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT lk FROM LicenceKey lk
            WHERE lk.product.id = :productId
              AND lk.status = com.licencetool.domain.LicenceKeyStatus.AVAILABLE
            ORDER BY lk.createdAt ASC
            """)
    List<LicenceKey> findAvailableForUpdate(@Param("productId") UUID productId, Pageable pageable);

    long countByProductIdAndStatus(UUID productId, LicenceKeyStatus status);

    List<LicenceKey> findByOrderItem_Order_Id(UUID orderId);

    boolean existsByKeyValue(String keyValue);
}

