# Licence Tool — Backend (Spring Boot)

Spring Boot backend for the Licence Supply Platform. It replaces the previous
Node.js/Express service.

## Stack

| Concern        | Technology                                            |
|----------------|-------------------------------------------------------|
| Language       | Java 21                                               |
| Framework      | Spring Boot 3.3 (Data JPA, Security)                  |
| Database       | PostgreSQL                                             |
| Migrations     | **Flyway** (`src/main/resources/db/migration`)        |
| Authentication | **Keycloak** (OAuth2 / OIDC resource server, JWT)     |
| Build          | Maven                                                  |

> **REST API.** Customer checkout and admin order operations are exposed via REST
> controllers under `/api`. Authorization is enforced both at the controller and
> the service layer (method security with `@PreAuthorize`) for defence in depth.

## Architecture

```
com.licencetool
├── domain        # JPA entities + enums (Role, User, Product, LicenceKey, Order, OrderItem, Invoice, AuditLog)
├── repository    # Spring Data JPA repositories
├── service       # Business logic
│   ├── LicenceService   # unique key allocation (pessimistic lock) + revocation
│   ├── OrderService     # multi-item orders, fulfilment, refunds/cancellations, ownership-scoped reads
│   └── AuditService     # audit trail (REQUIRES_NEW transactions)
├── web           # REST controllers, DTOs, mapper, exception handling
│   ├── OrderController       # POST/GET /api/orders ... (checkout, pay, list, detail)
│   └── AdminOrderController  # /api/admin/orders ... (list, refund, cancel)
└── security      # Keycloak JWT role mapping + ownership-based @PreAuthorize helpers
```

## REST API

| Method & path                          | Role            | Purpose                                            |
|----------------------------------------|-----------------|----------------------------------------------------|
| `POST /api/orders`                     | authenticated   | Create a multi-item order; auto-allocate unique keys |
| `POST /api/orders/{id}/pay`            | owner / admin   | Confirm payment, fulfil and deliver keys           |
| `GET  /api/orders`                     | authenticated   | List the caller's own orders                       |
| `GET  /api/orders/{id}`                | owner / admin   | Order detail incl. assigned licence keys           |
| `GET  /api/admin/orders`               | admin           | List all orders                                    |
| `POST /api/admin/orders/{id}/refund`   | admin           | Refund order and revoke its keys                   |
| `POST /api/admin/orders/{id}/cancel`   | admin           | Cancel order and revoke its keys                   |

The acting user is always taken from the Keycloak JWT (`sub` → local profile),
never from the request body.

### Example: multi-item checkout

```http
POST /api/orders
Authorization: Bearer <keycloak access token>
Content-Type: application/json

{
  "items": [
    { "productId": "11111111-1111-1111-1111-111111111111", "quantity": 2 },
    { "productId": "22222222-2222-2222-2222-222222222222", "quantity": 1 }
  ],
  "billingEmail": "buyer@example.com",
  "companyName": "Acme Ltd",
  "vatId": "DE123456789"
}
```

### How the requirements are met
- **3.1 Unique keys** — `licence_keys.key_value` is `UNIQUE`; each key row has
  one optional `order_item_id`, while an order line can receive multiple keys.
  Allocation locks candidate rows (`PESSIMISTIC_WRITE`).
- **3.2 Multi-item purchasing** — `OrderService.createOrder` accepts multiple
  lines and quantities and allocates one key per unit in a single transaction.
- **3.3 / 5 RBAC & data isolation** — Keycloak realm roles (`admin`, `private`,
  `business`) map to Spring authorities; `@PreAuthorize` + the `authz` bean
  restrict users to their own data and reserve admin actions.
- **3.6 Refunds / cancellations** — `OrderService.refundOrder` and
  `cancelOrder` (admin only) revoke linked keys via `POST /api/admin/orders/{id}/refund`
  and `.../cancel`.
- **3.7 Auditability** — `AuditService` records key generation/assignment,
  refunds and admin actions with actor + timestamp.

## Run locally

1. Start Postgres + Keycloak:
   ```powershell
   docker compose up -d
   ```
   - Backend Postgres: `localhost:5632` (db `licence_tool`, user/pass `licence`/`licence`)
   - Keycloak Postgres: `localhost:5633` (db `keycloak`, user/pass `keycloak`/`keycloak`)
   - Keycloak: `http://localhost:8081` (admin `admin`/`admin`), realm
     `licence-tool` auto-imported with three demo users.

2. Run the backend (Flyway applies migrations automatically on startup):
   ```powershell
   mvn spring-boot:run
   ```

## End-to-end test data

Flyway seeds products, available licence keys, and representative private and
business orders. The matching Keycloak users are imported with stable IDs:

| Role       | Username        | Password   |
|------------|-----------------|------------|
| Admin      | `admin-user`    | `admin`    |
| Private    | `private-user`  | `private`  |
| Business   | `business-user` | `business` |

The private account starts with a fulfilled multi-item order and visible licence
keys. The business account starts with an order that can be exercised from the
admin refund flow. New checkout tests have available stock for all seeded products.

## Configuration (env vars)

| Variable               | Default                                              |
|------------------------|------------------------------------------------------|
| `DATABASE_URL`         | `jdbc:postgresql://localhost:5632/licence_tool`      |
| `DATABASE_USER`        | `licence`                                            |
| `DATABASE_PASSWORD`    | `licence`                                            |
| `KEYCLOAK_ISSUER_URI`  | `http://localhost:8081/realms/licence-tool`          |
| `KEYCLOAK_CLIENT_ID`   | `licence-tool-backend`                               |
| `PORT`                 | `8080`                                               |

