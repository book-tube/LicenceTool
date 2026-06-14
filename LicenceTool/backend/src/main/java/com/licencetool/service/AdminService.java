package com.licencetool.service;

import com.licencetool.domain.LicenceKey;
import com.licencetool.domain.Product;
import com.licencetool.domain.Role;
import com.licencetool.domain.User;
import com.licencetool.repository.LicenceKeyRepository;
import com.licencetool.repository.ProductRepository;
import com.licencetool.repository.RoleRepository;
import com.licencetool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final LicenceKeyRepository licenceKeyRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AuditService auditService;

    @PreAuthorize("hasRole('admin')")
    @Transactional
    public List<LicenceKey> createLicenceKeys(UUID productId, List<String> keyValues, UUID actorId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new NoSuchElementException("Product not found: " + productId));

        List<String> values;
        if (keyValues == null || keyValues.isEmpty()) {
            values = Collections.emptyList();
        } else {
            values = keyValues;
        }

        // If caller didn't provide explicit keys, generate them (caller should call with a list)
        List<LicenceKey> toSave = new ArrayList<>();
        for (String v : values) {
            if (licenceKeyRepository.existsByKeyValue(v)) {
                throw new IllegalArgumentException("Key value already exists: " + v);
            }
            LicenceKey lk = new LicenceKey();
            lk.setKeyValue(v);
            lk.setProduct(product);
            toSave.add(lk);
        }

        List<LicenceKey> saved = licenceKeyRepository.saveAll(toSave);

        auditService.logAdminAction(actorId, "CREATE_KEYS", "product", productId.toString(),
                Map.of("created", saved.size()));

        return saved;
    }

    @PreAuthorize("hasRole('admin')")
    @Transactional
    public User createUser(String keycloakId, String email, String firstName, String lastName, String roleName, UUID actorId) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists: " + email);
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new NoSuchElementException("Role not found: " + roleName));

        User u = new User();
        u.setKeycloakId(keycloakId);
        u.setEmail(email);
        u.setFirstName(firstName);
        u.setLastName(lastName);
        u.setCompanyName(null);
        u.setVatId(null);
        u.setRole(role);

        User saved = userRepository.save(u);

        auditService.logAdminAction(actorId, "CREATE_USER", "user", saved.getId().toString(),
                Map.of("email", saved.getEmail(), "role", roleName));

        return saved;
    }
}

