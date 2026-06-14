package com.licencetool.web;

import com.licencetool.domain.LicenceKey;
import com.licencetool.domain.User;
import com.licencetool.web.dto.CreateLicenceKeysRequest;
import com.licencetool.web.dto.CreateUserRequest;
import com.licencetool.web.dto.CreateUserResponse;
import com.licencetool.security.CurrentUserService;
import com.licencetool.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('admin')")
@RequiredArgsConstructor
public class AdminManagementController {

    private final AdminService adminService;
    private final CurrentUserService currentUserService;

    @PostMapping("/products/{productId}/licence-keys")
    public List<LicenceKey> createLicenceKeys(@PathVariable UUID productId,
                                              @RequestBody CreateLicenceKeysRequest req) {
        UUID actorId = currentUserService.requireCurrentUserId();
        return adminService.createLicenceKeys(productId, req.getKeyValues(), actorId);
    }

    @PostMapping("/users")
    public CreateUserResponse createUser(@RequestBody CreateUserRequest req) {
        UUID actorId = currentUserService.requireCurrentUserId();
        User created = adminService.createUser(req.getKeycloakId(), req.getEmail(), req.getFirstName(), req.getLastName(), req.getRole(), actorId);
        return new CreateUserResponse(created.getId(), created.getEmail());
    }
}

