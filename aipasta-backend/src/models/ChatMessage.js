const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Require userId for all authenticated messages
  },
  messageId: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  model: {
    id: String,
    name: String,
    provider: String
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'audio', 'document', 'video']
    },
    filename: String,
    originalName: String,
    size: Number,
    mimeType: String,
    url: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  usage: {
    inputTokens: {
      type: Number,
      default: 0
    },
    outputTokens: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    }
  },
  cost: {
    inputCost: {
      type: Number,
      default: 0
    },
    outputCost: {
      type: Number,
      default: 0
    },
    imageCost: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  responseTime: {
    type: Number, // in milliseconds
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  },
  metadata: {
    streamingDuration: Number,
    chunkCount: Number,
    temperature: Number,
    maxTokens: Number,
    topP: Number,
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Indexes
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ messageId: 1 }, { unique: true });
chatMessageSchema.index({ role: 1 });
chatMessageSchema.index({ 'model.provider': 1 });
chatMessageSchema.index({ status: 1 });

// Virtual for total cost in INR
chatMessageSchema.virtual('costInINR').get(function() {
  const USD_TO_INR = 83;
  return {
    inputCost: this.cost.inputCost * USD_TO_INR,
    outputCost: this.cost.outputCost * USD_TO_INR,
    imageCost: this.cost.imageCost * USD_TO_INR,
    totalCost: this.cost.totalCost * USD_TO_INR
  };
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);