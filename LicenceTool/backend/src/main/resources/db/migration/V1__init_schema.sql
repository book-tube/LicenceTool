-- ============================================
-- V1: Initial schema for the Licence Supply Platform
-- ============================================

-- Roles (mirrors Keycloak realm roles for local reference / FK integrity)
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- Users. Authentication is delegated to Keycloak, so there is no password here.
-- keycloak_id is the Keycloak subject (the "sub" claim of the access token).
CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keycloak_id  VARCHAR(255) UNIQUE NOT NULL,
    email        VARCHAR(255) UNIQUE NOT NULL,
    first_name   VARCHAR(100),
    last_name    VARCHAR(100),
    company_name VARCHAR(255),
    vat_id       VARCHAR(50),
    role_id      INTEGER NOT NULL REFERENCES roles (id),
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Products (licences for sale)
CREATE TABLE products (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(255) NOT NULL,
    licence_type     VARCHAR(100) NOT NULL,
    duration_months  INTEGER,
    price_cents      INTEGER NOT NULL,
    platform         VARCHAR(100),
    language         VARCHAR(20),
    stock_count      INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Orders
CREATE TABLE orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users (id),
    order_number       VARCHAR(50) UNIQUE NOT NULL,
    status             VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    total_amount_cents INTEGER NOT NULL,
    currency           VARCHAR(3) NOT NULL DEFAULT 'EUR',
    billing_email      VARCHAR(255),
    company_name       VARCHAR(255),
    vat_id             VARCHAR(50),
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Order items (multi-item support)
CREATE TABLE order_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id       UUID NOT NULL REFERENCES products (id),
    quantity         INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    status           VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Licence keys (globally unique). The optional order_item_id links a sold key to
-- exactly one order line, enforcing "a key can only be assigned once".
CREATE TABLE licence_keys (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_value     VARCHAR(255) UNIQUE NOT NULL,
    product_id    UUID NOT NULL REFERENCES products (id),
    order_item_id UUID REFERENCES order_items (id),
    status        VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ASSIGNED, REVOKED, INACTIVE
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A key can be linked to at most one order line (DB-level duplicate prevention)
CREATE UNIQUE INDEX uq_licence_keys_order_item ON licence_keys (order_item_id)
    WHERE order_item_id IS NOT NULL;

-- Invoices
CREATE TABLE invoices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL UNIQUE REFERENCES orders (id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    pdf_url        VARCHAR(255),
    generated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit log (compliance + traceability)
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID REFERENCES users (id),
    action        VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id   VARCHAR(255),
    details       JSONB,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role_id ON users (role_id);
CREATE INDEX idx_licence_keys_status ON licence_keys (status);
CREATE INDEX idx_licence_keys_product_id ON licence_keys (product_id);
CREATE INDEX idx_orders_user_id ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);

