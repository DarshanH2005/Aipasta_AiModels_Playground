#!/usr/bin/env node

/**
 * CORS Headers Test Script
 * Tests if the updated CORS and CSP headers are working correctly
 */

require('dotenv').config();
const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function testCORSHeaders() {
  console.log('🔍 Testing CORS Headers Configuration\n');
  
  try {
    // Test basic API endpoint
    const response = await fetch(`${BASE_URL}/api/plans`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://aipasta-frontend.vercel.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type,authorization,x-rtb-fingerprint-id'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:');
    
    response.headers.forEach((value, name) => {
      if (name.toLowerCase().includes('access-control') || name.toLowerCase().includes('cors')) {
        console.log(`  ${name}: ${value}`);
      }
    });

    console.log('\n✅ CORS preflight test completed');
    
    // Test if Razorpay headers are allowed
    const allowedHeaders = response.headers.get('access-control-allow-headers');
    if (allowedHeaders && allowedHeaders.includes('x-rtb-fingerprint-id')) {
      console.log('✅ Razorpay fingerprint header is allowed');
    } else {
      console.log('❌ Razorpay fingerprint header NOT allowed');
      console.log('Allowed headers:', allowedHeaders);
    }

  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
  }
}

async function testSecurityHeaders() {
  console.log('\n🛡️  Testing Security Headers\n');
  
  try {
    const response = await fetch(`${BASE_URL}/api/plans`);
    
    console.log('Security Headers:');
    response.headers.forEach((value, name) => {
      if (name.toLowerCase().includes('content-security-policy') || 
          name.toLowerCase().includes('permissions-policy') ||
          name.toLowerCase().includes('x-')) {
        console.log(`  ${name}: ${value.slice(0, 100)}${value.length > 100 ? '...' : ''}`);
      }
    });

    console.log('\n✅ Security headers test completed');

  } catch (error) {
    console.error('❌ Security headers test failed:', error.message);
  }
}

async function main() {
  console.log('🧪 CORS & Security Headers Test Suite');
  console.log('====================================\n');
  
  await testCORSHeaders();
  await testSecurityHeaders();
  
  console.log('\n🎯 Test Summary:');
  console.log('- Check that x-rtb-fingerprint-id is in allowed headers');
  console.log('- Verify CSP allows Razorpay domains');
  console.log('- Confirm permissions policy blocks vibrate API');
  console.log('\nIf tests pass, the frontend CORS errors should be resolved! 🚀');
}

if (require.main === module) {
  main().catch(console.error);
}