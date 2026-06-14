import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './auditService';

export interface LicenceAllocationResult {
  order_item_id: string;
  quantity: number;
  assigned_keys: string[];
  failed_allocations: number;
}

export class LicenceService {
  constructor(private pool: Pool, private auditService: AuditService) {}

  // ============================================
  // Allocate unique licence keys for order items
  // REQUIREMENT: Jede verkaufte Lizenz muss global eindeutig sein
  // ============================================
  async allocateLicencesForOrderItem(
    orderId: string,
    orderItemId: string,
    productId: string,
    quantity: number,
    actorId: string
  ): Promise<LicenceAllocationResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Finde verfügbare Keys für dieses Produkt (mit Locking)
      const keysQuery = `
        SELECT id, key_value FROM licence_keys
        WHERE product_id = $1 AND status = 'available'
        LIMIT $2
        FOR UPDATE
      `;
      const keysResult = await client.query(keysQuery, [productId, quantity]);

      if (keysResult.rows.length < quantity) {
        await client.query('ROLLBACK');
        return {
          order_item_id: orderItemId,
          quantity,
          assigned_keys: [],
          failed_allocations: quantity - keysResult.rows.length
        };
      }

      const assignedKeyIds = keysResult.rows.map((row) => row.id);

      // Markiere Keys als "assigned"
      const updateQuery = `
        UPDATE licence_keys
        SET status = 'assigned'
        WHERE id = ANY($1)
      `;
      await client.query(updateQuery, [assignedKeyIds]);

      // Upadte order_item mit assigned_keys
      const updateItemQuery = `
        UPDATE order_items
        SET assigned_key_ids = $1, status = 'assigned'
        WHERE id = $2
      `;
      await client.query(updateItemQuery, [assignedKeyIds, orderItemId]);

      await client.query('COMMIT');

      // Log the allocation
      await this.auditService.logKeyAssignment(actorId, orderId, assignedKeyIds);

      return {
        order_item_id: orderItemId,
        quantity,
        assigned_keys: assignedKeyIds,
        failed_allocations: 0
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================
  // Revoke licences on refund
  // ============================================
  async revokeLicencesForOrder(orderId: string, actorId: string): Promise<string[]> {
    const query = `
      SELECT UNNEST(assigned_key_ids) as key_id
      FROM order_items
      WHERE order_id = $1 AND assigned_key_ids IS NOT NULL
    `;

    const result = await this.pool.query(query, [orderId]);
    const keyIds = result.rows.map((row) => row.key_id);

    if (keyIds.length > 0) {
      const updateQuery = `
        UPDATE licence_keys
        SET status = 'revoked'
        WHERE id = ANY($1)
      `;
      await this.pool.query(updateQuery, [keyIds]);

      // Log revocation
      await this.auditService.logOrderRefunded(actorId, orderId, keyIds);
    }

    return keyIds;
  }

  // ============================================
  // Get licence details for user
  // ============================================
  async getUserLicences(userId: string) {
    const query = `
      SELECT
        oi.id as item_id,
        o.order_number,
        p.name as product_name,
        oi.quantity,
        array_agg(lk.key_value) as licence_keys,
        oi.status,
        o.created_at
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN licence_keys lk ON lk.id = ANY(oi.assigned_key_ids)
      WHERE o.user_id = $1 AND o.status = 'fulfilled'
      GROUP BY oi.id, o.order_number, p.name, oi.quantity, oi.status, o.created_at
      ORDER BY o.created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  // ============================================
  // Check licence uniqueness (validation)
  // ============================================
  async validateUniqueKey(keyValue: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count FROM licence_keys WHERE key_value = $1
    `;
    const result = await this.pool.query(query, [keyValue]);
    return result.rows[0].count === 0;
  }
}
