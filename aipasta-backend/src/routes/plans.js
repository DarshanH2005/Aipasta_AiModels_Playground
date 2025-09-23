const express = require('express');
const Plan = require('../models/Plan');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { authenticateToken } = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const WebhookEvent = require('../models/WebhookEvent');
const router = express.Router();

// Helper: create razorpay instance
function getRazorpayInstance() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

// @desc    Get all available plans
// @route   GET /api/plans
// @access  Public
const getPlans = async (req, res, next) => {
  try {
    const { modelType } = req.query;
    
    let query = { isActive: true };
    if (modelType) {
      query.modelType = modelType;
    }
    
    const plans = await Plan.find(query).sort({ sortOrder: 1 });
    
    res.status(200).json({
      status: 'success',
      results: plans.length,
      data: { plans }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get plan by ID
// @route   GET /api/plans/:id
// @access  Public
const getPlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return next(new AppError('Plan not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: { plan }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Purchase a plan (mock for now, will integrate Razorpay later)
// @route   POST /api/plans/:id/purchase
// @access  Private
const purchasePlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { paymentMethod = 'mock' } = req.body;
    
    // Get the plan
    const plan = await Plan.findById(id);
    if (!plan || !plan.isActive) {
      return next(new AppError('Plan not found or inactive', 404));
    }
    
    // Get the user
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    // Mock payment processing (will integrate Razorpay later)
    let paymentInfo = {
      amount: plan.priceINR,
      paymentId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'completed'
    };
    
    // For free plans, no payment required
    if (plan.priceINR === 0) {
      paymentInfo = null;
    }
    
    // Add tokens to user account
    const newBalance = await user.addTokens(plan.tokens, plan._id, paymentInfo);
    
    // Update plan statistics
    await Plan.findByIdAndUpdate(id, {
      $inc: { 
        totalPurchases: 1,
        totalRevenue: plan.priceINR 
      }
    });
    
    // Update user's current plan if it's higher tier
    if (!user.currentPlan || plan.modelType === 'premium' || 
        (plan.modelType === 'paid' && user.currentPlan.modelType === 'free')) {
      user.currentPlan = plan._id;
      await user.save();
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Plan purchased successfully',
      data: {
        plan: {
          id: plan._id,
          name: plan.displayName,
          tokens: plan.tokens,
          price: plan.priceINR
        },
        user: {
          tokenBalance: newBalance,
          currentPlan: user.currentPlan
        },
        payment: paymentInfo
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// @desc    Create a Razorpay order for a plan (server-side)
// @route   POST /api/plans/:id/create-order
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const plan = await Plan.findById(id);
    if (!plan || !plan.isActive) {
      return next(new AppError('Plan not found or inactive', 404));
    }

    // Free plans don't require an order
    if (plan.priceINR === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Free plan - no payment required',
        data: { plan: { id: plan._id, priceINR: 0 } }
      });
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      return next(new AppError('Razorpay keys are not configured on the server', 500));
    }

    const amountPaise = Math.round(plan.priceINR * 100);
    // Razorpay limits receipt length (<= 40). Build a short receipt using plan id suffix and timestamp
    const receiptBase = `o_${String(plan._id).slice(-8)}_${Date.now().toString().slice(-6)}`;
    const receipt = receiptBase.length > 40 ? receiptBase.slice(0, 40) : receiptBase;
    const options = {
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        planId: String(plan._id),
        userId: String(userId)
      }
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      status: 'success',
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        razorpayKey: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Razorpay webhook receiver (verifies signature and credits tokens)
// @route   POST /api/plans/webhook
// @access  Public (Razorpay will POST here)
const plansWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('Webhook: no secret configured');
      return res.status(400).send('Webhook secret not configured');
    }

    const signature = req.headers['x-razorpay-signature'];
    const body = req.body; // express.raw should provide a Buffer here

    if (!body) {
      console.error('Webhook: missing raw body');
      return res.status(400).send('Missing body');
    }

    const bodyString = (Buffer.isBuffer(body) ? body.toString('utf8') : typeof body === 'string' ? body : JSON.stringify(body));
    const expected = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

    if (!signature || expected !== signature) {
      console.warn('Webhook: invalid signature', { got: signature, expected });
      return res.status(400).send('Invalid signature');
    }

    let payload;
    try {
      payload = JSON.parse(bodyString);
    } catch (e) {
      console.error('Webhook: failed to parse JSON body', e);
      return res.status(400).send('Invalid JSON');
    }

    const event = payload.event;

    // Extract a meaningful eventId (prefer payment id, then order id, then payload id)
    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;
    const eventId = (paymentEntity && paymentEntity.id) || (orderEntity && orderEntity.id) || payload.id || null;

    // Persist the event for audit (ensure we include paymentId/orderId when available)
    try {
      const upsertData = { provider: 'razorpay', eventType: event, eventId, payload };
      if (paymentEntity && paymentEntity.id) upsertData.paymentId = paymentEntity.id;
      if (orderEntity && orderEntity.id) upsertData.orderId = orderEntity.id;

      await WebhookEvent.findOneAndUpdate(
        { provider: 'razorpay', eventId },
        { $setOnInsert: upsertData },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn('Webhook: failed to persist initial event', e);
    }

    // Only handle payment-related events here
    if (event === 'payment.captured' || event === 'payment.authorized' || event === 'payment.failed') {
      const payment = paymentEntity;
      if (!payment || !payment.id) {
        console.error('Webhook: payment entity missing or malformed', { payload });
        return res.status(400).send('Payment entity missing');
      }

      // Idempotency: check processed by paymentId or eventId
      const existing = await WebhookEvent.findOne({ $or: [{ paymentId: payment.id }, { eventId }] });
      if (existing && existing.processed) {
        console.info('Webhook: already processed', { paymentId: payment.id, eventId });
        return res.status(200).send('Already processed');
      }

      const orderId = payment.order_id;
      if (!orderId) {
        // Can't proceed if we don't know order id
        console.warn('Webhook: payment has no order_id', { payment });
        await WebhookEvent.findOneAndUpdate({ eventId }, { $inc: { attempts: 1 }, $set: { paymentId: payment.id } });
        return res.status(400).send('Order id missing on payment');
      }

      const razorpay = getRazorpayInstance();
      if (!razorpay) {
        console.error('Webhook: razorpay instance not configured');
        return res.status(500).send('Razorpay not configured');
      }

      let order;
      try {
        order = await razorpay.orders.fetch(orderId);
      } catch (e) {
        console.error('Webhook: failed to fetch order from Razorpay', e, { orderId });
        await WebhookEvent.findOneAndUpdate({ eventId }, { $inc: { attempts: 1 }, $set: { paymentId: payment.id } });
        return res.status(500).send('Failed to fetch order');
      }

      const planId = order?.notes?.planId;
      const userId = order?.notes?.userId;

      if (!planId || !userId) {
        console.warn('Webhook: order missing planId/userId in notes', { order });
        await WebhookEvent.findOneAndUpdate({ eventId }, { $inc: { attempts: 1 }, $set: { paymentId: payment.id } });
        return res.status(400).send('Order missing metadata');
      }

      const plan = await Plan.findById(planId);
      const user = await User.findById(userId);
      if (!plan || !user) {
        console.warn('Webhook: plan or user not found', { planId, userId });
        await WebhookEvent.findOneAndUpdate({ eventId }, { $inc: { attempts: 1 }, $set: { paymentId: payment.id } });
        return res.status(404).send('Plan or user not found');
      }

      // If user's planHistory includes this paymentId, mark event processed and return
      const already = user.planHistory && user.planHistory.some(p => p.paymentId === payment.id);
      if (already) {
        await WebhookEvent.findOneAndUpdate({ $or: [{ eventId }, { paymentId: payment.id }] }, { $set: { paymentId: payment.id, signatureVerified: true, processed: true, processedAt: new Date() } });
        return res.status(200).send('Already processed');
      }

      // Credit tokens
      const paymentInfo = { amount: payment.amount / 100, paymentId: payment.id, status: payment.status };
      try {
        await user.addTokens(plan.tokens, plan._id, paymentInfo);
      } catch (e) {
        console.error('Webhook: failed to add tokens to user', e, { userId, planId, payment });
        await WebhookEvent.findOneAndUpdate({ eventId }, { $inc: { attempts: 1 }, $set: { paymentId: payment.id } });
        return res.status(500).send('Failed to credit user');
      }

      // Update plan stats & user currentPlan
      await Plan.findByIdAndUpdate(plan._id, { $inc: { totalPurchases: 1, totalRevenue: plan.priceINR } });
      if (!user.currentPlan || plan.modelType === 'premium' || (plan.modelType === 'paid' && user.currentPlan.modelType === 'free')) {
        user.currentPlan = plan._id;
        await user.save();
      }

      // Mark webhook event processed
      await WebhookEvent.findOneAndUpdate({ $or: [{ eventId }, { paymentId: payment.id }] }, { $set: { paymentId: payment.id, signatureVerified: true, processed: true, processedAt: new Date() } }, { upsert: true });

      return res.status(200).json({ status: 'ok' });
    }

    // Ignore other events
    res.status(200).json({ status: 'ignored' });
  } catch (error) {
    // If body wasn't raw or parsing failed, return 500 but log stack
    console.error('Webhook error', error && error.stack ? error.stack : error);
    res.status(500).send('Webhook handling error');
  }
};

// @desc    Verify Razorpay payment after client checkout and credit tokens
// @route   POST /api/plans/:id/verify-payment
// @access  Private
const verifyPayment = async (req, res, next) => {
  try {
    const { id } = req.params; // plan id
    const userId = req.user._id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return next(new AppError('Missing payment verification parameters', 400));
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return next(new AppError('Razorpay not configured', 500));

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return next(new AppError('Invalid payment signature', 400));
    }

    const razorpay = getRazorpayInstance();
    if (!razorpay) return next(new AppError('Razorpay not configured', 500));

    // Fetch payment to confirm status and amount
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (!payment || (payment.status !== 'captured' && payment.status !== 'authorized')) {
      return next(new AppError('Payment not captured', 400));
    }

    // Fetch order to retrieve notes (planId, userId)
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const planId = order.notes && order.notes.planId;
    const orderUserId = order.notes && order.notes.userId;

    if (!planId || !orderUserId || String(orderUserId) !== String(userId) || String(planId) !== String(id)) {
      return next(new AppError('Order metadata mismatch', 400));
    }

    const plan = await Plan.findById(planId);
    const user = await User.findById(userId);
    if (!plan || !user) return next(new AppError('Plan or user not found', 404));

    // Prevent double-crediting using WebhookEvent
    const existingEvent = await WebhookEvent.findOne({ paymentId: payment.id });
    if (existingEvent && existingEvent.processed) {
      // Return user snapshot
      const snapshot = {
        tokens: {
          balance: user.tokens.balance,
          freeTokens: user.tokens.freeTokens,
          paidTokens: user.tokens.paidTokens,
          totalUsed: user.tokens.totalUsed
        },
        currentPlan: user.currentPlan
      };
      return res.status(200).json({ status: 'success', message: 'Already processed', data: { user: snapshot } });
    }

    // Create or update event record
    await WebhookEvent.findOneAndUpdate(
      { paymentId: payment.id },
      { $set: { provider: 'razorpay', eventType: 'payment.verify', paymentId: payment.id, orderId: razorpay_order_id, payload: payment, signatureVerified: true } },
      { upsert: true, new: true }
    );

    const paymentInfo = { amount: payment.amount / 100, paymentId: payment.id, status: payment.status };
    await user.addTokens(plan.tokens, plan._id, paymentInfo);

    await Plan.findByIdAndUpdate(plan._id, { $inc: { totalPurchases: 1, totalRevenue: plan.priceINR } });

    // Update user's current plan if applicable
    if (!user.currentPlan || plan.modelType === 'premium' || (plan.modelType === 'paid' && user.currentPlan.modelType === 'free')) {
      user.currentPlan = plan._id;
      await user.save();
    }

    // Mark event processed
    await WebhookEvent.findOneAndUpdate({ paymentId: payment.id }, { $set: { processed: true, processedAt: new Date() } });

    const snapshot = {
      tokens: {
        balance: user.tokens.balance,
        freeTokens: user.tokens.freeTokens,
        paidTokens: user.tokens.paidTokens,
        totalUsed: user.tokens.totalUsed
      },
      currentPlan: user.currentPlan
    };

    res.status(200).json({ status: 'success', message: 'Payment verified and tokens credited', data: { user: snapshot } });

  } catch (error) {
    next(error);
  }
};

// @desc    Get user's plan history and current balance
// @route   GET /api/plans/my-account
// @access  Private
const getMyAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('currentPlan')
      .populate('planHistory.planId');
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        tokens: {
          balance: user.tokens.balance,
          freeTokens: user.tokens.freeTokens,
          paidTokens: user.tokens.paidTokens,
          totalUsed: user.tokens.totalUsed
        },
        currentPlan: user.currentPlan,
        planHistory: user.planHistory.slice(-10), // Last 10 purchases
        usage: {
          totalRequests: user.usage.totalRequests,
          tokensUsed: user.stats.tokensUsed
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
};

// Admin routes
// @desc    Create new plan (admin only)
// @route   POST /api/plans
// @access  Private (Admin)
const createPlan = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin only.', 403));
    }
    
    const plan = await Plan.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: { plan }
    });
    
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Plan with this name already exists', 400));
    }
    next(error);
  }
};

// @desc    Update plan (admin only)
// @route   PUT /api/plans/:id
// @access  Private (Admin)
const updatePlan = async (req, res, next) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return next(new AppError('Access denied. Admin only.', 403));
    }
    
    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    if (!plan) {
      return next(new AppError('Plan not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: { plan }
    });
    
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', getPlans);
router.get('/my-account', authenticateToken, getMyAccount);
router.get('/:id', getPlan);
router.post('/:id/purchase', authenticateToken, purchasePlan);
router.post('/:id/create-order', authenticateToken, createOrder);
router.post('/:id/verify-payment', authenticateToken, verifyPayment);
// Razorpay will POST here. Use raw body parsing for signature verification in server.js mounting, but express allows per-route raw parser as well
router.post('/webhook', express.raw({ type: 'application/json' }), plansWebhook);
// Development helper: seed a single plan if none exist. Only available in non-production.
router.post('/dev-seed', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') return next(new AppError('Not allowed', 403));
    const existing = await Plan.findOne({});
    if (existing) return res.status(200).json({ status: 'success', message: 'Plans already exist', data: { plan: existing } });

    const plan = await Plan.create({
      name: 'dev-paid-pack-' + Date.now(),
      displayName: 'Dev Paid Pack',
      description: 'Temporary dev-paid pack',
      priceINR: 19,
      tokens: 1000000,
      modelType: 'paid',
      features: ['Dev test tokens'],
      isActive: true,
      sortOrder: 99,
      limitations: { maxRequestsPerHour: 100, maxModelsPerRequest: 2, allowedModelTypes: ['free','paid'] }
    });

    res.status(201).json({ status: 'success', data: { plan } });
  } catch (err) {
    next(err);
  }
});

// Admin routes
router.post('/', authenticateToken, createPlan);
router.put('/:id', authenticateToken, updatePlan);

module.exports = router;