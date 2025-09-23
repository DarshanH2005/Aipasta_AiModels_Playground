#!/usr/bin/env node

/**
 * Add Test Payment Plan Script
 * Adds a minimum ₹2 test plan for payment testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Plan = require('../src/models/Plan');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function addTestPaymentPlan() {
  try {
    console.log('🧪 Adding Test Payment Plan...\n');

    // Check if test plan already exists
    const existingTestPlan = await Plan.findOne({ 
      name: { $regex: /test.*payment/i } 
    });

    if (existingTestPlan) {
      console.log('⚠️  Test payment plan already exists:');
      console.log(`   ID: ${existingTestPlan._id}`);
      console.log(`   Name: ${existingTestPlan.displayName}`);
      console.log(`   Price: ₹${existingTestPlan.priceINR}`);
      console.log(`   Tokens: ${existingTestPlan.tokens.toLocaleString()}`);
      return existingTestPlan;
    }

    // Create test payment plan
    const testPlan = await Plan.create({
      name: 'test-payment-mini',
      displayName: 'Test Payment (₹2)',
      description: 'Minimum test payment plan for testing Razorpay integration',
      priceINR: 2, // Minimum ₹2
      tokens: 10000, // 10k tokens for ₹2
      modelType: 'paid',
      features: [
        'Test payment integration',
        '10,000 AI tokens',
        'Access to paid models',
        'Perfect for testing'
      ],
      isActive: true,
      sortOrder: 1, // Show first in list
      limitations: {
        maxRequestsPerHour: 50,
        maxModelsPerRequest: 3,
        allowedModelTypes: ['free', 'paid']
      },
      metadata: {
        isTestPlan: true,
        purpose: 'payment_testing',
        minimumAmount: true
      }
    });

    console.log('✅ Test payment plan created successfully!');
    console.log(`   ID: ${testPlan._id}`);
    console.log(`   Name: ${testPlan.displayName}`);
    console.log(`   Price: ₹${testPlan.priceINR}`);
    console.log(`   Tokens: ${testPlan.tokens.toLocaleString()}`);
    console.log(`   Features: ${testPlan.features.join(', ')}`);

    return testPlan;

  } catch (error) {
    console.error('❌ Failed to create test plan:', error);
    throw error;
  }
}

async function addMinimumTestPlans() {
  try {
    await connectDB();
    
    console.log('💳 Creating Minimum Test Payment Plans\n');
    
    // Plan 1: ₹2 Test Plan
    const testPlan2 = await Plan.findOneAndUpdate(
      { name: 'test-payment-2rs' },
      {
        name: 'test-payment-2rs',
        displayName: '₹2 Test Plan',
        description: 'Minimum test payment - Perfect for testing',
        priceINR: 2,
        tokens: 10000,
        modelType: 'paid',
        features: [
          '10K AI tokens',
          'Test payment flow',
          'Access paid models',
          'Great for testing!'
        ],
        isActive: true,
        sortOrder: 1,
        limitations: {
          maxRequestsPerHour: 50,
          maxModelsPerRequest: 3,
          allowedModelTypes: ['free', 'paid']
        },
        metadata: {
          isTestPlan: true,
          badge: 'TEST'
        }
      },
      { upsert: true, new: true }
    );

    // Plan 2: ₹5 Small Plan
    const testPlan5 = await Plan.findOneAndUpdate(
      { name: 'test-payment-5rs' },
      {
        name: 'test-payment-5rs',
        displayName: '₹5 Starter Test',
        description: 'Small test payment with more tokens',
        priceINR: 5,
        tokens: 30000,
        modelType: 'paid',
        features: [
          '30K AI tokens',
          'All free + paid models',
          'Higher rate limits',
          'Email support'
        ],
        isActive: true,
        sortOrder: 2,
        limitations: {
          maxRequestsPerHour: 100,
          maxModelsPerRequest: 5,
          allowedModelTypes: ['free', 'paid']
        },
        metadata: {
          isTestPlan: true,
          badge: 'POPULAR'
        }
      },
      { upsert: true, new: true }
    );

    console.log('✅ Test payment plans created/updated:');
    console.log(`\n1. ${testPlan2.displayName}`);
    console.log(`   - Price: ₹${testPlan2.priceINR}`);
    console.log(`   - Tokens: ${testPlan2.tokens.toLocaleString()}`);
    console.log(`   - ID: ${testPlan2._id}`);
    
    console.log(`\n2. ${testPlan5.displayName}`);
    console.log(`   - Price: ₹${testPlan5.priceINR}`);
    console.log(`   - Tokens: ${testPlan5.tokens.toLocaleString()}`);
    console.log(`   - ID: ${testPlan5._id}`);

    console.log('\n🧪 Test Plans Ready!');
    console.log('You can now test payments with these minimal amounts.');
    
    return [testPlan2, testPlan5];

  } catch (error) {
    console.error('❌ Error creating test plans:', error);
    process.exit(1);
  }
}

async function listAllPlans() {
  try {
    await connectDB();
    
    const plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });
    
    console.log(`📋 All Active Plans (${plans.length} total):\n`);
    
    plans.forEach((plan, index) => {
      const isTest = plan.metadata?.isTestPlan ? ' 🧪' : '';
      const badge = plan.metadata?.badge ? ` [${plan.metadata.badge}]` : '';
      
      console.log(`${index + 1}. ${plan.displayName}${badge}${isTest}`);
      console.log(`   Price: ₹${plan.priceINR} | Tokens: ${plan.tokens.toLocaleString()}`);
      console.log(`   ID: ${plan._id}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing plans:', error);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Test Payment Plan Management\n');
    console.log('Usage: node add-test-payment-plan.js [options]\n');
    console.log('Options:');
    console.log('  --create        Create test payment plans');
    console.log('  --list          List all active plans');
    console.log('  --help, -h      Show this help message\n');
    console.log('Creates minimum payment plans for testing:');
    console.log('  - ₹2 Test Plan (10K tokens)');
    console.log('  - ₹5 Starter Test (30K tokens)');
    return;
  }

  if (args.includes('--list')) {
    await listAllPlans();
    process.exit(0);
  }

  if (args.includes('--create') || args.length === 0) {
    const plans = await addMinimumTestPlans();
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = {
  addTestPaymentPlan,
  addMinimumTestPlans,
  listAllPlans
};