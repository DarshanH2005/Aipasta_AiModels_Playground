#!/usr/bin/env node

/**
 * Quick Backend Health & Version Check
 * Verifies the backend is running with latest payment fixes
 */

require('dotenv').config();
const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function checkBackendHealth() {
  console.log('🏥 Backend Health Check\n');
  
  try {
    // Check if backend is running
    const healthResponse = await fetch(`${BASE_URL}/health`);
    console.log('Health Status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.text();
      console.log('Health Response:', healthData);
    }

    // Check plans endpoint
    console.log('\n📋 Plans Endpoint Check');
    const plansResponse = await fetch(`${BASE_URL}/api/plans`);
    console.log('Plans Status:', plansResponse.status);
    
    if (plansResponse.ok) {
      const plansData = await plansResponse.json();
      console.log('Plans Count:', plansData.results);
      
      // Find our test plan
      const testPlan = plansData.data.plans.find(p => p.name === 'test-payment-2rs');
      if (testPlan) {
        console.log('✅ Test plan found:', testPlan.displayName, `₹${testPlan.priceINR}`);
      } else {
        console.log('❌ Test plan not found');
      }
    }

    // Check environment
    console.log('\n🔧 Environment Check');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('Razorpay Key ID configured:', process.env.RAZORPAY_KEY_ID ? 'Yes' : 'No');
    console.log('Razorpay Secret configured:', process.env.RAZORPAY_KEY_SECRET ? 'Yes' : 'No');

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

async function main() {
  console.log('🚀 Backend Status Check');
  console.log('======================\n');
  
  await checkBackendHealth();
  
  console.log('\n💡 Next Steps:');
  console.log('1. Ensure backend is running with latest code');
  console.log('2. Check that environment variables are loaded');
  console.log('3. Test payment with valid authentication token');
}

if (require.main === module) {
  main().catch(console.error);
}