const express = require('express');
const crypto = require('crypto');
const WebhookEvent = require('../models/WebhookEvent');
const User = require('../models/User');
const Plan = require('../models/Plan');
const { AppError } = require('../middleware/errorHandler');
const Razorpay = require('razorpay');

const router = express.Router();

// Helper: create razorpay instance
function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// Helper: Verify webhook signature
function verifyWebhookSignature(body, signature, secret) {
  try {
    const bodyString = Buffer.isBuffer(body) ? body.toString('utf8') : 
                      typeof body === 'string' ? body : JSON.stringify(body);
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Helper: Log webhook event
async function logWebhookEvent(eventType, eventId, payload, error = null) {
  try {
    const logData = {
      provider: 'razorpay',
      eventType,
      eventId,
      payload,
      timestamp: new Date(),
      processed: false,
      error: error ? error.message : null
    };
    
    await WebhookEvent.findOneAndUpdate(
      { provider: 'razorpay', eventId },
      { $setOnInsert: logData },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('Failed to log webhook event:', err);
  }
}

// Helper: Process payment success
async function processPaymentSuccess(payment, orderId) {
  const razorpay = getRazorpayInstance();
  if (!razorpay) {
    throw new Error('Razorpay instance not configured');
  }

  // Fetch order details
  const order = await razorpay.orders.fetch(orderId);
  const planId = order?.notes?.planId;
  const userId = order?.notes?.userId;

  if (!planId || !userId) {
    throw new Error('Order missing planId/userId in notes');
  }

  // Get plan and user
  const [plan, user] = await Promise.all([
    Plan.findById(planId),
    User.findById(userId)
  ]);

  if (!plan || !user) {
    throw new Error('Plan or user not found');
  }

  // Check if already processed
  const alreadyProcessed = user.planHistory && 
    user.planHistory.some(p => p.paymentId === payment.id);
  
  if (alreadyProcessed) {
    return { status: 'already_processed' };
  }

  // Credit tokens
  const paymentInfo = {
    amount: payment.amount / 100, // Convert from paise to rupees
    paymentId: payment.id,
    status: payment.status,
    method: payment.method,
    processedAt: new Date()
  };

  await user.addTokens(plan.tokens, plan._id, paymentInfo);

  // Update plan statistics
  await Plan.findByIdAndUpdate(plan._id, {
    $inc: { 
      totalPurchases: 1,
      totalRevenue: plan.priceINR 
    }
  });

  // Update user's current plan if applicable
  if (!user.currentPlan || 
      plan.modelType === 'premium' || 
      (plan.modelType === 'paid' && user.currentPlan?.modelType === 'free')) {
    user.currentPlan = plan._id;
    await user.save();
  }

  return { 
    status: 'success', 
    tokensAdded: plan.tokens,
    newBalance: user.tokens.balance 
  };
}

// @desc    Enhanced Razorpay webhook handler
// @route   POST /api/webhooks/razorpay
// @access  Public (Razorpay calls this)
const handleRazorpayWebhook = async (req, res) => {
  try {
    // Get webhook secret
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('Webhook: No secret configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify signature
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    if (!body) {
      console.error('Webhook: Missing request body');
      return res.status(400).json({ error: 'Missing request body' });
    }

    if (!verifyWebhookSignature(body, signature, secret)) {
      console.warn('Webhook: Invalid signature', { 
        received: signature?.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse payload
    let payload;
    try {
      const bodyString = Buffer.isBuffer(body) ? body.toString('utf8') : body;
      payload = JSON.parse(bodyString);
    } catch (e) {
      console.error('Webhook: Failed to parse JSON body', e);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const event = payload.event;
    const eventId = payload.id || `${event}_${Date.now()}`;

    // Log the webhook event
    await logWebhookEvent(event, eventId, payload);

    console.log(`Webhook received: ${event} (${eventId})`);

    // Handle different event types
    switch (event) {
      case 'payment.captured':
      case 'payment.authorized': {
        const payment = payload.payload?.payment?.entity;
        if (!payment || !payment.id) {
          console.error('Webhook: Payment entity missing', { eventId });
          return res.status(400).json({ error: 'Payment entity missing' });
        }

        const orderId = payment.order_id;
        if (!orderId) {
          console.error('Webhook: Order ID missing in payment', { paymentId: payment.id });
          return res.status(400).json({ error: 'Order ID missing' });
        }

        // Check if already processed
        const existingEvent = await WebhookEvent.findOne({ 
          paymentId: payment.id, 
          processed: true 
        });
        
        if (existingEvent) {
          console.log('Webhook: Payment already processed', { paymentId: payment.id });
          return res.status(200).json({ status: 'already_processed' });
        }

        try {
          const result = await processPaymentSuccess(payment, orderId);
          
          // Mark as processed
          await WebhookEvent.findOneAndUpdate(
            { provider: 'razorpay', eventId },
            { 
              $set: { 
                paymentId: payment.id,
                orderId: orderId,
                signatureVerified: true,
                processed: true,
                processedAt: new Date(),
                result: result
              }
            }
          );

          console.log('Webhook: Payment processed successfully', { 
            paymentId: payment.id, 
            orderId,
            status: result.status 
          });

          return res.status(200).json({ status: 'success', result });

        } catch (error) {
          console.error('Webhook: Payment processing failed', error, { 
            paymentId: payment.id, 
            orderId 
          });
          
          // Update event with error
          await WebhookEvent.findOneAndUpdate(
            { provider: 'razorpay', eventId },
            { 
              $set: { 
                paymentId: payment.id,
                error: error.message,
                attempts: 1
              },
              $inc: { attempts: 1 }
            }
          );

          return res.status(500).json({ error: 'Payment processing failed' });
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payload?.payment?.entity;
        if (payment) {
          console.log('Webhook: Payment failed', { 
            paymentId: payment.id,
            reason: payment.error_description || 'Unknown error'
          });
          
          // Mark event as processed but failed
          await WebhookEvent.findOneAndUpdate(
            { provider: 'razorpay', eventId },
            { 
              $set: { 
                paymentId: payment.id,
                signatureVerified: true,
                processed: true,
                processedAt: new Date(),
                result: { status: 'failed', reason: payment.error_description }
              }
            }
          );
        }
        return res.status(200).json({ status: 'acknowledged' });
      }

      case 'order.paid': {
        const order = payload.payload?.order?.entity;
        if (order) {
          console.log('Webhook: Order paid', { orderId: order.id });
        }
        return res.status(200).json({ status: 'acknowledged' });
      }

      case 'refund.created':
      case 'refund.processed': {
        const refund = payload.payload?.refund?.entity;
        if (refund) {
          console.log(`Webhook: Refund ${event}`, { 
            refundId: refund.id,
            paymentId: refund.payment_id,
            amount: refund.amount 
          });
          
          // TODO: Handle refund logic - reverse token credits if needed
          // This would involve finding the user and deducting tokens
        }
        return res.status(200).json({ status: 'acknowledged' });
      }

      default: {
        console.log(`Webhook: Unhandled event type: ${event}`);
        return res.status(200).json({ status: 'ignored' });
      }
    }

  } catch (error) {
    console.error('Webhook: Unexpected error', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
};

// @desc    Get webhook events for debugging (admin only)
// @route   GET /api/webhooks/razorpay/events
// @access  Private (Admin)
const getWebhookEvents = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin only.', 403));
    }

    const { limit = 50, processed, paymentId } = req.query;
    
    let query = { provider: 'razorpay' };
    if (processed !== undefined) {
      query.processed = processed === 'true';
    }
    if (paymentId) {
      query.paymentId = paymentId;
    }

    const events = await WebhookEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: { events }
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Manually retry a failed webhook event (admin only)
// @route   POST /api/webhooks/razorpay/retry/:eventId
// @access  Private (Admin)
const retryWebhookEvent = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin only.', 403));
    }

    const { eventId } = req.params;
    
    const event = await WebhookEvent.findOne({ 
      provider: 'razorpay', 
      eventId 
    });

    if (!event) {
      return next(new AppError('Webhook event not found', 404));
    }

    if (event.processed) {
      return res.status(400).json({
        status: 'error',
        message: 'Event already processed successfully'
      });
    }

    // Retry processing based on event type
    const payload = event.payload;
    if (payload.event === 'payment.captured' || payload.event === 'payment.authorized') {
      const payment = payload.payload?.payment?.entity;
      const orderId = payment?.order_id;

      if (payment && orderId) {
        try {
          const result = await processPaymentSuccess(payment, orderId);
          
          // Update event
          await WebhookEvent.findByIdAndUpdate(event._id, {
            $set: {
              processed: true,
              processedAt: new Date(),
              result: result,
              retryCount: (event.retryCount || 0) + 1
            }
          });

          return res.status(200).json({
            status: 'success',
            message: 'Event processed successfully',
            data: { result }
          });

        } catch (error) {
          await WebhookEvent.findByIdAndUpdate(event._id, {
            $set: {
              error: error.message,
              retryCount: (event.retryCount || 0) + 1
            }
          });

          return next(new AppError(`Retry failed: ${error.message}`, 500));
        }
      }
    }

    return next(new AppError('Event type not supported for retry', 400));

  } catch (error) {
    next(error);
  }
};

// Routes
router.post('/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);
router.get('/razorpay/events', getWebhookEvents);
router.post('/razorpay/retry/:eventId', retryWebhookEvent);

module.exports = router;