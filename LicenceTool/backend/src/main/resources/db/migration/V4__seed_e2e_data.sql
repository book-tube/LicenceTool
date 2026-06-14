-- Deterministic users matching the subjects in keycloak/realm-export.json.
INSERT INTO users (id, keycloak_id, email, first_name, last_name, company_name, vat_id, role_id)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'd1496866-bb32-4152-95dd-064d70c56e41',
     'admin@licence.local', 'Admin', 'User', NULL, NULL,
     (SELECT id FROM roles WHERE name = 'admin')),
    ('10000000-0000-0000-0000-000000000002', 'fe7b24a5-34c7-4a11-802b-e06d082aae86',
     'private@licence.local', 'Private', 'User', NULL, NULL,
     (SELECT id FROM roles WHERE name = 'private')),
    ('10000000-0000-0000-0000-000000000003', '27fb656a-e52a-4317-b194-6fb5fcbd6935',
     'business@licence.local', 'Business', 'User', 'Example GmbH', 'DE123456789',
     (SELECT id FROM roles WHERE name = 'business'))
ON CONFLICT (id) DO NOTHING;

INSERT INTO products
    (id, name, licence_type, duration_months, price_cents, platform, language, stock_count)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'Office Suite Personal', 'SUBSCRIPTION', 12, 4999, 'Windows/macOS', 'de', 12),
    ('20000000-0000-0000-0000-000000000002', 'Developer IDE Professional', 'PERPETUAL', NULL, 8000, 'Cross-platform', 'en', 8),
    ('20000000-0000-0000-0000-000000000003', 'Secure VPN Business', 'SUBSCRIPTION', 12, 14999, 'Cross-platform', 'en', 10)
ON CONFLICT (id) DO NOTHING;

-- Existing orders make the user and admin dashboards useful immediately.
INSERT INTO orders
    (id, user_id, order_number, status, total_amount_cents, currency, billing_email, company_name, vat_id, created_at, updated_at)
VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
     'E2E-PRIVATE-001', 'FULFILLED', 17998, 'EUR', 'private@licence.local', NULL, NULL,
     CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003',
     'E2E-BUSINESS-001', 'PENDING', 14999, 'EUR', 'business@licence.local', 'Example GmbH', 'DE123456789',
     CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items
    (id, order_id, product_id, quantity, unit_price_cents, status, created_at)
VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000001', 2, 4999, 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000002', 1, 8000, 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002',
     '20000000-0000-0000-0000-000000000003', 1, 14999, 'ASSIGNED', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO licence_keys (id, key_value, product_id, order_item_id, status, created_at)
VALUES
    ('50000000-0000-0000-0000-000000000001', 'E2E-OFFICE-SOLD-0001',
     '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ASSIGNED', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('50000000-0000-0000-0000-000000000002', 'E2E-OFFICE-SOLD-0002',
     '20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'ASSIGNED', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('50000000-0000-0000-0000-000000000003', 'E2E-IDE-SOLD-0001',
     '20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'ASSIGNED', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('50000000-0000-0000-0000-000000000004', 'E2E-VPN-SOLD-0001',
     '20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'ASSIGNED', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO licence_keys (key_value, product_id, status)
SELECT 'E2E-OFFICE-' || LPAD(series::text, 4, '0'),
       '20000000-0000-0000-0000-000000000001', 'AVAILABLE'
FROM generate_series(1, 12) AS series
ON CONFLICT (key_value) DO NOTHING;

INSERT INTO licence_keys (key_value, product_id, status)
SELECT 'E2E-IDE-' || LPAD(series::text, 4, '0'),
       '20000000-0000-0000-0000-000000000002', 'AVAILABLE'
FROM generate_series(1, 8) AS series
ON CONFLICT (key_value) DO NOTHING;

INSERT INTO licence_keys (key_value, product_id, status)
SELECT 'E2E-VPN-' || LPAD(series::text, 4, '0'),
       '20000000-0000-0000-0000-000000000003', 'AVAILABLE'
FROM generate_series(1, 10) AS series
ON CONFLICT (key_value) DO NOTHING;

INSERT INTO invoices (id, order_id, invoice_number, pdf_url, generated_at)
VALUES ('60000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001', 'E2E-INV-001', NULL,
        CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;
