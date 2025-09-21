const mongoose = require('mongoose');
const Plan = require('../src/models/Plan');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ashishprjapati:1ZZ6wPNNV1zMgQDq@cluster0.qhp5q.mongodb.net/aipasta?retryWrites=true&w=majority');
    console.log('MongoDB connected for plan seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Default plans based on requirements
const defaultPlans = [
  {
    name: 'starter-free',
    displayName: 'Starter Free',
    description: 'Activate your free plan - Already included with registration!',
    priceINR: 0,
    tokens: 0, // No additional tokens - users already get 10k on signup
    modelType: 'free',
    features: [
      'Already active with your account',
      '10,000 free tokens included at signup',
      'Access to free models only',
      'Basic support'
    ],
    isActive: true,
    sortOrder: 1,
    limitations: {
      maxRequestsPerHour: 50,
      maxModelsPerRequest: 1,
      allowedModelTypes: ['free']
    }
  },
  {
    name: 'basic-free-pack',
    displayName: 'Basic Free Pack',
    description: '10M tokens for free models - Best value for beginners',
    priceINR: 19,
    tokens: 10000000, // 10M tokens
    modelType: 'free',
    features: [
      '10M tokens for free models',
      'GPT-3.5 Turbo, Claude 3 Haiku',
      'Llama 3.1, Gemma 7B',
      'Email support',
      'Basic rate limits'
    ],
    isActive: true,
    sortOrder: 2,
    limitations: {
      maxRequestsPerHour: 100,
      maxModelsPerRequest: 2,
      allowedModelTypes: ['free']
    }
  },
  {
    name: 'pro-paid-pack',
    displayName: 'Pro Paid Pack',
    description: '1M tokens for premium AI models - For serious users',
    priceINR: 19,
    tokens: 1000000, // 1M tokens  
    modelType: 'paid',
    features: [
      '1M tokens for premium models',
      'GPT-4o, Claude 3.5 Sonnet',
      'Llama 3.1 405B, Gemini Pro',
      'All free models included',
      'Priority support',
      'Higher rate limits'
    ],
    isActive: true,
    sortOrder: 3,
    limitations: {
      maxRequestsPerHour: 200,
      maxModelsPerRequest: 3,
      allowedModelTypes: ['free', 'paid']
    }
  },
  {
    name: 'enterprise-premium',
    displayName: 'Enterprise Premium',
    description: '5M tokens for all models + premium features',
    priceINR: 99,
    tokens: 5000000, // 5M tokens
    modelType: 'premium',
    features: [
      '5M tokens for all models',
      'Access to latest GPT-4, Claude, Llama',
      'Custom model fine-tuning',
      'API access',
      '24/7 priority support',
      'No rate limits',
      'Advanced analytics'
    ],
    isActive: true,
    sortOrder: 4,
    limitations: {
      maxRequestsPerHour: 1000,
      maxModelsPerRequest: 5,
      allowedModelTypes: ['free', 'paid', 'premium']
    }
  }
];

const seedPlans = async () => {
  try {
    await connectDB();

    // Clear existing plans
    console.log('Clearing existing plans...');
    await Plan.deleteMany({});

    // Insert new plans
    console.log('Inserting default plans...');
    const createdPlans = await Plan.insertMany(defaultPlans);

    console.log(`✅ Successfully seeded ${createdPlans.length} plans:`);
    createdPlans.forEach(plan => {
      console.log(`   ${plan.displayName}: ₹${plan.priceINR} for ${plan.tokens.toLocaleString()} tokens`);
    });

    // Display plan summary
    console.log('\n📊 Plan Summary:');
    console.log('┌─────────────────────┬────────┬──────────────┬─────────────┐');
    console.log('│ Plan                │ Price  │ Tokens       │ Model Type  │');
    console.log('├─────────────────────┼────────┼──────────────┼─────────────┤');
    
    createdPlans.forEach(plan => {
      const name = plan.displayName.padEnd(19);
      const price = `₹${plan.priceINR}`.padStart(6);
      const tokens = plan.tokens.toLocaleString().padStart(12);
      const modelType = plan.modelType.padEnd(11);
      console.log(`│ ${name} │ ${price} │ ${tokens} │ ${modelType} │`);
    });
    
    console.log('└─────────────────────┴────────┴──────────────┴─────────────┘');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding plans:', error);
    process.exit(1);
  }
};

// Run the seeding
if (require.main === module) {
  seedPlans();
}

module.exports = { seedPlans, defaultPlans };