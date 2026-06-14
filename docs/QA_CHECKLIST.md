# QA Checklist — Data Model, Docs, and Acceptance

This document captures the review and validation tasks for Point 4: Data model, documentation, and QA.

## Purpose
- Confirm the data model supports the project requirements.
- Validate documentation matches the implemented architecture.
- Define concrete QA scenarios for acceptance.

## Key files
- `docs/schema.sql`
- `requirements.md`
- `IMPLEMENTATION_GUIDE.md`
- `backend/src/services/licenceService.ts`
- `backend/src/services/auditService.ts`
- `backend/src/middleware/auth.ts`

## Schema review
- [ ] `licence_keys.key_value` is `UNIQUE NOT NULL`
- [ ] `licence_keys.status` includes lifecycle states: `available`, `assigned`, `revoked`, `inactive`
- [ ] `order_items` includes `quantity`, `product_id`, `assigned_key_ids`, and `status`
- [ ] `orders` references `user_id` and stores billing/organisation fields
- [ ] `audit_logs` captures `actor_id`, `action`, `resource_type`, `resource_id`, and `details`
- [ ] indexes exist for email, role, licence status, order status, and audit lookup
- [ ] `roles` and `users.role_id` enforce RBAC in the data model

## Documentation review
- [ ] `requirements.md` contains MVP acceptance criteria and core functional needs
- [ ] `IMPLEMENTATION_GUIDE.md` documents the implementation of unique keys, multi-item orders, RBAC, and audit logging
- [ ] team responsibilities and point-4 scope are clearly described in the docs
- [ ] flow diagrams or examples are accurate for current implementation

## QA validation scenarios
### Multi-item checkout
- [ ] Create an order with at least 2 different products in one request
- [ ] Create an order with quantity > 1 for a single product
- [ ] Confirm each purchased unit receives a unique key
- [ ] Confirm `order_items.assigned_key_ids` stores all assigned keys
- [ ] Confirm assigned licence keys move to `status='assigned'`

### Unique key protection
- [ ] Attempt to insert a duplicate `licence_keys.key_value` and confirm database rejects it
- [ ] Confirm race conditions are prevented by `FOR UPDATE` during allocation

### RBAC and ownership
- [ ] Confirm private/business user cannot access `/admin/orders`
- [ ] Confirm private/business user cannot view another user’s `/user/:userId/orders`
- [ ] Confirm admin can access all user orders and refund API

### Refund and audit
- [ ] Refund an order and confirm linked licence keys are marked `revoked`
- [ ] Confirm `orders.status` changes to refunded/cancelled as expected
- [ ] Confirm audit log entry is created for `ORDER_REFUNDED`
- [ ] Confirm audit log entry is created for `KEY_ASSIGNED`

## Acceptance criteria mapping
- [ ] No duplicate licence key assignment across historical orders
- [ ] A user can place one order containing 2+ items
- [ ] Private/business users cannot access admin endpoints
- [ ] Users can only access their own order/account data
- [ ] Successful payment triggers unique key assignment and delivery flow

## Notes for the team
- The schema and code are already aligned around the expected flow.
- Use this checklist to verify both the implementation and the documentation.
- If any item fails, update the schema/docs and record the fix in the implementation guide.
