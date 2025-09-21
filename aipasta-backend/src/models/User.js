const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() { return (this.authProvider || 'local') === 'local'; },
    minlength: 6
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: null
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    defaultModels: [{
      type: String
    }],
    language: {
      type: String,
      default: 'en'
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    }
  },
  // Token System - Real tokenization instead of "per request"
  tokens: {
    balance: {
      type: Number,
      default: 10000, // 10k free tokens for new users
      min: 0
    },
    freeTokens: {
      type: Number,
      default: 10000, // 10k free tokens for new users
      min: 0
    },
    paidTokens: {
      type: Number,
      default: 0, // Tokens purchased through plans
      min: 0
    },
    totalUsed: {
      type: Number,
      default: 0
    },
    // Transaction log for token activity
    transactions: [{
      id: String,
      type: { type: String }, // deduct|topup|refund
      amount: Number, // tokens
      modelType: String, // free|paid|premium
      description: String,
      metadata: Object,
      timestamp: Date
    }]
  },
  // Current active plan
  currentPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    default: null // null = starter free plan
  },
  // Plan history and purchases
  planHistory: [{
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan'
    },
    purchasedAt: {
      type: Date,
      default: Date.now
    },
    tokensReceived: Number,
    amountPaid: Number,
    paymentId: String, // Razorpay payment ID
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    }
  }],
  // Legacy fields - keep for migration compatibility
  credits: {
    type: Number,
    default: 5000, // Map to tokens.balance for backwards compatibility
    min: 0
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    expiresAt: Date,
    limits: {
      requestsPerDay: {
        type: Number,
        default: 50
      },
      tokensPerMonth: {
        type: Number,
        default: 10000
      }
    }
  },
  stats: {
    messagesGenerated: {
      type: Number,
      default: 0
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    totalCost: {
      usd: {
        type: Number,
        default: 0
      },
      inr: {
        type: Number,
        default: 0
      }
    },
    lastActive: Date,
    loginCount: {
      type: Number,
      default: 0
    }
  },
  lastLoginAt: Date,
  emailVerifiedAt: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  }
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastLoginAt: 1 });

// Virtual for full name
userSchema.virtual('isVerified').get(function() {
  return !!this.emailVerifiedAt;
});

// Virtual for total available tokens (for backwards compatibility)
userSchema.virtual('totalTokens').get(function() {
  return this.tokens.balance;
});

// Token management methods
userSchema.methods.deductTokens = async function(amount, modelType = 'free', options = {}) {
  const amt = parseInt(amount, 10) || 0;
  if (amt <= 0) return this.tokens.balance;

  // Decide deduction order based on modelType
  let remaining = amt;
  const txs = this.tokens.transactions || [];

  // Helper to push transaction entries
  const pushTx = (type, a, mType, desc, meta = {}) => {
    txs.unshift({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      type,
      amount: a,
      modelType: mType,
      description: desc,
      metadata: meta,
      timestamp: new Date()
    });
  };

  try {
    if (modelType === 'free') {
      // Deduct from freeTokens first, then paidTokens if needed
      const fromFree = Math.min(this.tokens.freeTokens || 0, remaining);
      if (fromFree > 0) {
        this.tokens.freeTokens -= fromFree;
        remaining -= fromFree;
        pushTx('deduct', fromFree, 'free', options.description || 'Usage - free model', options.metadata);
      }

      if (remaining > 0) {
        const fromPaid = Math.min(this.tokens.paidTokens || 0, remaining);
        if (fromPaid > 0) {
          this.tokens.paidTokens -= fromPaid;
          remaining -= fromPaid;
          pushTx('deduct', fromPaid, 'paid', options.description || 'Usage - free model (paid cover)', options.metadata);
        }
      }
    } else if (modelType === 'paid' || modelType === 'premium') {
      // Deduct from paidTokens first, then fallback to freeTokens if needed
      const fromPaid = Math.min(this.tokens.paidTokens || 0, remaining);
      if (fromPaid > 0) {
        this.tokens.paidTokens -= fromPaid;
        remaining -= fromPaid;
        pushTx('deduct', fromPaid, 'paid', options.description || 'Usage - paid model', options.metadata);
      }

      if (remaining > 0) {
        const fromFree = Math.min(this.tokens.freeTokens || 0, remaining);
        if (fromFree > 0) {
          this.tokens.freeTokens -= fromFree;
          remaining -= fromFree;
          pushTx('deduct', fromFree, 'free', options.description || 'Usage - paid model (free cover)', options.metadata);
        }
      }
    } else {
      // Generic fallback: reduce balance proportionally from free then paid
      const fromFree = Math.min(this.tokens.freeTokens || 0, remaining);
      if (fromFree > 0) {
        this.tokens.freeTokens -= fromFree;
        remaining -= fromFree;
        pushTx('deduct', fromFree, 'free', options.description || 'Usage - fallback', options.metadata);
      }
      if (remaining > 0) {
        const fromPaid = Math.min(this.tokens.paidTokens || 0, remaining);
        if (fromPaid > 0) {
          this.tokens.paidTokens -= fromPaid;
          remaining -= fromPaid;
          pushTx('deduct', fromPaid, 'paid', options.description || 'Usage - fallback', options.metadata);
        }
      }
    }

    const deducted = amt - remaining;
    this.tokens.totalUsed = (this.tokens.totalUsed || 0) + deducted;
    this.tokens.balance = Math.max(0, (this.tokens.freeTokens || 0) + (this.tokens.paidTokens || 0));

    // Update legacy credits for compatibility
    this.credits = this.tokens.balance;

    // Update usage stats
    this.usage.totalRequests = (this.usage.totalRequests || 0) + 1;
    this.stats.tokensUsed = (this.stats.tokensUsed || 0) + deducted;

    // Save transactions array (keep it capped)
    this.tokens.transactions = txs.slice(0, 200);

    await this.save();

    if (remaining > 0) {
      // Not enough tokens to cover full amount
      return { remaining, deducted: deducted, balance: this.tokens.balance };
    }

    return { remaining: 0, deducted, balance: this.tokens.balance };
  } catch (err) {
    // In case of unexpected errors, rethrow
    throw err;
  }
};

userSchema.methods.addTokens = async function(amount, planId = null, paymentInfo = null, options = {}) {
  const amt = parseInt(amount, 10) || 0;
  if (amt <= 0) return this.tokens.balance;

  // Determine whether tokens are paid or free
  const isPaid = !!paymentInfo || options.target === 'paid' || (options.modelType === 'paid');
  if (isPaid) {
    this.tokens.paidTokens = (this.tokens.paidTokens || 0) + amt;
  } else {
    this.tokens.freeTokens = (this.tokens.freeTokens || 0) + amt;
  }

  // Recompute balance
  this.tokens.balance = (this.tokens.freeTokens || 0) + (this.tokens.paidTokens || 0);

  // Add to plan history if payment info provided
  if (paymentInfo) {
    this.planHistory.push({
      planId,
      tokensReceived: amt,
      amountPaid: paymentInfo.amount,
      paymentId: paymentInfo.paymentId,
      status: paymentInfo.status || 'completed'
    });
  }

  // Log transaction
  this.tokens.transactions = this.tokens.transactions || [];
  this.tokens.transactions.unshift({
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    type: 'topup',
    amount: amt,
    modelType: isPaid ? 'paid' : 'free',
    description: options.description || (isPaid ? 'Purchased tokens' : 'Free allocation'),
    metadata: paymentInfo || {},
    timestamp: new Date()
  });

  // Cap transaction history
  this.tokens.transactions = this.tokens.transactions.slice(0, 200);

  // Update legacy credits
  this.credits = this.tokens.balance;

  await this.save();
  return this.tokens.balance;
};

userSchema.methods.canUseModel = function(modelType) {
  // Free demo users can only use free models
  if (this.tokens.paidTokens === 0 && modelType !== 'free') {
    return false;
  }
  
  // Users with paid tokens can use paid models
  if (this.tokens.paidTokens > 0 && ['free', 'paid'].includes(modelType)) {
    return true;
  }
  
  // Premium access requires specific plan
  if (modelType === 'premium') {
    return this.currentPlan && this.currentPlan.modelType === 'premium';
  }
  
  return modelType === 'free';
};

userSchema.methods.getTokenCostForModel = function(modelType) {
  // Token costs based on model type
  const costs = {
    'free': 1,     // 1 token per request
    'paid': 10,    // 10 tokens per request  
    'premium': 50  // 50 tokens per request
  };
  
  return costs[modelType] || 1;
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only run if password field is modified
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // Set passwordChangedAt to now (only if this is not a new document)
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token is created after password change
  }
  
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  // False means password was not changed after JWT was issued
  return false;
};

// Instance method to check if user has enough credits
userSchema.methods.hasCredits = function(amount = 1) {
  return this.credits >= amount;
};

// Instance method to deduct credits
userSchema.methods.deductCredits = async function(amount = 1) {
  if (this.credits < amount) {
    throw new Error('Insufficient credits');
  }
  this.credits -= amount;
  await this.save();
  return this.credits;
};

module.exports = mongoose.model('User', userSchema);