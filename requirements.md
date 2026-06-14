# Licence Supply Website Requirements

## 1. Product Scope
Build a website to sell software licences to two customer segments:
- Private users (B2C)
- Business users (B2B)

An admin role manages content, catalogue, licence inventory, and operations.

## 2. User Roles and Rights

### Admin
- Manage website content and product catalogue
- Manage licence inventory (import/create keys, stock visibility)
- Manage orders, refunds, and cancellations
- Manage user accounts and role assignments
- Access reporting and audit logs

### Private User (B2C)
- Browse products
- Add products to cart and checkout
- View own orders, invoices, and assigned licences
- Access support and refund requests for own orders

### Business User (B2B)
- Same shopping capabilities as private users
- Maintain company billing details and VAT information
- Receive business invoices
- View own order/licence history

## 3. Core Functional Requirements

### 3.1 Unique Licence Keys
- Every sold licence must be globally unique.
- A licence key can only be assigned once to one order line.
- Duplicate assignment must be prevented at database and application level.
- The system must track licence lifecycle states (e.g., available, assigned, revoked, inactive).

### 3.2 Multi-Item Purchasing
- Users can add more than one item to cart.
- Users can purchase multiple quantities of one product and/or multiple different products in one checkout.
- During fulfilment, one unique licence key is allocated per purchased unit.

### 3.3 Role-Based Access Control
- Private and business users can perform shopping/account actions only.
- Admin-only features must be inaccessible to private/business users.
- Unauthorized access to admin APIs/pages must return proper denial (e.g., HTTP 403).

### 3.4 Catalogue and Checkout
- Product catalogue includes licence type, duration, platform compatibility, and stock status.
- Checkout supports private/business flows, tax handling, and payment processing.
- Orders generate invoice and confirmation email.

### 3.5 Fulfilment and Customer Access
- Automatic delivery of assigned keys after successful payment.
- Users can view assigned keys and order status in account dashboard.
- Users can request resend of delivery email.

### 3.6 Order and Refund Handling
- Admin can process refunds/cancellations.
- On refund, linked licence keys are marked based on policy (revoked/inactive).
- Refunded keys cannot be resold unless explicitly restocked according to business rules.

### 3.7 Auditability
- Log key events with actor and timestamp:
  - key generation/import
  - key assignment
  - key resend
  - refund/revocation
  - admin content/order changes

## 4. Non-Functional and Compliance Requirements
- Data protection and privacy controls aligned with GDPR.
- Secure payment processing through PCI-compliant provider.
- Availability and reliability suitable for ecommerce operations.
- Basic fraud and abuse protection (rate limiting, suspicious order checks).

## 5. MVP Acceptance Criteria (Initial)
- No duplicate licence key assignment across all historical orders.
- A user can place one order containing 2+ items.
- Private/business users cannot access admin endpoints.
- Users can only access their own order/account data.
- Successful payment triggers automatic unique key assignment and delivery.
