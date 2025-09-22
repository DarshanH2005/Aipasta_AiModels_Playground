const express = require('express');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const AIModel = require('../models/AIModel');
const { AppError } = require('../middleware/errorHandler');
const { validateChatMessage, validateChatThread, validatePagination } = require('../middleware/validation');
const { authenticateToken, rateLimitByUser } = require('../middleware/auth');
const OpenRouterService = require('../services/openRouterService');
const HuggingFaceService = require('../services/huggingFaceService');
const router = express.Router();

// Initialize AI services
console.log('🔑 OpenRouter API Key configured:', process.env.OPENROUTER_API_KEY ? 'YES' : 'NO');
console.log('🔑 Actual API Key (first 15 chars):', process.env.OPENROUTER_API_KEY ? process.env.OPENROUTER_API_KEY.substring(0, 15) + '...' : 'MISSING');
const openRouterService = new OpenRouterService(process.env.OPENROUTER_API_KEY);
const huggingFaceService = new HuggingFaceService(process.env.HUGGINGFACE_API_KEY);

// Rate limiting for chat endpoints
const chatRateLimit = rateLimitByUser(50, 15 * 60 * 1000); // 50 requests per 15 minutes per user

// @desc    Create new chat thread/session
// @route   POST /api/chat/sessions
// @access  Private
const createChatThread = async (req, res, next) => {
  try {
    console.log('🚀 Create Chat Thread called:', {
      body: req.body,
      user: req.user ? { id: req.user._id, email: req.user.email, credits: req.user.credits } : 'No user',
      hasAuthHeader: !!req.headers.authorization
    });

    const { title, modelId } = req.body;
    const userId = req.user._id;

    // Generate unique session ID for authenticated users
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate model if provided (optional - fallback to direct API integration)
    let model = null;
    if (modelId) {
      try {
        model = await AIModel.findOne({ modelId });
        if (model && !model.isAvailable) {
          return next(new AppError('Model is currently unavailable', 503));
        }
        // If model not found in database, continue anyway (direct API integration)
        if (!model) {
          console.log(`Model ${modelId} not found in database, continuing with direct API integration`);
        }
      } catch (error) {
        console.warn(`Model validation failed for ${modelId}:`, error.message);
        // Continue anyway - direct API integration will handle model validation
      }
    }

    // Create new chat session
    const session = await ChatSession.create({
      sessionId,
      userId,
      title: title || 'New Chat',
      isActive: true,
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      models: model ? [{
        id: model.modelId,
        name: model.name,
        provider: model.provider,
        usageCount: 0
      }] : [],
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      },
      lastMessageAt: new Date()
    });

    res.status(201).json({
      status: 'success',
      message: 'Chat thread created successfully',
      data: {
        session: {
          _id: session._id,
          sessionId: session.sessionId,
          title: session.title,
          isActive: session.isActive,
          messageCount: session.messageCount,
          totalTokens: session.totalTokens,
          totalCost: session.totalCost,
          models: session.models,
          lastMessageAt: session.lastMessageAt,
          createdAt: session.createdAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Create Chat Thread Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      requestBody: req.body,
      userId: req.user?._id,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
};

// @desc    Send chat message
// @route   POST /api/chat
// @access  Private
const sendChatMessage = async (req, res, next) => {
  try {
    console.log('🚀 Chat API called:', {
      body: req.body,
      user: req.user ? { id: req.user._id, email: req.user.email, credits: req.user.credits } : 'No user',
      hasAuthHeader: !!req.headers.authorization
    });

    const { message, modelId, sessionId, options = {} } = req.body;

    // Validate required fields
    if (!message || !message.trim()) {
      console.log('❌ Missing message');
      return next(new AppError('Message is required', 400));
    }

    if (!modelId) {
      console.log('❌ Missing modelId');
      return next(new AppError('Model ID is required', 400));
    }

    if (!req.user) {
      console.log('❌ No user found in request');
      return next(new AppError('User not authenticated', 401));
    }

    const userId = req.user._id;
    console.log('✅ User authenticated:', { userId, credits: req.user.credits, tokens: req.user.tokens?.balance });

    // Check if user has credits/tokens
    if (!req.user.hasCredits(1)) {
      console.log('❌ Insufficient tokens:', { credits: req.user.credits, tokens: req.user.tokens?.balance });
      return next(new AppError('Insufficient credits. Please upgrade your account.', 403));
    }

    // Check user limits using subscription limits instead of undefined usageLimits
    const dailyLimit = req.user.subscription?.limits?.requestsPerDay || 50; // Default to 50 if not set
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailyUsage = await ChatMessage.countDocuments({
      userId,
      createdAt: { $gte: startOfDay }
    });

    if (dailyUsage >= dailyLimit) {
      return next(new AppError('Daily request limit exceeded', 429));
    }

    // Get or validate model (optional - allow direct API integration)
    let model = null;
    try {
      model = await AIModel.findOne({ modelId });
      if (model && !model.isAvailable) {
        return next(new AppError('Model is currently unavailable', 503));
      }
      
      // Check if user can use premium models (only if model exists in database)
        if (model && model.pricing.input > 0 && req.user.role === 'user') {
        // Return a structured paywall error so the frontend can show an appropriate UI
        const accessErr = new AppError('Premium model access requires subscription', 403);
        accessErr.code = 'PAYWALL';
        accessErr.requiredPlan = 'pro';
        return next(accessErr);
      }
    } catch (error) {
      console.warn(`Model validation failed for ${modelId}:`, error.message);
      // Continue anyway - direct API integration will handle model validation
    }

    // If model not found in database, log but continue (direct API integration)
    if (!model) {
      console.log(`Model ${modelId} not found in database, continuing with direct API integration`);
    }

    // Get or create chat session
    let session;
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId });
      if (!session) {
        return next(new AppError('Chat session not found', 404));
      }
    } else {
      // Create new session with auto-generated sessionId
      const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      session = await ChatSession.create({
        sessionId: newSessionId,
        userId,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        models: model ? [{
          id: model.modelId || modelId,
          name: model.name || 'Unknown Model',
          provider: model.provider || 'Direct API',
          usageCount: 0
        }] : []
      });
    }

    // Determine model type and token cost
    let modelType = 'free';
    let tokenCost = 1;
    
    if (model && model.pricing) {
      // If model has pricing, determine if it's free or paid
      if (model.pricing.input > 0 || model.pricing.output > 0) {
        modelType = 'paid';
        tokenCost = 10; // 10 tokens for paid models
      }
    } else {
      // For direct API calls without model in DB, check model ID for "free" designation
      // Enhanced detection for free models including OpenRouter free models
      const isFreeModel = modelId.includes(':free') || 
                         modelId.includes('free') || 
                         modelId.includes('Free') ||
                         modelId.includes('-free') ||
                         modelId.includes('/free') ||
                         modelId.endsWith(':free') ||
                         // OpenRouter specific free model patterns
                         modelId.includes('meta-llama/llama-3.1-405b-instruct:free') ||
                         modelId.includes('google/gemini-flash-1.5:free') ||
                         modelId.includes('mistralai/mistral-7b-instruct:free');
      
      if (isFreeModel) {
        modelType = 'free';
        tokenCost = 1;
        console.log(`🆓 Detected free model: ${modelId}`);
      } else {
        modelType = 'paid';
        tokenCost = 10;
        console.log(`💳 Detected paid model: ${modelId}`);
      }
    }
    
    // Check if user can use this model type
    const user = await require('../models/User').findById(userId);
    if (!user.canUseModel(modelType)) {
      // Provide structured paywall information for the client to act on (show upgrade modal, suggest free alternatives)
      const payErr = new AppError(`Access denied. This ${modelType} model requires a suitable plan.`, 403);
      payErr.code = 'PAYWALL';
      payErr.requiredPlan = modelType === 'paid' ? 'pro' : (modelType === 'premium' ? 'enterprise' : 'free');
      return next(payErr);
    }
    
    // Pre-check token availability (estimate based on max_tokens, model limits, or conservative default)
    // Use a conservative default (200 tokens) to avoid rejecting requests unnecessarily.
    // If model provides maxTokens or caller provided max_tokens, use those but cap to a sane upper bound.
    const MODEL_TOKEN_CAP = 2000;
    const estimatedTokenUsage = options.max_tokens
      ? Number(options.max_tokens)
      : (model && model.maxTokens ? Math.min(model.maxTokens, MODEL_TOKEN_CAP) : 200);
    if (user.tokens.balance < estimatedTokenUsage) {
      // Attach the latest user snapshot to req.user so the error handler can include balances in the response
      try {
        req.user = user;
      } catch (e) {
        // ignore
      }
      return next(new AppError(`Insufficient tokens. This request may use up to ${estimatedTokenUsage} tokens, but you only have ${user.tokens.balance} tokens available.`, 402));
    }
    
    console.log(`💰 Pre-check passed: User has ${user.tokens.balance} tokens, estimated usage: ${estimatedTokenUsage}`);
    
    // Note: Final token deduction happens after AI response based on actual usage

    // Create user message with proper messageId
    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`💬 Creating user message with sessionId: ${session.sessionId} for session _id: ${session._id}`);
    
    const userMessage = await ChatMessage.create({
      sessionId: session.sessionId, // Use session.sessionId instead of session._id
      userId,
      messageId: userMessageId,
      role: 'user',
      content: message,
      model: {
        id: modelId,
        name: model ? model.name : 'Unknown Model',
        provider: model ? model.provider : 'Direct API'
      },
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    // Get conversation history for context
    const conversationHistory = await ChatMessage.find({ sessionId: session.sessionId })
      .sort({ createdAt: 1 })
      .limit(20); // Limit context to last 20 messages

    // Prepare messages for AI service
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add the current user message if it's not already in the conversation history
    const currentUserMessage = { role: 'user', content: message };
    if (messages.length === 0 || messages[messages.length - 1].content !== message) {
      messages.push(currentUserMessage);
    }

    // Ensure we have at least one message
    if (messages.length === 0) {
      messages.push(currentUserMessage);
    }

    console.log(`📝 Sending ${messages.length} messages to AI service:`, messages.map((msg, i) => `${i+1}. ${msg.role}: ${msg.content.substring(0, 50)}...`));

    let aiResponse;
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let cost = { usd: 0, inr: 0 };
    const startTime = Date.now();
    
    // Route to appropriate AI service based on provider (or default to OpenRouter for direct API)
    const provider = model ? model.provider : 'OpenRouter';

    try {
      
      if (provider === 'OpenRouter') {
        console.log('🔄 Calling OpenRouter service with:', { modelId, messagesCount: messages.length });
        console.log('🔑 Service has API key:', openRouterService.apiKey ? 'YES' : 'NO');
        
        const response = await openRouterService.createChatCompletion(modelId, messages, {
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          top_p: options.top_p || 0.9,
          top_k: options.top_k,
          frequency_penalty: options.frequency_penalty,
          presence_penalty: options.presence_penalty
        });

        aiResponse = response.choices[0]?.message?.content || 'No response generated';
        
        // Extract usage information
        if (response.usage) {
          usage = {
            promptTokens: response.usage.prompt_tokens || 0,
            completionTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0
          };

          // Calculate cost (use model pricing if available, otherwise estimate)
          if (model && model.pricing) {
            const promptCost = (usage.promptTokens / 1000) * model.pricing.input;
            const completionCost = (usage.completionTokens / 1000) * model.pricing.output;
            cost.usd = promptCost + completionCost;
            cost.inr = cost.usd * 83; // Approximate USD to INR conversion
          } else {
            // Default pricing estimate for unknown models
            const promptCost = (usage.promptTokens / 1000) * 0.001; // $0.001 per 1k tokens
            const completionCost = (usage.completionTokens / 1000) * 0.002; // $0.002 per 1k tokens
            cost.usd = promptCost + completionCost;
            cost.inr = cost.usd * 83;
          }
        }

      } else if (provider === 'Hugging Face') {
        const response = await huggingFaceService.createTextGeneration(modelId, message, {
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 50
        });

        aiResponse = Array.isArray(response) && response[0]?.generated_text 
          ? response[0].generated_text.replace(message, '').trim()
          : 'No response generated';

        // HuggingFace doesn't provide usage stats, estimate based on response length
        usage = {
          promptTokens: Math.ceil(message.length / 4),
          completionTokens: Math.ceil(aiResponse.length / 4),
          totalTokens: Math.ceil((message.length + aiResponse.length) / 4)
        };
        cost = { usd: 0, inr: 0 }; // HuggingFace is free

      } else {
        throw new Error('Unsupported AI provider');
      }

    } catch (error) {
      // Log detailed provider error for diagnostics (don't leak internals to clients)
      console.error('AI Service Error:', {
        message: error?.message || String(error),
        provider: provider || (model && model.provider) || 'unknown',
        stack: error?.stack
      });

      // Return a friendly, non-fatal error to the client with structured metadata so the frontend
      // can surface a helpful message and optionally retry or fallback.
      const providerName = provider || (model && model.provider) || 'AI provider';
      const providerErr = new AppError(`AI provider (${providerName}) temporarily unavailable. Please try again in a moment.`, 503);
      providerErr.code = 'PROVIDER_ERROR';
      providerErr.provider = providerName;
      return next(providerErr);
    }

    // Use your internal fixed token system instead of OpenRouter's actual token usage
    // This fixes the issue where 800+ tokens were being deducted for simple "hi" responses
    const internalTokenCost = modelType === 'free' ? 1 : 10;
    const actualTokensUsed = internalTokenCost; // Track the actual tokens used for this request
    
    console.log(`🔍 Token Usage Debug:
      - OpenRouter reported tokens: ${usage.totalTokens}
      - Internal token cost (fixed): ${internalTokenCost}
      - Model type: ${modelType}
      - Using internal cost for deduction`);
    
    // Check if user has enough tokens for internal cost
    const currentUser = await require('../models/User').findById(userId);
    if (currentUser.tokens.balance < internalTokenCost) {
      // Still save the AI response but warn about token shortage
      console.warn(`⚠️ Token shortage: Request needs ${internalTokenCost} tokens, user has ${currentUser.tokens.balance} tokens`);
      
      // Deduct whatever tokens they have left and set balance to 0
      if (currentUser.tokens.balance > 0) {
        const remainingToDeduct = currentUser.tokens.balance;
        const res = await currentUser.deductTokens(remainingToDeduct, modelType);
        console.log(`💰 Deducted remaining ${res.deducted || remainingToDeduct} tokens from user ${userId}. Balance now: ${res.balance}`);
      }
      
      // Continue with response but include warning
      console.log(`⚠️ User ${userId} has insufficient tokens but response will be delivered`);
    } else {
      // Deduct the internal fixed token cost (corrected logic)
      const res = await currentUser.deductTokens(internalTokenCost, modelType);
      console.log(`💰 Deducted ${res.deducted || internalTokenCost} internal tokens from user ${userId}. Remaining: ${res.balance}`);
    }

    // Refresh req.user to reflect the latest token and credits balance
    try {
      const refreshed = await require('../models/User').findById(userId);
      if (refreshed && req.user) {
        req.user.tokens = refreshed.tokens;
        req.user.credits = refreshed.credits;
      }
    } catch (refreshErr) {
      console.warn('Failed to refresh req.user after token deduction:', refreshErr?.message || refreshErr);
    }

    // Create AI response message with proper messageId
    const aiMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🤖 Creating AI message with sessionId: ${session.sessionId} for session _id: ${session._id}`);
    
    const aiMessage = await ChatMessage.create({
      sessionId: session.sessionId, // Use session.sessionId instead of session._id
      userId,
      messageId: aiMessageId,
      role: 'assistant',
      content: aiResponse,
      model: {
        id: modelId,
        name: model ? model.name : 'Unknown Model',
        provider: model ? model.provider : 'Direct API'
      },
      usage: {
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        totalTokens: usage.totalTokens
      },
      tokensDeducted: internalTokenCost, // Store internal fixed tokens deducted (1 for free, 10 for paid)
      modelType: modelType, // Store model type for analytics
      responseTime: Date.now() - startTime,
      status: 'completed',
      metadata: {
        temperature: options.temperature || 0.7,
        maxTokens: options.max_tokens || 1000,
        topP: options.top_p || 0.9,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress
      }
    });

    // Update session stats
    session.messageCount += 2; // User message + AI response
    session.lastMessageAt = new Date();
    session.totalTokens += usage.totalTokens;
    session.totalCost += cost.usd; // Store cost in USD
    await session.save();

    // Update user stats (with safe property access)
    try {
      if (!req.user.stats) {
        req.user.stats = {
          messagesGenerated: 0,
          tokensUsed: 0,
          totalCost: { usd: 0, inr: 0 },
          loginCount: 0
        };
      }
      if (!req.user.stats.totalCost) {
        req.user.stats.totalCost = { usd: 0, inr: 0 };
      }

      req.user.stats.messagesGenerated += 1;
      req.user.stats.tokensUsed += usage.totalTokens;
      req.user.stats.totalCost.usd += cost.usd;
      req.user.stats.totalCost.inr += cost.inr;
      req.user.stats.lastActive = new Date();
      await req.user.save({ validateBeforeSave: false });
    } catch (statsError) {
      console.error('Error updating user stats:', statsError.message);
      // Don't fail the request if stats update fails
    }

    // Deduct tokens after successful AI response
    try {
      const deductResult = await req.user.deductTokens(1);
      console.log(`User ${req.user._id} tokens deducted. Remaining: ${deductResult.balance}`);
    } catch (creditsError) {
      console.error('Credits deduction error:', creditsError.message);
      // Don't fail the request if credits deduction fails (edge case)
    }

    // Update model usage stats (guarded - model or metadata may be null for direct API calls)
    try {
      if (model) {
        if (!model.metadata) model.metadata = {};
        if (!model.metadata.popularity) model.metadata.popularity = { usage: 0 };
        model.metadata.popularity.usage = (model.metadata.popularity.usage || 0) + 1;
        await model.save({ validateBeforeSave: false });
      } else {
        // No model document available (direct API integration); skip model usage update
        console.debug('No model document found - skipping model usage update');
      }
    } catch (metaErr) {
      console.error('Failed to update model usage metadata:', metaErr?.message || metaErr);
      // Don't fail the chat request because of metadata update problems
    }

    res.status(200).json({
      status: 'success',
      data: {
        session: {
          id: session._id,
          title: session.title
        },
        userMessage: {
          id: userMessage._id,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.createdAt
        },
        aiMessage: {
          id: aiMessage._id,
          role: aiMessage.role,
          content: aiMessage.content,
          usage,
          cost,
          createdAt: aiMessage.createdAt
        },
        user: {
          credits: req.user.credits, // Include updated credits in response
          tokens: {
            balance: currentUser.tokens.balance, // Include updated token balance
            used: actualTokensUsed // Tokens used in this request
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Chat API Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      requestBody: req.body,
      userId: req.user?._id,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
};

// @desc    Get chat sessions
// @route   GET /api/chat/sessions
// @access  Private
const getChatSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Use lastMessageAt and don't populate modelId (doesn't exist in schema)
    const sessions = await ChatSession.find({ userId })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ChatSession.countDocuments({ userId });
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      results: sessions.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      },
      data: {
        sessions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific chat session with messages
// @route   GET /api/chat/sessions/:sessionId
// @access  Private
const getChatSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    console.log('getChatSession called with:', { sessionId, userId: userId.toString() });

    // Get session - try both sessionId field and _id field for compatibility
    let session = await ChatSession.findOne({ sessionId, userId });
    
    console.log('First lookup (by sessionId field):', session ? 'FOUND' : 'NOT FOUND');
    
    // If not found by sessionId, try by _id (in case sessionId is actually the MongoDB _id)
    if (!session) {
      try {
        const mongoose = require('mongoose');
        // Convert sessionId to ObjectId if it's a valid ObjectId string
        const sessionObjectId = mongoose.Types.ObjectId.isValid(sessionId) 
          ? new mongoose.Types.ObjectId(sessionId) 
          : null;
          
        if (sessionObjectId) {
          session = await ChatSession.findOne({ _id: sessionObjectId, userId });
          console.log('Second lookup (by _id field):', session ? 'FOUND' : 'NOT FOUND');
        } else {
          console.log('sessionId is not a valid ObjectId:', sessionId);
        }
      } catch (error) {
        console.log('Second lookup failed:', error.message);
      }
    }

    if (!session) {
      return next(new AppError('Chat session not found', 404));
    }

    // Get messages with pagination - use the session's sessionId field
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sessionIdentifier = session.sessionId || session._id.toString();
    
    console.log('Looking for messages with sessionId:', sessionIdentifier);
    console.log('Session details:', { 
      _id: session._id.toString(), 
      sessionId: session.sessionId,
      title: session.title
    });
    
    const messages = await ChatMessage.find({ sessionId: sessionIdentifier })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`Found ${messages.length} messages for session ${sessionIdentifier}`);
    
    const totalMessages = await ChatMessage.countDocuments({ sessionId: sessionIdentifier });
    const totalPages = Math.ceil(totalMessages / limit);

    res.status(200).json({
      status: 'success',
      data: {
        session,
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMessages,
          totalPages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update chat session (title, settings)
// @route   PATCH /api/chat/sessions/:sessionId
// @access  Private
const updateChatSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { title, settings } = req.body;
    const userId = req.user._id;

    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return next(new AppError('Chat session not found', 404));
    }

    // Update allowed fields
    if (title) session.title = title;
    if (settings) {
      if (settings.temperature !== undefined) session.settings.temperature = settings.temperature;
      if (settings.maxTokens !== undefined) session.settings.maxTokens = settings.maxTokens;
      if (settings.topP !== undefined) session.settings.topP = settings.topP;
    }

    await session.save();

    res.status(200).json({
      status: 'success',
      data: {
        session
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete chat session
// @route   DELETE /api/chat/sessions/:sessionId
// @access  Private
const deleteChatSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) {
      return next(new AppError('Chat session not found', 404));
    }

    // Delete all messages in the session using the session's sessionId field
    await ChatMessage.deleteMany({ sessionId: session.sessionId });

    // Delete the session
    await ChatSession.findByIdAndDelete(sessionId);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete specific message
// @route   DELETE /api/chat/messages/:messageId
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await ChatMessage.findOne({ _id: messageId, userId });
    if (!message) {
      return next(new AppError('Message not found', 404));
    }

    await ChatMessage.findByIdAndDelete(messageId);

    // Update session message count
    await ChatSession.findByIdAndUpdate(message.sessionId, {
      $inc: { messageCount: -1 }
    });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chat statistics
// @route   GET /api/chat/stats
// @access  Private
const getChatStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const stats = await ChatSession.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalMessages: { $sum: '$messageCount' },
          totalTokens: { $sum: '$totalTokensUsed' },
          totalCostUSD: { $sum: '$totalCost.usd' },
          totalCostINR: { $sum: '$totalCost.inr' }
        }
      }
    ]);

    const result = stats[0] || {
      totalSessions: 0,
      totalMessages: 0,
      totalTokens: 0,
      totalCostUSD: 0,
      totalCostINR: 0
    };

    // Get usage by model
    const modelUsage = await ChatMessage.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$modelId',
          count: { $sum: 1 },
          totalTokens: { $sum: '$usage.totalTokens' },
          totalCost: { $sum: '$cost.usd' }
        }
      },
      {
        $lookup: {
          from: 'aimodels',
          localField: '_id',
          foreignField: 'modelId',
          as: 'model'
        }
      },
      {
        $project: {
          modelId: '$_id',
          modelName: { $arrayElemAt: ['$model.name', 0] },
          provider: { $arrayElemAt: ['$model.provider', 0] },
          count: 1,
          totalTokens: 1,
          totalCost: 1
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: result,
        modelUsage
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get chat messages for a session (query param approach)
// @route   GET /api/chat/messages?sessionId=...
// @access  Private
const getChatMessages = async (req, res, next) => {
  try {
    const { sessionId, limit = 50, page = 1 } = req.query;
    const userId = req.user._id; // Get authenticated user ID
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    console.log('getChatMessages called with:', { sessionId, userId: userId.toString(), limit, page });

    // First, find the session to get the correct sessionId and verify ownership
    // sessionId parameter could be either the sessionId field or the MongoDB _id
    let session = null;
    
    // Try to find by sessionId field first (with user ownership check)
    session = await ChatSession.findOne({ sessionId, userId });
    console.log('Session lookup by sessionId field:', session ? 'FOUND' : 'NOT FOUND');
    
    // If not found, try by MongoDB _id (with user ownership check)
    if (!session) {
      try {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(sessionId)) {
          const sessionObjectId = new mongoose.Types.ObjectId(sessionId);
          session = await ChatSession.findOne({ _id: sessionObjectId, userId });
          console.log('Session lookup by _id:', session ? 'FOUND' : 'NOT FOUND');
        }
      } catch (error) {
        console.log('Failed to lookup by _id:', error.message);
      }
    }

    if (!session) {
      console.log(`No session found for identifier: ${sessionId}`);
      return res.status(200).json({
        success: true,
        sessionId,
        conversationTurns: [],
        totalMessages: 0
      });
    }

    // Use the actual sessionId from the session document
    const actualSessionId = session.sessionId;
    console.log(`Session found. Using sessionId: ${actualSessionId} for message lookup`);

    // Find messages by the actual sessionId
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await ChatMessage.find({ sessionId: actualSessionId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    console.log(`Found ${messages.length} messages for sessionId: ${actualSessionId}`);

    if (messages.length === 0) {
      console.log(`No messages found for sessionId: ${actualSessionId}`);
      return res.status(200).json({
        success: true,
        sessionId,
        conversationTurns: [],
        totalMessages: 0
      });
    }

    // Group messages into conversation turns (user-assistant pairs)
    const conversationTurns = [];
    for (let i = 0; i < messages.length; i += 2) {
      const userMessage = messages[i];
      const assistantMessage = messages[i + 1];
      
      if (userMessage) {
        conversationTurns.push({
          user: {
            id: userMessage._id,
            content: userMessage.content,
            timestamp: userMessage.createdAt
          },
          assistant: assistantMessage ? {
            id: assistantMessage._id,
            content: assistantMessage.content,
            model: assistantMessage.modelId,
            usage: assistantMessage.usage,
            cost: assistantMessage.cost,
            timestamp: assistantMessage.createdAt
          } : null
        });
      }
    }

    const totalMessages = await ChatMessage.countDocuments({ sessionId: actualSessionId });

    res.status(200).json({
      success: true,
      sessionId,
      conversationTurns,
      totalMessages
    });

  } catch (error) {
    console.error('getChatMessages error:', error);
    next(error);
  }
};

// Routes
router.post('/', chatRateLimit, validateChatMessage, sendChatMessage);
router.post('/sessions', authenticateToken, createChatThread);
router.get('/sessions', authenticateToken, validatePagination, getChatSessions);
router.get('/sessions/:sessionId', authenticateToken, getChatSession);
router.get('/messages', authenticateToken, getChatMessages); // Add the missing messages route
router.patch('/sessions/:sessionId', authenticateToken, updateChatSession);
router.delete('/sessions/:sessionId', authenticateToken, deleteChatSession);
router.delete('/messages/:messageId', authenticateToken, deleteMessage);
router.get('/stats', authenticateToken, getChatStats);

module.exports = router;