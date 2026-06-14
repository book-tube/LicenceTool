package com.licencetool.web.dto;

public class CreateUserRequest {
    // Keycloak subject (sub) of the user to link the local profile to
    private String keycloakId;
    private String email;
    private String firstName;
    private String lastName;
    private String role; // admin | private | business

    public CreateUserRequest() {}

    public String getKeycloakId() { return keycloakId; }
    public void setKeycloakId(String keycloakId) { this.keycloakId = keycloakId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}

