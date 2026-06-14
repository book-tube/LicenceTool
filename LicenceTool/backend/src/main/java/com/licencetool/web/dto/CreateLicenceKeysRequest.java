package com.licencetool.web.dto;

import java.util.List;

public class CreateLicenceKeysRequest {
    // optional list of explicit key values to create. If empty, no keys are created.
    private List<String> keyValues;

    public CreateLicenceKeysRequest() {}

    public List<String> getKeyValues() {
        return keyValues;
    }

    public void setKeyValues(List<String> keyValues) {
        this.keyValues = keyValues;
    }
}

