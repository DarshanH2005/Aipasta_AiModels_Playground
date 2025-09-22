require('dotenv').config();
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

// Intelligent Profitable Plans - Market-aligned pricing with healthy profit margins
const defaultPlans = [
  {
    name: 'starter-free',
    displayName: 'Free Explorer',
    description: 'Perfect for trying out AI - Get started for free!',
    priceINR: 0,
    tokens: 0, // No additional tokens - users get 10k on signup
    modelType: 'free',
    features: [
      '10,000 free tokens included at signup',
      'Access to 15+ free AI models',
      'Llama 3.1 8B, Mistral 7B, Gemma 2B',
      'Community support',
      'Basic usage analytics'
    ],
    isActive: true,
    sortOrder: 1,
    limitations: {
      maxRequestsPerHour: 30,
      maxModelsPerRequest: 1,
      allowedModelTypes: ['free'],
      maxTokensPerMonth: 50000
    }
  },
  {
    name: 'starter-boost',
    displayName: 'Starter Boost',
    description: 'Extra free model tokens for hobbyists and learners',
    priceINR: 99,
    tokens: 100000, // 100K tokens - reasonable for free models
    modelType: 'free',
    features: [
      '100K extra tokens for free models',
      'All free models included',
      'GPT-3.5, Claude Haiku, Llama variants',
      'Email support',
      'Usage analytics dashboard',
      'No daily limits'
    ],
    isActive: true,
    sortOrder: 2,
    limitations: {
      maxRequestsPerHour: 60,
      maxModelsPerRequest: 2,
      allowedModelTypes: ['free'],
      maxTokensPerMonth: 200000
    }
  },
  {
    name: 'pocket-pack',
    displayName: 'Pocket Pack',
    description: 'Premium AI for the price of a movie ticket! 🍿',
    priceINR: 39,
    tokens: 20000, // 20K tokens - mix of free and some premium access
    modelType: 'hybrid', // New type for mixed access
    features: [
      '20,000 tokens (free + premium models)',
      '10 premium model requests included',
      'GPT-4o, Claude 3.5 Sonnet access',
      'All free models unlimited',
      'Priority queue processing',
      'Chat history export',
      'No ads or watermarks',
      'Mobile app access',
      'Community Discord access'
    ],
    isActive: true,
    sortOrder: 2.5, // Place between Starter Boost and Pro Essential
    limitations: {
      maxRequestsPerHour: 100,
      maxModelsPerRequest: 2,
      allowedModelTypes: ['free', 'paid'], // Can access paid models with limits
      maxTokensPerMonth: 40000,
      maxPremiumRequests: 10 // Special limit for premium models
    }
  },
  {
    name: 'pro-essential',
    displayName: 'Pro Essential',
    description: 'Access premium AI models - Perfect for professionals',
    priceINR: 499,
    tokens: 50000, // 50K tokens for premium models = ~500-1000 requests
    modelType: 'paid',
    features: [
      '50,000 tokens for premium models',
      'GPT-4o, Claude 3.5 Sonnet, Gemini Pro',
      'All free models unlimited',
      'Priority support',
      'Advanced analytics',
      'Model comparison tools',
      'Export conversation history'
    ],
    isActive: true,
    sortOrder: 3,
    limitations: {
      maxRequestsPerHour: 120,
      maxModelsPerRequest: 3,
      allowedModelTypes: ['free', 'paid'],
      maxTokensPerMonth: 100000
    }
  },
  {
    name: 'pro-unlimited',
    displayName: 'Pro Unlimited',
    description: 'Unlimited premium AI access for power users',
    priceINR: 1299,
    tokens: 200000, // 200K tokens = ~2000-4000 premium requests
    modelType: 'premium',
    features: [
      '200,000 tokens for all models',
      'Access to latest GPT-4, Claude, Llama 405B',
      'Unlimited free model usage',
      'Multiple model responses',
      'API access (coming soon)',
      '24/7 priority support',
      'Advanced usage analytics',
      'Custom model presets',
      'Bulk operations'
    ],
    isActive: true,
    sortOrder: 4,
    limitations: {
      maxRequestsPerHour: 300,
      maxModelsPerRequest: 5,
      allowedModelTypes: ['free', 'paid', 'premium'],
      maxTokensPerMonth: 500000
    }
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Custom solutions for teams and businesses',
    priceINR: 2999,
    tokens: 1000000, // 1M tokens = enterprise level usage
    modelType: 'enterprise',
    features: [
      '1,000,000 tokens per month',
      'All premium models included',
      'Dedicated model instances',
      'Custom fine-tuning',
      'Team collaboration features',
      'Dedicated account manager',
      'SLA guarantees',
      'Custom integrations',
      'Priority model access',
      'Advanced security features'
    ],
    isActive: true,
    sortOrder: 5,
    limitations: {
      maxRequestsPerHour: 1000,
      maxModelsPerRequest: 10,
      allowedModelTypes: ['free', 'paid', 'premium', 'enterprise'],
      maxTokensPerMonth: 2000000
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