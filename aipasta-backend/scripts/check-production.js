#!/usr/bin/env node
/**
 * Production Deployment Helper for AI Pasta
 * Run this script to validate your production environment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 AI Pasta Production Deployment Checker\n');

// Check if production env file exists
const prodEnvPath = path.join(__dirname, '.env.production');
const envTemplatePath = path.join(__dirname, '.env.production.template');

if (!fs.existsSync(prodEnvPath)) {
  console.log('❌ Missing .env.production file');
  console.log('📋 Steps to fix:');
  console.log('1. Copy .env.production.template to .env.production');
  console.log('2. Update all YOUR_* placeholders with real values');
  console.log('3. Get live Razorpay keys from dashboard\n');
  
  if (fs.existsSync(envTemplatePath)) {
    console.log('✅ Template file found: .env.production.template');
  }
  process.exit(1);
}

// Validate production environment variables
const prodEnv = fs.readFileSync(prodEnvPath, 'utf8');
const requiredKeys = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET', 
  'RAZORPAY_WEBHOOK_SECRET',
  'MONGODB_URI',
  'JWT_SECRET',
  'FRONTEND_URL'
];

const missingKeys = [];
const testValues = [];

requiredKeys.forEach(key => {
  const match = prodEnv.match(new RegExp(`^${key}=(.+)$`, 'm'));
  if (!match) {
    missingKeys.push(key);
  } else {
    const value = match[1];
    if (value.includes('YOUR_') || value.includes('changeme') || value.includes('localhost')) {
      testValues.push(key);
    }
  }
});

if (missingKeys.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingKeys.forEach(key => console.log(`   - ${key}`));
  console.log();
}

if (testValues.length > 0) {
  console.log('⚠️  Environment variables with placeholder values:');
  testValues.forEach(key => console.log(`   - ${key}`));
  console.log();
}

// Check Razorpay key format
const keyMatch = prodEnv.match(/^RAZORPAY_KEY_ID=(.+)$/m);
if (keyMatch && keyMatch[1]) {
  const keyId = keyMatch[1];
  if (keyId.startsWith('rzp_live_')) {
    console.log('✅ Razorpay Live Key detected');
  } else if (keyId.startsWith('rzp_test_')) {
    console.log('⚠️  Razorpay Test Key detected (should be live for production)');
  }
}

// Summary
if (missingKeys.length === 0 && testValues.length === 0) {
  console.log('🎉 Production environment looks good!');
  console.log('\n📋 Final checklist:');
  console.log('✅ Environment variables configured');
  console.log('⏳ Complete Razorpay KYC verification');
  console.log('⏳ Set webhook URL in Razorpay dashboard');
  console.log('⏳ Test with small transaction');
  console.log('⏳ Deploy to production server');
} else {
  console.log('❌ Production environment needs attention');
  console.log('\n📋 Next steps:');
  console.log('1. Fix missing/placeholder values');
  console.log('2. Get live Razorpay keys from dashboard');
  console.log('3. Run this script again to verify');
}

console.log('\n💡 Need help? Check RAZORPAY_PRODUCTS_GUIDE.md');