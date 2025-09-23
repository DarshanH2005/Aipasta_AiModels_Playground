#!/usr/bin/env node

/**
 * Razorpay Live Production Setup Script
 * This script helps you configure Razorpay live keys and webhooks
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_FILE = path.join(__dirname, '..', '.env.production');
const ENV_TEMPLATE = path.join(__dirname, '..', '.env.production.template');

console.log('🚀 AI Pasta - Razorpay Live Production Setup\n');

// Generate a secure webhook secret
function generateWebhookSecret() {
  return 'whsec_aipasta_' + crypto.randomBytes(32).toString('hex');
}

// Read current environment file
function readEnvFile() {
  try {
    if (fs.existsSync(ENV_FILE)) {
      return fs.readFileSync(ENV_FILE, 'utf8');
    } else if (fs.existsSync(ENV_TEMPLATE)) {
      console.log('📋 Using template file as base...');
      return fs.readFileSync(ENV_TEMPLATE, 'utf8');
    }
    return '';
  } catch (error) {
    console.error('❌ Error reading environment file:', error.message);
    return '';
  }
}

// Update environment variables
function updateEnvFile(content, keyId, keySecret, webhookSecret) {
  let updatedContent = content;
  
  // Update Razorpay keys
  updatedContent = updatedContent.replace(
    /RAZORPAY_KEY_ID=.*/,
    `RAZORPAY_KEY_ID=${keyId}`
  );
  
  updatedContent = updatedContent.replace(
    /RAZORPAY_KEY_SECRET=.*/,
    `RAZORPAY_KEY_SECRET=${keySecret}`
  );
  
  updatedContent = updatedContent.replace(
    /RAZORPAY_WEBHOOK_SECRET=.*/,
    `RAZORPAY_WEBHOOK_SECRET=${webhookSecret}`
  );
  
  return updatedContent;
}

// Main setup function
async function setupRazorpayLive() {
  try {
    console.log('📝 Setting up Razorpay Live Integration...\n');
    
    // Generate webhook secret if not provided
    const webhookSecret = generateWebhookSecret();
    
    console.log('🔐 Generated secure webhook secret for production');
    console.log(`🔑 Webhook Secret: ${webhookSecret}\n`);
    
    // Instructions for the user
    console.log('📋 SETUP INSTRUCTIONS:\n');
    
    console.log('1. 🏦 Get your Razorpay Live API Keys:');
    console.log('   - Go to https://dashboard.razorpay.com/');
    console.log('   - Navigate to Settings → API Keys');
    console.log('   - Generate Live API Keys (if not already done)');
    console.log('   - Copy the Key ID (starts with rzp_live_)');
    console.log('   - Copy the Key Secret\n');
    
    console.log('2. 🔗 Configure Webhooks in Razorpay Dashboard:');
    console.log('   - Go to Settings → Webhooks');
    console.log('   - Click "Create Webhook"');
    console.log('   - Webhook URL: https://your-domain.com/api/webhooks/razorpay');
    console.log('   - Secret: ' + webhookSecret);
    console.log('   - Active Events to select:');
    console.log('     ✅ payment.authorized');
    console.log('     ✅ payment.captured');
    console.log('     ✅ payment.failed');
    console.log('     ✅ order.paid');
    console.log('     ✅ refund.created');
    console.log('     ✅ refund.processed\n');
    
    console.log('3. 🔧 Update your .env.production file:');
    console.log('   Replace the following values in your .env.production file:');
    console.log('   RAZORPAY_KEY_ID=rzp_live_YOUR_ACTUAL_LIVE_KEY_ID');
    console.log('   RAZORPAY_KEY_SECRET=YOUR_ACTUAL_LIVE_KEY_SECRET');
    console.log('   RAZORPAY_WEBHOOK_SECRET=' + webhookSecret + '\n');
    
    console.log('4. 🌍 Production Domain Configuration:');
    console.log('   Update these values in .env.production:');
    console.log('   FRONTEND_URL=https://your-production-domain.com');
    console.log('   ALLOWED_ORIGINS=https://your-production-domain.com,https://www.your-production-domain.com\n');
    
    console.log('5. 🔒 Security Checklist:');
    console.log('   ✅ Webhook secret is unique and secure');
    console.log('   ✅ API keys are for LIVE mode (rzp_live_)');
    console.log('   ✅ CORS origins are restricted to your domain');
    console.log('   ✅ HTTPS is enabled on your domain');
    console.log('   ✅ Environment variables are secure\n');
    
    console.log('6. 🧪 Testing the Integration:');
    console.log('   After deployment, test with:');
    console.log('   - Make a small test purchase');
    console.log('   - Check webhook logs at /api/webhooks/razorpay/events');
    console.log('   - Verify tokens are credited correctly\n');
    
    console.log('📁 Environment File Update:');
    const envContent = readEnvFile();
    if (envContent) {
      // Create a sample updated content (user will need to manually update with real keys)
      const sampleContent = updateEnvFile(
        envContent,
        'rzp_live_YOUR_ACTUAL_LIVE_KEY_ID',
        'YOUR_ACTUAL_LIVE_KEY_SECRET',
        webhookSecret
      );
      
      // Write to a sample file
      const sampleFile = path.join(__dirname, '..', '.env.production.sample');
      fs.writeFileSync(sampleFile, sampleContent);
      console.log(`✅ Sample configuration saved to: ${sampleFile}`);
      console.log('   Copy this file to .env.production and update with your real keys\n');
    }
    
    console.log('🚨 IMPORTANT SECURITY NOTES:');
    console.log('   - Never commit real API keys to version control');
    console.log('   - Use environment variables in production');
    console.log('   - Test webhooks thoroughly before going live');
    console.log('   - Monitor webhook events and failures');
    console.log('   - Keep webhook secret secure and private\n');
    
    console.log('✅ Setup instructions complete!');
    console.log('📞 Need help? Check the Razorpay documentation: https://razorpay.com/docs/');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Webhook testing function
function generateWebhookTestData() {
  const orderId = 'order_' + crypto.randomBytes(8).toString('hex');
  const paymentId = 'pay_' + crypto.randomBytes(8).toString('hex');
  
  return {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: orderId,
          amount: 1900, // Rs 19.00 in paise
          currency: 'INR',
          status: 'captured',
          method: 'card'
        }
      }
    }
  };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node setup-razorpay.js [options]');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --test         Generate test webhook data');
    process.exit(0);
  }
  
  if (args.includes('--test')) {
    console.log('🧪 Test Webhook Data:');
    console.log(JSON.stringify(generateWebhookTestData(), null, 2));
    process.exit(0);
  }
  
  setupRazorpayLive();
}

module.exports = {
  setupRazorpayLive,
  generateWebhookSecret,
  generateWebhookTestData
};