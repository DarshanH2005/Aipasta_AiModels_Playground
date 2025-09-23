#!/usr/bin/env node

/**
 * Payment Issues Fix Script
 * Diagnoses and helps fix common payment integration issues
 */

require('dotenv').config();
const crypto = require('crypto');

console.log('🔧 AI Pasta Payment Issues Diagnostic & Fix\n');

// Check environment configuration
function checkEnvironmentConfig() {
  console.log('📋 Environment Configuration Check:');
  
  const requiredVars = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET', 
    'RAZORPAY_WEBHOOK_SECRET',
    'FRONTEND_URL',
    'MONGODB_URI'
  ];

  let issues = [];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      issues.push(`❌ Missing: ${varName}`);
    } else if (varName === 'RAZORPAY_KEY_ID' && !value.startsWith('rzp_')) {
      issues.push(`⚠️  Invalid format: ${varName} should start with 'rzp_'`);
    } else {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    }
  });

  if (issues.length > 0) {
    console.log('\n🚨 Environment Issues Found:');
    issues.forEach(issue => console.log(issue));
  } else {
    console.log('✅ All required environment variables are set');
  }

  return issues.length === 0;
}

// Test webhook signature generation
function testWebhookSignature() {
  console.log('\n🔐 Webhook Signature Test:');
  
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.log('❌ No webhook secret found');
    return false;
  }

  const testPayload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test123',
          status: 'captured',
          amount: 1900
        }
      }
    }
  });

  const signature = crypto.createHmac('sha256', secret).update(testPayload).digest('hex');
  console.log(`✅ Webhook signature generated successfully`);
  console.log(`   Test signature: ${signature.substring(0, 20)}...`);
  
  return true;
}

// Test payment signature verification
function testPaymentSignature() {
  console.log('\n💳 Payment Signature Test:');
  
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.log('❌ No payment key secret found');
    return false;
  }

  const orderId = 'order_test123';
  const paymentId = 'pay_test456';
  const dataToSign = `${orderId}|${paymentId}`;
  
  const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');
  console.log(`✅ Payment signature generated successfully`);
  console.log(`   Test signature: ${signature.substring(0, 20)}...`);
  
  return true;
}

// Check CORS configuration
function checkCORSConfig() {
  console.log('\n🌐 CORS Configuration Check:');
  
  const frontendUrl = process.env.FRONTEND_URL;
  const nodeEnv = process.env.NODE_ENV;
  
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Frontend URL: ${frontendUrl}`);
  
  if (nodeEnv === 'development' && frontendUrl && frontendUrl.includes('localhost')) {
    console.log('✅ Development CORS configuration looks correct');
    return true;
  } else if (nodeEnv === 'production' && frontendUrl && frontendUrl.includes('https://')) {
    console.log('✅ Production CORS configuration looks correct');
    return true;
  } else {
    console.log('⚠️  CORS configuration might need adjustment');
    console.log('   For development: FRONTEND_URL=http://localhost:3000');
    console.log('   For production: FRONTEND_URL=https://your-domain.com');
    return false;
  }
}

// Generate fixes
function generateFixes() {
  console.log('\n🛠️  Recommended Fixes:\n');
  
  console.log('1. 🔄 Restart your backend server to apply configuration changes');
  console.log('   cd aipasta-backend && npm start\n');
  
  console.log('2. 🌐 Update your frontend CORS if needed:');
  console.log('   - Development: FRONTEND_URL=http://localhost:3000');
  console.log('   - Production: FRONTEND_URL=https://your-domain.com\n');
  
  console.log('3. 🔗 Configure Razorpay webhook URL:');
  console.log('   - Go to https://dashboard.razorpay.com/');
  console.log('   - Settings → Webhooks → Create/Edit Webhook');
  console.log('   - Local testing: http://your-ngrok-url.ngrok.io/api/webhooks/razorpay');
  console.log('   - Production: https://your-domain.com/api/webhooks/razorpay\n');
  
  console.log('4. 🧪 Test payment flow:');
  console.log('   - Make a small test payment (₹1-2)');
  console.log('   - Check browser console for errors');
  console.log('   - Check server logs for webhook events\n');
  
  console.log('5. 🔍 Debug payment verification:');
  console.log('   - Check if payment reaches Razorpay successfully');
  console.log('   - Verify webhook signature matches');
  console.log('   - Ensure tokens are credited to user account\n');
  
  console.log('6. 🏥 Monitor webhook events:');
  console.log('   - Admin endpoint: /api/webhooks/razorpay/events');
  console.log('   - Check for failed webhook processing');
  console.log('   - Retry failed events if needed');
}

// Main diagnostic
async function runDiagnostic() {
  try {
    console.log('🔍 Running comprehensive payment system diagnostic...\n');
    
    const envOk = checkEnvironmentConfig();
    const webhookOk = testWebhookSignature();
    const paymentOk = testPaymentSignature();
    const corsOk = checkCORSConfig();
    
    console.log('\n📊 Diagnostic Summary:');
    console.log(`Environment Config: ${envOk ? '✅ OK' : '❌ Issues'}`);
    console.log(`Webhook Signatures: ${webhookOk ? '✅ OK' : '❌ Issues'}`);
    console.log(`Payment Signatures: ${paymentOk ? '✅ OK' : '❌ Issues'}`);
    console.log(`CORS Configuration: ${corsOk ? '✅ OK' : '⚠️  Check needed'}`);
    
    if (envOk && webhookOk && paymentOk) {
      console.log('\n🎉 Basic configuration looks good!');
      console.log('If you\'re still seeing payment issues, check:');
      console.log('- Server logs for detailed error messages');
      console.log('- Network tab in browser dev tools');
      console.log('- Razorpay dashboard for payment status');
    } else {
      console.log('\n⚠️  Some issues detected. See fixes below.');
    }
    
    generateFixes();
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Payment Issues Diagnostic Script\n');
    console.log('Usage: node fix-payment-issues.js [options]\n');
    console.log('Options:');
    console.log('  --help, -h         Show this help message');
    console.log('  --env-only         Check environment only');
    console.log('  --signature-only   Test signatures only');
    process.exit(0);
  }
  
  if (args.includes('--env-only')) {
    checkEnvironmentConfig();
    process.exit(0);
  }
  
  if (args.includes('--signature-only')) {
    testWebhookSignature();
    testPaymentSignature();
    process.exit(0);
  }
  
  runDiagnostic();
}

module.exports = {
  checkEnvironmentConfig,
  testWebhookSignature,
  testPaymentSignature,
  checkCORSConfig
};