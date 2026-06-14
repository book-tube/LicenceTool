# Run the app with Docker (backend, frontend and Postgres)

Prerequisite: Docker and docker-compose installed on your machine.

1. Build and start services

```bash
docker-compose up --build
```

This will:
- Start Postgres and initialise the schema from `docs/schema.sql`.
- Build and start the backend service (exposed on port `3001` inside the compose network, mapped to host `3001`).
- Build and start the frontend (Create React App) on host port `3000`.

2. Smoke test endpoints (after services are healthy)

Replace `USER_ID`, `ORDER_ID`, `ADMIN_JWT` as needed.

```bash
# create a test order
curl -X POST http://localhost:3001/api/user/USER_ID/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":"prod-1","quantity":2}],"billing_email":"test@example.com"}'

# list user orders
curl http://localhost:3001/api/user/USER_ID/orders

# get order details
curl http://localhost:3001/api/user/USER_ID/orders/ORDER_ID

# admin refund (must include admin JWT)
curl -X POST http://localhost:3001/api/admin/orders/ORDER_ID/refund \
  -H "Authorization: Bearer ADMIN_JWT"
```

Notes
- If you prefer not to mount local volumes, remove the `volumes` entries from `docker-compose.yml`.
- Environment variables are minimal; ensure `JWT_SECRET` matches what your frontend expects for local testing.
