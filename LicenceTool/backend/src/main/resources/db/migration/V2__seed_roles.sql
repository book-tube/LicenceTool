-- ============================================
-- V2: Seed roles (kept in sync with Keycloak realm roles)
-- ============================================
INSERT INTO roles (name, description) VALUES
    ('admin',    'Administrator: full control'),
    ('private',  'Private user (B2C): shopping and account area'),
    ('business', 'Business user (B2B): shopping with company data')
ON CONFLICT (name) DO NOTHING;

