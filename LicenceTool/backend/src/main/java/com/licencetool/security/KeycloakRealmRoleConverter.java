package com.licencetool.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Maps Keycloak realm and client roles from a JWT into Spring {@code ROLE_*}
 * authorities so that {@code hasRole('admin' | 'private' | 'business')} works.
 */
public class KeycloakRealmRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private final String resourceClientId;

    public KeycloakRealmRoleConverter(String resourceClientId) {
        this.resourceClientId = resourceClientId;
    }

    @Override
    @SuppressWarnings("unchecked")
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Set<String> roles = new HashSet<>();

        // realm_access.roles
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof Collection<?> realmRoles) {
            realmRoles.forEach(r -> roles.add(String.valueOf(r)));
        }

        // resource_access.<clientId>.roles
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess != null && resourceAccess.get(resourceClientId) instanceof Map<?, ?> client) {
            Object clientRoles = ((Map<String, Object>) client).get("roles");
            if (clientRoles instanceof Collection<?> cr) {
                cr.forEach(r -> roles.add(String.valueOf(r)));
            }
        }

        return roles.stream()
                .flatMap(r -> Stream.of(new SimpleGrantedAuthority("ROLE_" + r)))
                .collect(Collectors.toCollection(ArrayList::new));
    }
}

