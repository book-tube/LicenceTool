import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticate, authorize, checkResourceOwnership } from '../middleware/auth';
import { AuditService } from '../services/auditService';
import { LicenceService } from '../services/licenceService';

const router = express.Router();

export function setupOrderRoutes(pool: Pool, auditService: AuditService, licenceService: LicenceService) {
  // ============================================
  // Admin: Get all orders (nur Admin)
  // ============================================
  router.get(
    '/admin/orders',
    authenticate,
    authorize(['admin']),
    async (req: Request, res: Response) => {
      try {
        const result = await pool.query(`
          SELECT
            o.id, o.order_number, o.status, o.total_amount_cents,
            u.email, u.company_name, u.vat_id,
            COUNT(oi.id) as item_count,
            o.created_at
          FROM orders o
          JOIN users u ON o.user_id = u.id
          LEFT JOIN order_items oi ON o.id = oi.order_id
          GROUP BY o.id, u.email, u.company_name, u.vat_id
          ORDER BY o.created_at DESC
          LIMIT 50
        `);

        await auditService.log({
          actor_id: req.user?.id,
          action: 'VIEWED_ALL_ORDERS',
          resource_type: 'order',
          details: { result_count: result.rows.length }
        });

        res.json(result.rows);
      } catch (error) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Bestellungen' });
      }
    }
  );

  // ============================================
  // Admin: Refund order and revoke licences (nur Admin)
  // REQUIREMENT: Admin kann Refunds verarbeiten und Lizenzen widerrufen
  // ============================================
  router.post(
    '/admin/orders/:orderId/refund',
    authenticate,
    authorize(['admin']),
    async (req: Request, res: Response) => {
      try {
        const { orderId } = req.params;

        // Revoke all licences for this order
        const revokedKeys = await licenceService.revokeLicencesForOrder(orderId, req.user!.id);

        // Update order status
        await pool.query(
          'UPDATE orders SET status = $1 WHERE id = $2',
          ['refunded', orderId]
        );

        await auditService.log({
          actor_id: req.user?.id,
          action: 'REFUNDED_ORDER',
          resource_type: 'order',
          resource_id: orderId,
          details: { revoked_keys_count: revokedKeys.length }
        });

        res.json({ 
          message: 'Bestellung erfolgreich rückgängig gemacht',
          revoked_keys: revokedKeys.length
        });
      } catch (error) {
        res.status(500).json({ error: 'Fehler beim Refund' });
      }
    }
  );

  // ============================================
  // User: Get own orders (Private + Business User)
  // REQUIREMENT: Benutzer können nur ihre eigenen Bestellungen sehen
  // ============================================
  router.get(
    '/user/:userId/orders',
    authenticate,
    checkResourceOwnership('userId'),
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;

        const result = await pool.query(`
          SELECT
            o.id, o.order_number, o.status, o.total_amount_cents, o.currency,
            COUNT(oi.id) as item_count,
            o.created_at
          FROM orders o
          LEFT JOIN order_items oi ON o.id = oi.order_id
          WHERE o.user_id = $1
          GROUP BY o.id
          ORDER BY o.created_at DESC
        `, [userId]);

        res.json(result.rows);
      } catch (error) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Bestellungen' });
      }
    }
  );

  // ============================================
  // User: Get order details with licences
  // REQUIREMENT: Multi-Item Orders mit allen zugeordneten Lizenzen anzeigen
  // ============================================
  router.get(
    '/user/:userId/orders/:orderId',
    authenticate,
    checkResourceOwnership('userId'),
    async (req: Request, res: Response) => {
      try {
        const { userId, orderId } = req.params;

        // Verify order belongs to user
        const orderCheck = await pool.query(
          'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
          [orderId, userId]
        );

        if (orderCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Bestellung nicht gefunden' });
        }

        // Fetch order with all items and their licences
        const result = await pool.query(`
          SELECT
            o.id, o.order_number, o.status, o.total_amount_cents, o.currency,
            json_agg(json_build_object(
              'item_id', oi.id,
              'product_name', p.name,
              'quantity', oi.quantity,
              'unit_price_cents', oi.unit_price_cents,
              'status', oi.status,
              'licence_keys', array_agg(lk.key_value)
            )) as items
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          JOIN products p ON oi.product_id = p.id
          LEFT JOIN licence_keys lk ON lk.id = ANY(oi.assigned_key_ids)
          WHERE o.id = $1
          GROUP BY o.id, o.order_number, o.status, o.total_amount_cents, o.currency
        `, [orderId]);

        res.json(result.rows[0]);
      } catch (error) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Bestellung' });
      }
    }
  );

  // ============================================
  // User: Get own licences
  // ============================================
  router.get(
    '/user/:userId/licences',
    authenticate,
    checkResourceOwnership('userId'),
    async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const licences = await licenceService.getUserLicences(userId);
        res.json(licences);
      } catch (error) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Lizenzen' });
      }
    }
  );

  // ============================================
  // User: Create order with multiple items
  // REQUIREMENT: Benutzer können mehrere Artikel in einer Bestellung kaufen
  // ============================================
  router.post(
    '/user/:userId/orders',
    authenticate,
    checkResourceOwnership('userId'),
    async (req: Request, res: Response) => {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const { userId } = req.params;
        const { items, billing_email, company_name, vat_id } = req.body;

        // Validate items (array mit mindestens 1 Element)
        if (!Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ error: 'Mindestens 1 Artikel erforderlich' });
        }

        // Calculate total
        let totalAmountCents = 0;
        const orderItems = [];

        for (const item of items) {
          const productResult = await client.query(
            'SELECT id, price_cents FROM products WHERE id = $1',
            [item.product_id]
          );

          if (productResult.rows.length === 0) {
            throw new Error(`Produkt nicht gefunden: ${item.product_id}`);
          }

          const price = productResult.rows[0].price_cents;
          const subtotal = price * item.quantity;
          totalAmountCents += subtotal;

          orderItems.push({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price_cents: price
          });
        }

        // Create order
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const orderResult = await client.query(`
          INSERT INTO orders (user_id, order_number, status, total_amount_cents, billing_email, company_name, vat_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [userId, orderNumber, 'pending', totalAmountCents, billing_email, company_name, vat_id]);

        const orderId = orderResult.rows[0].id;

        // Create order items
        for (const item of orderItems) {
          const itemResult = await client.query(`
            INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
            VALUES ($1, $2, $3, $4)
            RETURNING id
          `, [orderId, item.product_id, item.quantity, item.unit_price_cents]);

          const orderItemId = itemResult.rows[0].id;

          // Allocate unique licences for this item
          await licenceService.allocateLicencesForOrderItem(
            orderId,
            orderItemId,
            item.product_id,
            item.quantity,
            userId
          );
        }

        await client.query('COMMIT');

        await auditService.log({
          actor_id: userId,
          action: 'ORDER_CREATED',
          resource_type: 'order',
          resource_id: orderId,
          details: { item_count: items.length, total_cents: totalAmountCents }
        });

        res.status(201).json({
          order_id: orderId,
          order_number: orderNumber,
          total_amount_cents: totalAmountCents,
          item_count: items.length,
          status: 'pending'
        });
      } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
      } finally {
        client.release();
      }
    }
  );

  return router;
}
