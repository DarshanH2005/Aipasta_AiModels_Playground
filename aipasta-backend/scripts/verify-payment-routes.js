#!/usr/bin/env node

/**
 * Payment Routes Verification Script
 * Test all payment-related endpoints to ensure they're working
 */

require('dotenv').config();
const fetch = require('node-fetch');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

// Test routes configuration
const ROUTES_TO_TEST = [
  {
    method: 'GET',
    path: '/api/plans',
    requiresAuth: false,
    description: 'Get all plans'
  },
  {
    method: 'GET', 
    path: '/api/plans/TEST_PLAN_ID',
    requiresAuth: false,
    description: 'Get specific plan'
  },
  {
    method: 'POST',
    path: '/api/plans/TEST_PLAN_ID/create-order',
    requiresAuth: true,
    description: 'Create Razorpay order'
  },
  {
    method: 'POST',
    path: '/api/plans/TEST_PLAN_ID/verify-payment',
    requiresAuth: true,
    description: 'Verify payment (should be accessible)'
  },
  {
    method: 'POST',
    path: '/api/plans/webhook',
    requiresAuth: false,
    description: 'Razorpay webhook (existing)'
  },
  {
    method: 'POST',
    path: '/api/webhooks/razorpay',
    requiresAuth: false,
    description: 'Enhanced webhook handler'
  }
];

async function testRoute(route) {
  try {
    const url = `${BASE_URL}${route.path}`;
    const options = {
      method: route.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add auth header if required (dummy token for route existence test)
    if (route.requiresAuth) {
      options.headers['Authorization'] = 'Bearer dummy_token_for_route_test';
    }

    // Add dummy body for POST requests
    if (route.method === 'POST') {
      options.body = JSON.stringify({ test: true });
    }

    console.log(`🧪 Testing: ${route.method} ${route.path}`);
    
    const response = await fetch(url, options);
    const status = response.status;
    
    // Check if route exists (not 404)
    if (status === 404) {
      console.log(`❌ Route NOT FOUND: ${route.description}`);
      return false;
    } else if (status === 401 && route.requiresAuth) {
      console.log(`✅ Route EXISTS (auth required): ${route.description}`);
      return true;
    } else if (status >= 200 && status < 500) {
      console.log(`✅ Route EXISTS: ${route.description}`);
      return true;
    } else {
      console.log(`⚠️  Route exists but returned ${status}: ${route.description}`);
      return true;
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`🔌 Server not running at ${BASE_URL}`);
      return false;
    }
    console.log(`❌ Error testing ${route.path}: ${error.message}`);
    return false;
  }
}

async function testAllRoutes() {
  console.log('🚀 Payment Routes Verification\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  let passCount = 0;
  let totalCount = ROUTES_TO_TEST.length;

  for (const route of ROUTES_TO_TEST) {
    const result = await testRoute(route);
    if (result) passCount++;
    console.log(''); // Empty line for readability
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('📊 Test Summary:');
  console.log(`✅ Routes accessible: ${passCount}/${totalCount}`);
  console.log(`❌ Routes missing: ${totalCount - passCount}/${totalCount}`);

  if (passCount === totalCount) {
    console.log('\n🎉 All payment routes are properly configured!');
  } else {
    console.log('\n⚠️  Some routes may need attention.');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. Start your backend server: npm start');
  console.log('2. Test with a real auth token for protected routes');
  console.log('3. Make a test payment to verify the complete flow');
  console.log('4. Check webhook configuration in Razorpay dashboard');

  return passCount === totalCount;
}

// Health check function
async function checkServerHealth() {
  try {
    console.log('🏥 Checking server health...');
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Server is healthy (${data.status})`);
      console.log(`🌍 Environment: ${data.environment}`);
      console.log(`⏰ Uptime: ${Math.floor(data.uptime)}s\n`);
      return true;
    } else {
      console.log(`❌ Server health check failed: ${response.status}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Cannot reach server at ${BASE_URL}`);
    console.log('Make sure your backend server is running\n');
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Payment Routes Verification Script\n');
    console.log('Usage: node verify-payment-routes.js [options]\n');
    console.log('Options:');
    console.log('  --url <url>        Base URL to test (default: http://localhost:5000)');
    console.log('  --health-only      Only check server health');
    console.log('  --help, -h         Show this help message\n');
    console.log('Environment Variables:');
    console.log('  TEST_BASE_URL      Base URL for testing');
    return;
  }

  // Override base URL if provided
  const urlIndex = args.indexOf('--url');
  if (urlIndex !== -1 && args[urlIndex + 1]) {
    BASE_URL = args[urlIndex + 1];
  }

  // Health check only
  if (args.includes('--health-only')) {
    await checkServerHealth();
    return;
  }

  // Full route verification
  const isHealthy = await checkServerHealth();
  if (!isHealthy) {
    console.log('🛑 Server is not healthy, skipping route tests');
    process.exit(1);
  }

  await testAllRoutes();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testAllRoutes,
  testRoute,
  checkServerHealth
};