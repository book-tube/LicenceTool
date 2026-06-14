import { Pool } from 'pg';

interface AuditLogEntry {
  actor_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
}

export class AuditService {
  constructor(private pool: Pool) {}

  async log(entry: AuditLogEntry): Promise<void> {
    const query = `
      INSERT INTO audit_logs (actor_id, action, resource_type, resource_id, details)
      VALUES ($1, $2, $3, $4, $5)
    `;

    try {
      await this.pool.query(query, [
        entry.actor_id,
        entry.action,
        entry.resource_type,
        entry.resource_id,
        entry.details ? JSON.stringify(entry.details) : null
      ]);
    } catch (error) {
      console.error('Fehler beim Speichern des Audit Logs:', error);
    }
  }

  // Häufig verwendete Befehle
  async logKeyAssignment(actorId: string, orderId: string, keyIds: string[]): Promise<void> {
    await this.log({
      actor_id: actorId,
      action: 'KEY_ASSIGNED',
      resource_type: 'licence_key',
      resource_id: keyIds.join(','),
      details: { order_id: orderId, key_count: keyIds.length }
    });
  }

  async logOrderCreated(actorId: string, orderId: string, amount: number): Promise<void> {
    await this.log({
      actor_id: actorId,
      action: 'ORDER_CREATED',
      resource_type: 'order',
      resource_id: orderId,
      details: { amount_cents: amount }
    });
  }

  async logOrderRefunded(actorId: string, orderId: string, keyIds: string[]): Promise<void> {
    await this.log({
      actor_id: actorId,
      action: 'ORDER_REFUNDED',
      resource_type: 'order',
      resource_id: orderId,
      details: { revoked_keys: keyIds }
    });
  }

  async logKeyRevoked(actorId: string, keyId: string, reason: string): Promise<void> {
    await this.log({
      actor_id: actorId,
      action: 'KEY_REVOKED',
      resource_type: 'licence_key',
      resource_id: keyId,
      details: { reason }
    });
  }

  async logAdminAction(actorId: string, action: string, resourceType: string, resourceId: string, details?: any): Promise<void> {
    await this.log({
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details
    });
  }
}
