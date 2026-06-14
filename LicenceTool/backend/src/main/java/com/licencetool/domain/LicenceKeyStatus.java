package com.licencetool.domain;

/**
 * Lifecycle states of a licence key.
 * REQUIREMENT 3.1: track licence lifecycle (available, assigned, revoked, inactive).
 */
public enum LicenceKeyStatus {
    AVAILABLE,
    ASSIGNED,
    REVOKED,
    INACTIVE
}

