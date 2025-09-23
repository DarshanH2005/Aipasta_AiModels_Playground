const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true, default: 'razorpay' },
  eventType: { type: String },
  eventId: { type: String, index: true },
  paymentId: { type: String, index: true },
  orderId: { type: String, index: true },
  signatureVerified: { type: Boolean, default: false },
  payload: { type: Object },
  processed: { type: Boolean, default: false },
  processedAt: Date,
  attempts: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'webhook_events'
});

// Create a compound unique index on provider and eventId, but only when eventId exists
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
