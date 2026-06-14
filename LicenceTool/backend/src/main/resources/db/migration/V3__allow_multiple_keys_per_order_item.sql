-- An order item represents a product line and may contain multiple units.
-- Each unit needs its own licence key, so order_item_id must not be unique.
DROP INDEX IF EXISTS uq_licence_keys_order_item;

CREATE INDEX IF NOT EXISTS idx_licence_keys_order_item_id
    ON licence_keys (order_item_id)
    WHERE order_item_id IS NOT NULL;
