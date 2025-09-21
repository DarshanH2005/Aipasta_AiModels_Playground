#!/usr/bin/env node
// Lightweight E2E test: register -> create-order -> simulate webhook -> fetch user
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://localhost:5000';

function readEnv(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const lines = txt.split(/\r?\n/);
  const out = {};
  for (const l of lines) {
    const m = l.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) {
      let val = m[2] || '';
      // strip quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[m[1]] = val;
    }
  }
  return out;
}

async function main() {
  try {
    console.log('E2E Razorpay test starting against', BASE);

    const env = readEnv(path.resolve(process.cwd(), '.env'));
    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
    if (!webhookSecret) {
      console.error('No webhook secret found in .env');
      process.exit(1);
    }

    const fetch = global.fetch || (await import('node-fetch')).default;

    // 1) Register a test user (use unique email to avoid conflicts)
    const email = `e2e_test_${Date.now()}@example.com`;
    // Use name with letters/spaces only and a strong password meeting validation requirements
    const registerRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email, password: 'Password1!' })
    });
    const regJson = await registerRes.json();
    if (regJson.status !== 'success') {
      console.error('Register failed', regJson);
      process.exit(1);
    }
    const token = regJson.token;
    console.log('Registered user:', email);

    // 2) Get plans and pick a paid plan if available, otherwise the first non-free
    const plansRes = await fetch(`${BASE}/api/plans`, { headers: { 'Content-Type': 'application/json' } });
    const plansJson = await plansRes.json();
    if (plansJson.status !== 'success' || !Array.isArray(plansJson.data.plans)) {
      console.error('Failed to fetch plans', plansJson);
      process.exit(1);
    }
    const plans = plansJson.data.plans;
    const paidPlan = plans.find(p => p.modelType === 'paid' || p.priceINR > 0) || plans[0];
    if (!paidPlan) {
      console.error('No plan found');
      process.exit(1);
    }
    console.log('Selected plan:', paidPlan.displayName, paidPlan._id, 'price:', paidPlan.priceINR);

    // 3) Create order
    const createOrderRes = await fetch(`${BASE}/api/plans/${paidPlan._id}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const createOrderJson = await createOrderRes.json();
    if (createOrderJson.status !== 'success' || !createOrderJson.data || !createOrderJson.data.orderId) {
      console.error('Create order failed', createOrderJson);
      process.exit(1);
    }
    const { orderId, amount, currency } = createOrderJson.data;
    console.log('Created orderId:', orderId, 'amount:', amount, currency);

    // 4) Check user balance BEFORE
    const meBeforeRes = await fetch(`${BASE}/api/auth/me`, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
    const meBeforeJson = await meBeforeRes.json();
    console.log('User tokens BEFORE:', meBeforeJson?.data?.user?.tokens?.balance);

    // 5) Simulate Razorpay webhook for payment.captured
    const fakePaymentId = `pay_${Date.now()}`;
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: fakePaymentId,
            entity: 'payment',
            amount: amount || (paidPlan.priceINR * 100),
            currency: currency || 'INR',
            order_id: orderId,
            status: 'captured'
          }
        }
      }
    };

    const bodyStr = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');

    const webhookRes = await fetch(`${BASE}/api/plans/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      },
      body: bodyStr
    });
    const webhookText = await webhookRes.text();
    console.log('Webhook response status:', webhookRes.status, 'body:', webhookText);

    // 6) Check user balance AFTER
    const meAfterRes = await fetch(`${BASE}/api/auth/me`, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
    const meAfterJson = await meAfterRes.json();
    console.log('User tokens AFTER:', meAfterJson?.data?.user?.tokens?.balance);

    console.log('E2E test complete');
    process.exit(0);
  } catch (err) {
    console.error('E2E test error', err);
    process.exit(1);
  }
}

main();
