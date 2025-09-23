#!/usr/bin/env node

/**
 * Payment Verification Test Script
 * Tests the verify-payment endpoint with detailed logging
 */

require('dotenv').config();
const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function testPaymentVerification() {
  console.log('🧪 Testing Payment Verification Endpoint\n');
  
  try {
    // First, let's test what happens when we send a malformed request
    const response = await fetch(`${BASE_URL}/api/plans/68d27a21763fd0c50021f882/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token_for_testing'
      },
      body: JSON.stringify({
        razorpay_payment_id: 'test_pay_123',
        razorpay_order_id: 'test_order_123', 
        razorpay_signature: 'test_signature_123'
      })
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:');
    response.headers.forEach((value, name) => {
      console.log(`  ${name}: ${value}`);
    });

    const responseText = await response.text();
    console.log('Response Body:', responseText);

    if (response.status === 401) {
      console.log('\n✅ Expected 401 (authentication required) - endpoint is accessible');
    } else if (response.status === 400) {
      console.log('\n⚠️  Got 400 Bad Request - need to check request format');
    } else {
      console.log('\n❓ Unexpected status code');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function testPlanFetch() {
  console.log('\n🔍 Testing Plan Fetch\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/plans/68d27a21763fd0c50021f882`);
    console.log('Plan fetch status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Plan data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('Plan fetch error:', errorText);
    }

  } catch (error) {
    console.error('❌ Plan fetch failed:', error.message);
  }
}

async function main() {
  console.log('🧪 Payment Verification Debug Suite');
  console.log('==================================\n');
  
  await testPlanFetch();
  await testPaymentVerification();
  
  console.log('\n🎯 Debug Summary:');
  console.log('- Check if plan ID exists and is valid');
  console.log('- Verify authentication is working');
  console.log('- Check request body format requirements');
  console.log('\nIf endpoint returns 400, there may be validation issues! 🔍');
}

if (require.main === module) {
  main().catch(console.error);
}