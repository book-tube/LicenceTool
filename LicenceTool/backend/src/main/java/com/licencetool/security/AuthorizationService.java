package com.licencetool.security;

import com.licencetool.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Authorization helper exposed as bean {@code authz} for use in
 * {@code @PreAuthorize} expressions.
 *
 * REQUIREMENT 3.3 / 5: private & business users may only access their own data;
 * admins may access everything.
 */
@Component("authz")
@RequiredArgsConstructor
public class AuthorizationService {

    private final CurrentUserService currentUserService;
    private final OrderRepository orderRepository;

    public boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_admin"::equals);
    }

    /** True if the target user id is the caller, or the caller is an admin. */
    public boolean isSelfOrAdmin(UUID targetUserId) {
        if (isAdmin()) {
            return true;
        }
        return currentUserService.currentUserId()
                .map(id -> id.equals(targetUserId))
                .orElse(false);
    }

    /** True if the order belongs to the caller, or the caller is an admin. */
    public boolean canAccessOrder(UUID orderId) {
        if (isAdmin()) {
            return true;
        }
        return currentUserService.currentUserId()
                .flatMap(uid -> orderRepository.findById(orderId)
                        .map(o -> o.getUser().getId().equals(uid)))
                .orElse(false);
    }
}

