// Simple smoke test script for LicenceTool backend
// Usage:
//   BASE_URL=http://localhost:3000 USER_ID=<user-id> node scripts/smokeTest.js
// Optionally provide ADMIN_JWT to run refund step:
//   ADMIN_JWT=<jwt> BASE_URL=... USER_ID=... node scripts/smokeTest.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const USER_ID = process.env.USER_ID;
const ADMIN_JWT = process.env.ADMIN_JWT;

function okOrExit(cond, msg) {
  if (!cond) {
    console.error('ERROR:', msg);
    process.exit(1);
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  if (typeof fetch === 'undefined') {
    console.error('This script requires Node 18+ (global fetch).');
    process.exit(2);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch (e) { body = text; }
  return { status: res.status, body };
}

async function run() {
  console.log('Base URL:', BASE_URL);
  okOrExit(USER_ID, 'USER_ID environment variable is required.');

  // 1) Create order
  console.log('\n1) Creating order for user', USER_ID);
  const createPayload = {
    items: [
      { product_id: 'prod-1', quantity: 2 },
      { product_id: 'prod-2', quantity: 1 }
    ],
    billing_email: 'smoketest@example.com'
  };

  const createRes = await request(`/api/user/${USER_ID}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createPayload)
  });

  console.log('Create status:', createRes.status);
  console.log('Create body:', createRes.body);
  okOrExit(createRes.status === 201 || createRes.status === 200, 'Order creation failed');

  const orderId = createRes.body.order_id || createRes.body.id;
  okOrExit(orderId, 'No order id returned');

  // 2) List user orders
  console.log('\n2) Listing orders for user');
  const listRes = await request(`/api/user/${USER_ID}/orders`);
  console.log('List status:', listRes.status);
  console.log('List body:', listRes.body);

  // 3) Get order details
  console.log('\n3) Fetching order details for', orderId);
  const detailsRes = await request(`/api/user/${USER_ID}/orders/${orderId}`);
  console.log('Details status:', detailsRes.status);
  console.log('Details body:', detailsRes.body);

  // 4) If ADMIN_JWT provided, refund via admin endpoint
  if (ADMIN_JWT) {
    console.log('\n4) Refunding order as admin');
    const refundRes = await request(`/api/admin/orders/${orderId}/refund`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${ADMIN_JWT}` }
    });
    console.log('Refund status:', refundRes.status);
    console.log('Refund body:', refundRes.body);
  } else {
    console.log('\n4) Skipping admin refund step (no ADMIN_JWT provided)');
  }

  console.log('\nSmoke test completed successfully');
}

run().catch((err) => { console.error('Unhandled error', err); process.exit(3); });
