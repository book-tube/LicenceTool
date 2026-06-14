# Smoke Test Script

Run the smoke test script to verify basic end-to-end flows against a running backend.

Requirements:
- Node 18+ (script uses global `fetch`)

Usage:

```bash
# create order, list orders, fetch order details
BASE_URL=http://localhost:3000 USER_ID=<user-id> node scripts/smokeTest.js

# include ADMIN_JWT to perform refund step
ADMIN_JWT=<admin-jwt> BASE_URL=http://localhost:3000 USER_ID=<user-id> node scripts/smokeTest.js
```

Notes:
- The script does not create users — provide an existing `USER_ID` from your database.
- If your backend runs on a different port, override `BASE_URL` accordingly.
