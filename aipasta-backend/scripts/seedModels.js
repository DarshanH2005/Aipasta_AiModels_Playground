#!/usr/bin/env node

const mongoose = require('mongoose');
const AIModel = require('../src/models/AIModel');

// Load environment variables
require('dotenv').config();

const sampleModels = [
  {
    modelId: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    type: 'chat',
    description: 'Most capable GPT-4 model with improved efficiency, speed, and cost.',
    capabilities: {
      textGeneration: true,
      conversation: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: false
    },
    contextLength: 128000,
    pricing: {
      input: 0.000005,
      output: 0.000015,
      currency: 'USD',
      unit: 'token'
    },
    isAvailable: true,
    metadata: {
      popularity: {
        usage: 95,
        rating: 4.8,
        reviews: 1250
      },
      performance: {
        speed: 'fast',
        accuracy: 0.95,
        reliability: 0.98
      },
      tags: ['chat', 'assistant', 'reasoning', 'coding']
    }
  },
  {
    modelId: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    type: 'chat',
    description: 'More affordable and efficient version of GPT-4 with strong performance.',
    capabilities: {
      textGeneration: true,
      conversation: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: false
    },
    contextLength: 128000,
    pricing: {
      input: 0.00001,
      output: 0.00003,
      currency: 'USD',
      unit: 'token'
    },
    isAvailable: true,
    metadata: {
      popularity: {
        usage: 88,
        rating: 4.7,
        reviews: 950
      },
      performance: {
        speed: 'fast',
        accuracy: 0.92,
        reliability: 0.97
      },
      tags: ['chat', 'assistant', 'reasoning', 'coding']
    }
  },
  {
    modelId: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'chat',
    description: 'Anthropic\'s most powerful model for complex tasks and reasoning.',
    capabilities: {
      textGeneration: true,
      conversation: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: false
    },
    contextLength: 200000,
    pricing: {
      input: 0.000015,
      output: 0.000075,
      currency: 'USD',
      unit: 'token'
    },
    isAvailable: true,
    metadata: {
      popularity: {
        usage: 75,
        rating: 4.6,
        reviews: 680
      },
      performance: {
        speed: 'medium',
        accuracy: 0.94,
        reliability: 0.96
      },
      tags: ['chat', 'assistant', 'reasoning', 'analysis']
    }
  },
  {
    modelId: 'anthropic/claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    type: 'chat',
    description: 'Balanced Claude 3 model offering good performance and speed.',
    capabilities: {
      textGeneration: true,
      conversation: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: false
    },
    contextLength: 200000,
    pricing: {
      input: 0.000003,
      output: 0.000015,
      currency: 'USD',
      unit: 'token'
    },
    isAvailable: true,
    metadata: {
      popularity: {
        usage: 82,
        rating: 4.5,
        reviews: 540
      },
      performance: {
        speed: 'fast',
        accuracy: 0.90,
        reliability: 0.95
      },
      tags: ['chat', 'assistant', 'reasoning', 'balanced']
    }
  },
  {
    modelId: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    type: 'chat',
    description: 'Fast and cost-effective model for general conversation and basic tasks.',
    capabilities: {
      textGeneration: true,
      conversation: true,
      codeGeneration: true,
      reasoning: false,
      multimodal: false
    },
    contextLength: 16385,
    pricing: {
      input: 0.0000005,
      output: 0.0000015,
      currency: 'USD',
      unit: 'token'
    },
    isAvailable: true,
    metadata: {
      popularity: {
        usage: 65,
        rating: 4.2,
        reviews: 1800
      },
      performance: {
        speed: 'very fast',
        accuracy: 0.85,
        reliability: 0.94
      },
      tags: ['chat', 'assistant', 'fast', 'budget']
    }
  }
];

async function seedModels() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing models...');
    await AIModel.deleteMany({});

    console.log('📦 Inserting sample models...');
    const insertedModels = await AIModel.insertMany(sampleModels);
    
    console.log(`✅ Successfully seeded ${insertedModels.length} models:`);
    insertedModels.forEach(model => {
      console.log(`  - ${model.name} (${model.modelId})`);
    });

    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedModels();