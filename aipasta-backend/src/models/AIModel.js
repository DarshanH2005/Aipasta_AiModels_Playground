const mongoose = require('mongoose');

const aiModelSchema = new mongoose.Schema({
  modelId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['OpenRouter', 'Hugging Face', 'OpenAI', 'Anthropic', 'Google', 'Cohere', 'Meta']
  },
  description: String,
  category: {
    type: String,
    enum: ['multimodal', 'text-only', 'image', 'audio', 'code', 'specialized'],
    default: 'text-only'
  },
  capabilities: {
    text: {
      type: Boolean,
      default: true
    },
    image: {
      type: Boolean,
      default: false
    },
    audio: {
      type: Boolean,
      default: false
    },
    video: {
      type: Boolean,
      default: false
    },
    code: {
      type: Boolean,
      default: false
    },
    function_calling: {
      type: Boolean,
      default: false
    }
  },
  pricing: {
    input: {
      type: Number,
      required: true,
      default: 0 // per 1K tokens
    },
    output: {
      type: Number,
      required: true,
      default: 0 // per 1K tokens
    },
    image: {
      type: Number,
      default: 0 // per image
    },
    audio: {
      type: Number,
      default: 0 // per minute
    }
  },
  limits: {
    maxTokens: {
      type: Number,
      default: 4096
    },
    contextLength: {
      type: Number,
      default: 4096
    },
    rateLimit: {
      requests: Number,
      period: String // '1m', '1h', '1d'
    }
  },
  metadata: {
    architecture: String,
    parameterCount: String,
    trainingData: String,
    languages: [String],
    tags: [String],
    popularity: {
      downloads: Number,
      likes: Number,
      usage: Number
    },
    performance: {
      speed: String, // 'fast', 'medium', 'slow'
      quality: String, // 'high', 'medium', 'low'
      efficiency: String // 'high', 'medium', 'low'
    }
  },
  status: {
    type: String,
    enum: ['active', 'deprecated', 'maintenance', 'beta'],
    default: 'active'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isFree: {
    type: Boolean,
    default: function() {
      return this.pricing.input === 0 && this.pricing.output === 0;
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  cacheExpiry: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  }
}, {
  timestamps: true
});

// Indexes
aiModelSchema.index({ provider: 1 });
aiModelSchema.index({ category: 1 });
aiModelSchema.index({ isFree: 1 });
aiModelSchema.index({ status: 1 });
aiModelSchema.index({ isAvailable: 1 });
aiModelSchema.index({ 'metadata.popularity.usage': -1 });
aiModelSchema.index({ cacheExpiry: 1 }, { expireAfterSeconds: 0 });

// Virtual for formatted pricing
aiModelSchema.virtual('formattedPricing').get(function() {
  const USD_TO_INR = 83;
  return {
    usd: {
      input: this.pricing.input,
      output: this.pricing.output,
      image: this.pricing.image
    },
    inr: {
      input: this.pricing.input * USD_TO_INR,
      output: this.pricing.output * USD_TO_INR,
      image: this.pricing.image * USD_TO_INR
    }
  };
});

module.exports = mongoose.model('AIModel', aiModelSchema);