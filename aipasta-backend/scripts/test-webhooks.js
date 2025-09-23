#!/usr/bin/env node

/**
 * Razorpay Webhook Testing Script
 * Test your webhook endpoints locally or in production
 */

require('dotenv').config();
const crypto = require('crypto');
const fetch = require('node-fetch');

const BASE_URL = process.env.WEBHOOK_TEST_URL || 'http://localhost:5000';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

// Generate webhook signature
function generateWebhookSignature(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

// Test webhook payloads
const TEST_PAYLOADS = {
  payment_captured: {
    event: 'payment.captured',
    account_id: 'acc_test123',
    entity: 'event',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: 'pay_test' + Date.now(),
          entity: 'payment',
          amount: 1900, // Rs 19.00 in paise
          currency: 'INR',
          status: 'captured',
          order_id: 'order_test' + Date.now(),
          invoice_id: null,
          international: false,
          method: 'card',
          amount_refunded: 0,
          refund_status: null,
          captured: true,
          description: 'Test payment for AI Pasta plan',
          card_id: 'card_test123',
          bank: null,
          wallet: null,
          vpa: null,
          email: 'test@example.com',
          contact: '+919876543210',
          notes: {
            planId: '507f1f77bcf86cd799439011',
            userId: '507f191e810c19729de860ea'
          },
          fee: 37,
          tax: 6,
          error_code: null,
          error_description: null,
          created_at: Math.floor(Date.now() / 1000)
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  },

  payment_failed: {
    event: 'payment.failed',
    account_id: 'acc_test123',
    entity: 'event',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: 'pay_failed' + Date.now(),
          entity: 'payment',
          amount: 1900,
          currency: 'INR',
          status: 'failed',
          order_id: 'order_test' + Date.now(),
          method: 'card',
          captured: false,
          description: 'Test failed payment',
          email: 'test@example.com',
          contact: '+919876543210',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'Payment failed due to insufficient funds',
          created_at: Math.floor(Date.now() / 1000)
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  },

  order_paid: {
    event: 'order.paid',
    account_id: 'acc_test123',
    entity: 'event',
    contains: ['order'],
    payload: {
      order: {
        entity: {
          id: 'order_paid' + Date.now(),
          entity: 'order',
          amount: 1900,
          amount_paid: 1900,
          amount_due: 0,
          currency: 'INR',
          receipt: 'receipt_test',
          status: 'paid',
          notes: {
            planId: '507f1f77bcf86cd799439011',
            userId: '507f191e810c19729de860ea'
          },
          created_at: Math.floor(Date.now() / 1000)
        }
      }
    },
    created_at: Math.floor(Date.now() / 1000)
  }
};

// Send webhook test
async function sendWebhookTest(eventType = 'payment_captured', url = null) {
  try {
    if (!WEBHOOK_SECRET) {
      console.error('❌ No webhook secret found. Set RAZORPAY_WEBHOOK_SECRET or RAZORPAY_KEY_SECRET');
      return false;
    }

    const payload = TEST_PAYLOADS[eventType];
    if (!payload) {
      console.error(`❌ Unknown event type: ${eventType}`);
      console.log('Available event types:', Object.keys(TEST_PAYLOADS).join(', '));
      return false;
    }

    const webhookUrl = url || `${BASE_URL}/api/webhooks/razorpay`;
    const bodyString = JSON.stringify(payload);
    const signature = generateWebhookSignature(bodyString, WEBHOOK_SECRET);

    console.log(`🧪 Testing webhook: ${eventType}`);
    console.log(`📡 URL: ${webhookUrl}`);
    console.log(`🔐 Signature: ${signature.substring(0, 20)}...`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Razorpay-Signature': signature
      },
      body: bodyString
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📄 Response:`, responseData);

    if (response.ok) {
      console.log('✅ Webhook test successful!');
      return true;
    } else {
      console.log('❌ Webhook test failed');
      return false;
    }

  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
    return false;
  }
}

// Test webhook signature verification
function testSignatureVerification() {
  console.log('🔐 Testing webhook signature verification...\n');

  const testBody = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test123"}}}}';
  const testSecret = 'test_webhook_secret_123';
  
  const signature1 = generateWebhookSignature(testBody, testSecret);
  const signature2 = generateWebhookSignature(testBody, testSecret);
  const wrongSignature = generateWebhookSignature(testBody, 'wrong_secret');

  console.log('Test Body:', testBody);
  console.log('Test Secret:', testSecret);
  console.log('Signature 1:', signature1);
  console.log('Signature 2:', signature2);
  console.log('Wrong Signature:', wrongSignature);
  console.log('Signatures Match:', signature1 === signature2);
  console.log('Wrong Signature Matches:', signature1 === wrongSignature);
  
  if (signature1 === signature2 && signature1 !== wrongSignature) {
    console.log('✅ Signature verification test passed!');
  } else {
    console.log('❌ Signature verification test failed!');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Razorpay Webhook Testing Script\n');
    console.log('Usage: node test-webhooks.js [options]\n');
    console.log('Options:');
    console.log('  --event <type>     Event type to test (payment_captured, payment_failed, order_paid)');
    console.log('  --url <url>        Webhook URL to test (default: http://localhost:5000/api/webhooks/razorpay)');
    console.log('  --signature        Test signature verification only');
    console.log('  --all              Test all event types');
    console.log('  --help, -h         Show this help message\n');
    console.log('Environment Variables:');
    console.log('  WEBHOOK_TEST_URL          Base URL for testing (default: http://localhost:5000)');
    console.log('  RAZORPAY_WEBHOOK_SECRET   Webhook secret for signature generation');
    console.log('  RAZORPAY_KEY_SECRET       Fallback if webhook secret not set\n');
    console.log('Examples:');
    console.log('  node test-webhooks.js --event payment_captured');
    console.log('  node test-webhooks.js --url https://yourdomain.com/api/webhooks/razorpay');
    console.log('  node test-webhooks.js --all');
    return;
  }

  if (args.includes('--signature')) {
    testSignatureVerification();
    return;
  }

  const eventIndex = args.indexOf('--event');
  const urlIndex = args.indexOf('--url');
  
  const eventType = eventIndex !== -1 ? args[eventIndex + 1] : 'payment_captured';
  const url = urlIndex !== -1 ? args[urlIndex + 1] : null;

  if (args.includes('--all')) {
    console.log('🧪 Testing all webhook event types...\n');
    
    for (const event of Object.keys(TEST_PAYLOADS)) {
      console.log(`\n--- Testing ${event} ---`);
      await sendWebhookTest(event, url);
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } else {
    await sendWebhookTest(eventType, url);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  sendWebhookTest,
  testSignatureVerification,
  generateWebhookSignature,
  TEST_PAYLOADS
};