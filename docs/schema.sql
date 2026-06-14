-- ============================================
-- Database Schema für Licence Supply Platform
-- ============================================

-- Rollen
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT
);

INSERT INTO roles (name, description) VALUES 
  ('admin', 'Administrator: vollständige Kontrolle'),
  ('private', 'Private User: Shopping und Kontobereich'),
  ('business', 'Business User: Shopping mit Unternehmensdaten');

-- Benutzer
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  vat_id VARCHAR(50),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Produkte (Lizenzen)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  licence_type VARCHAR(100) NOT NULL,
  duration_months INTEGER,
  price_cents INTEGER NOT NULL,
  platform VARCHAR(100),
  language VARCHAR(20),
  stock_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lizenzschlüssel (Unique Keys)
CREATE TABLE licence_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value VARCHAR(255) UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  status VARCHAR(50) DEFAULT 'available',  -- 'available', 'assigned', 'revoked', 'inactive'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bestellungen
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'paid', 'fulfilled', 'cancelled'
  total_amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  billing_email VARCHAR(255),
  company_name VARCHAR(255),
  vat_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bestellpositionen (Multi-Item Support)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  assigned_key_ids TEXT[],  -- Array von Lizenzschlüssel-IDs
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'assigned', 'delivered'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rechnungen
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  pdf_url VARCHAR(255),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log (für Compliance und Tracking)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indizes für Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_licence_keys_status ON licence_keys(status);
CREATE INDEX idx_licence_keys_product_id ON licence_keys(product_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
