package com.licencetool.web.dto;

import java.util.UUID;

public class CreateUserResponse {
    private final UUID id;
    private final String email;

    public CreateUserResponse(UUID id, String email) {
        this.id = id;
        this.email = email;
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
}

