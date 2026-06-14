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

> **No REST layer.** As requested, this module exposes **no REST controllers**.
> All capabilities are implemented as Spring `@Service` beans (the application /
> domain layer). Authorization is enforced with method security
> (`@PreAuthorize`) so it applies wherever the services are invoked.

## Architecture

```
com.licencetool
├── domain        # JPA entities + enums (Role, User, Product, LicenceKey, Order, OrderItem, Invoice, AuditLog)
├── repository    # Spring Data JPA repositories
├── service       # Business logic
│   ├── LicenceService   # unique key allocation (pessimistic lock) + revocation
│   ├── OrderService     # multi-item orders, fulfilment, refunds, ownership-scoped reads
│   └── AuditService     # audit trail (REQUIRES_NEW transactions)
└── security      # Keycloak JWT role mapping + ownership-based @PreAuthorize helpers
```

### How the requirements are met
- **3.1 Unique keys** — `licence_keys.key_value` is `UNIQUE`; a partial unique
  index on `order_item_id` guarantees a key is assigned to at most one order
  line. Allocation locks candidate rows (`PESSIMISTIC_WRITE`).
- **3.2 Multi-item purchasing** — `OrderService.createOrder` accepts multiple
  lines and quantities and allocates one key per unit in a single transaction.
- **3.3 / 5 RBAC & data isolation** — Keycloak realm roles (`admin`, `private`,
  `business`) map to Spring authorities; `@PreAuthorize` + the `authz` bean
  restrict users to their own data and reserve admin actions.
- **3.6 Refunds** — `OrderService.refundOrder` (admin only) revokes linked keys.
- **3.7 Auditability** — `AuditService` records key generation/assignment,
  refunds and admin actions with actor + timestamp.

## Run locally

1. Start Postgres + Keycloak:
   ```powershell
   docker compose up -d
   ```
   - Postgres: `localhost:5432` (db `licence_tool`, user/pass `licence`/`licence`)
   - Keycloak: `http://localhost:8081` (admin `admin`/`admin`), realm
     `licence-tool` auto-imported with three demo users.

2. Run the backend (Flyway applies migrations automatically on startup):
   ```powershell
   mvn spring-boot:run
   ```

## Configuration (env vars)

| Variable               | Default                                              |
|------------------------|------------------------------------------------------|
| `DATABASE_URL`         | `jdbc:postgresql://localhost:5432/licence_tool`      |
| `DATABASE_USER`        | `licence`                                            |
| `DATABASE_PASSWORD`    | `licence`                                            |
| `KEYCLOAK_ISSUER_URI`  | `http://localhost:8081/realms/licence-tool`          |
| `KEYCLOAK_CLIENT_ID`   | `licence-tool-backend`                               |
| `PORT`                 | `8080`                                               |

