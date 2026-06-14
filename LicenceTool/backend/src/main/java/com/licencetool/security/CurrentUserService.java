package com.licencetool.security;

import com.licencetool.domain.User;
import com.licencetool.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Resolves the local {@link User} profile for the currently authenticated
 * Keycloak principal (matched on the JWT subject).
 */
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public Optional<String> currentKeycloakId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return Optional.ofNullable(jwt.getSubject());
        }
        return Optional.empty();
    }

    public Optional<User> currentUser() {
        return currentKeycloakId().flatMap(userRepository::findByKeycloakId);
    }

    public Optional<UUID> currentUserId() {
        return currentUser().map(User::getId);
    }

    /**
     * The current user's id, or a 403 if the authenticated Keycloak principal has
     * no provisioned local profile.
     */
    public UUID requireCurrentUserId() {
        return currentUserId().orElseThrow(() -> new AccessDeniedException(
                "Authenticated user has no local profile provisioned"));
    }
}

