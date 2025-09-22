const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  priceINR: {
    type: Number,
    required: true,
    min: 0
  },
  tokens: {
    type: Number,
    required: true,
    min: 0
  },
  modelType: {
    type: String,
    enum: ['free', 'paid', 'premium', 'enterprise', 'hybrid'],
    required: true,
    default: 'free'
  },
  features: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  // Plan limits and restrictions
  limitations: {
    maxRequestsPerHour: {
      type: Number,
      default: 50
    },
    maxModelsPerRequest: {
      type: Number,
      default: 3
    },
    allowedModelTypes: [{
      type: String,
      enum: ['free', 'paid', 'premium', 'enterprise', 'hybrid']
    }],
    maxTokensPerMonth: {
      type: Number,
      default: 100000
    },
    maxPremiumRequests: {
      type: Number,
      default: null // null means unlimited, number means limited
    }
  },
  // Razorpay integration fields
  razorpayPlanId: {
    type: String,
    sparse: true // Allow null but must be unique if present
  },
  // Tracking
  totalPurchases: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'plans'
});

// Indexes
planSchema.index({ modelType: 1, isActive: 1 });
planSchema.index({ priceINR: 1 });
planSchema.index({ sortOrder: 1 });

// Virtual for tokens per rupee ratio
planSchema.virtual('tokensPerRupee').get(function() {
  return this.priceINR > 0 ? (this.tokens / this.priceINR) : 0;
});

// Static method to get available plans
planSchema.statics.getAvailablePlans = function() {
  return this.find({ isActive: true }).sort({ sortOrder: 1 });
};

// Static method to get plan by type
planSchema.statics.getByModelType = function(modelType) {
  return this.find({ modelType, isActive: true }).sort({ priceINR: 1 });
};

// Instance method to check if user can access this plan's models
planSchema.methods.canAccessModel = function(modelType) {
  return this.limitations.allowedModelTypes.includes(modelType) || 
         this.modelType === 'premium'; // Premium plans can access all
};

// Pre-save middleware
planSchema.pre('save', function(next) {
  // Ensure plan has appropriate allowed model types
  if (this.modelType === 'free') {
    this.limitations.allowedModelTypes = ['free'];
  } else if (this.modelType === 'paid') {
    this.limitations.allowedModelTypes = ['free', 'paid'];
  } else if (this.modelType === 'premium') {
    this.limitations.allowedModelTypes = ['free', 'paid', 'premium'];
  }
  next();
});

module.exports = mongoose.model('Plan', planSchema);