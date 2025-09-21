// @ts-nocheck
const express = require('express');
const AIModel = require('../models/AIModel');
const { AppError } = require('../middleware/errorHandler');
const { validateModelsPagination } = require('../middleware/validation');
const OpenRouterService = require('../services/openRouterService');
const HuggingFaceService = require('../services/huggingFaceService');

const router = express.Router();

// Initialize AI services
const openRouterService = new OpenRouterService(process.env.OPENROUTER_API_KEY);
const huggingFaceService = new HuggingFaceService(process.env.HUGGINGFACE_API_KEY);

// Simple in-memory cache for OpenRouter models
let modelsCache = {
  data: null,
  timestamp: null,
  ttl: 15 * 60 * 1000 // 15 minutes cache
};

// @desc    Get all available models
// @route   GET /api/models
// @access  Public (with optional auth for user-specific features)
const getAllModels = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 500, // Increase default limit for OpenRouter models
      provider, 
      category, 
      search,
      sort = 'popularity',
      minPrice,
      maxPrice,
      capabilities
    } = req.query;

    console.log('🔄 Fetching models from OpenRouter API...');
    
    // Check cache first
    let openRouterModels;
    const now = Date.now();
    if (modelsCache.data && modelsCache.timestamp && (now - modelsCache.timestamp) < modelsCache.ttl) {
      console.log('📦 Using cached OpenRouter models');
      openRouterModels = modelsCache.data;
    } else {
      console.log('🌐 Fetching fresh models from OpenRouter API...');
      openRouterModels = await openRouterService.getModels();
      
      // Update cache
      modelsCache.data = openRouterModels;
      modelsCache.timestamp = now;
      console.log(`💾 Cached ${openRouterModels?.length || 0} models for 15 minutes`);
    }
    
    if (!openRouterModels || openRouterModels.length === 0) {
      console.warn('⚠️ No models returned from OpenRouter');
      return res.status(200).json({
        status: 'success',
        results: 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        data: {
          models: []
        }
      });
    }

    let filteredModels = [...openRouterModels];

    // Apply filters
    if (provider) {
      const providerRegex = new RegExp(provider, 'i');
      filteredModels = filteredModels.filter(model => 
        providerRegex.test(model.provider || '')
      );
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filteredModels = filteredModels.filter(model => 
        searchRegex.test(model.name || '') ||
        searchRegex.test(model.modelId || '') ||
        searchRegex.test(model.description || '')
      );
    }

    // Price filtering
    if (minPrice !== undefined || maxPrice !== undefined) {
      filteredModels = filteredModels.filter(model => {
        const price = model.pricing?.input || 0;
        if (minPrice !== undefined && price < parseFloat(minPrice)) return false;
        if (maxPrice !== undefined && price > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    // Capability filtering
    if (capabilities) {
      const capabilityArray = capabilities.split(',');
      filteredModels = filteredModels.filter(model => {
        return capabilityArray.every(cap => {
          const capability = cap.trim();
          return model.capabilities && model.capabilities[capability] === true;
        });
      });
    }

    // Sort models
    switch (sort) {
      case 'popularity':
        // Sort by usage/popularity (assume models with lower prices are more popular)
        filteredModels.sort((a, b) => (a.pricing?.input || 0) - (b.pricing?.input || 0));
        break;
      case 'price_low':
        filteredModels.sort((a, b) => (a.pricing?.input || 0) - (b.pricing?.input || 0));
        break;
      case 'price_high':
        filteredModels.sort((a, b) => (b.pricing?.input || 0) - (a.pricing?.input || 0));
        break;
      case 'name':
        filteredModels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'newest':
        // Keep original order as OpenRouter likely returns newest first
        break;
      default:
        // Default sort: prioritize free models, then by quality/popularity
        const preferredFreeModels = [
          'meta-llama/llama-3.1-405b-instruct:free',
          'deepseek/deepseek-r1:free', 
          'deepseek/deepseek-chat-v3.1:free',
          'cognitivecomputations/dolphin3.0-mistral-24b:free',
          'deepseek/deepseek-r1-distill-llama-70b:free',
          'arliai/qwq-32b-arliai-rpr-v1:free'
        ];
        
        filteredModels.sort((a, b) => {
          const aFree = (a.pricing?.input || 0) === 0;
          const bFree = (b.pricing?.input || 0) === 0;
          
          // Priority for free models
          if (aFree && !bFree) return -1;
          if (!aFree && bFree) return 1;
          
          // If both free or both paid, prioritize preferred models
          const aPreferred = preferredFreeModels.indexOf(a.modelId);
          const bPreferred = preferredFreeModels.indexOf(b.modelId);
          
          if (aPreferred !== -1 && bPreferred === -1) return -1;
          if (aPreferred === -1 && bPreferred !== -1) return 1;
          if (aPreferred !== -1 && bPreferred !== -1) return aPreferred - bPreferred;
          
          // Finally sort by price (free models first, then by increasing price)
          return (a.pricing?.input || 0) - (b.pricing?.input || 0);
        });
    }

    // Apply pagination
    const total = filteredModels.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedModels = filteredModels.slice(skip, skip + parseInt(limit));
    const totalPages = Math.ceil(total / parseInt(limit));

    // Add user-specific data if authenticated
    const formattedModels = paginatedModels.map(model => {
      const modelObj = { ...model };
      
      // Add 'id' field for frontend compatibility (map from modelId)
      modelObj.id = model.modelId;
      
      if (req.user) {
        modelObj.isFavorite = req.user.preferences?.favoriteModels?.includes(model.modelId) || false;
        modelObj.canUse = model.pricing?.input === 0 || req.user.role !== 'user' || req.user.stats?.tokensUsed < req.user.usageLimits?.monthlyTokens;
      } else {
        modelObj.isFavorite = false;
        modelObj.canUse = true; // Allow all models for unauthenticated users
      }
      
      return modelObj;
    });

    console.log(`✅ Returning ${formattedModels.length} models out of ${total} total OpenRouter models`);

    res.status(200).json({
      status: 'success',
      results: formattedModels.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      data: {
        models: formattedModels
      }
    });
  } catch (error) {
    console.error('❌ Error fetching models from OpenRouter:', error);
    next(error);
  }
};

// @desc    Get models count only (fast endpoint)
// @route   GET /api/models/count
// @access  Public
const getModelsCount = async (req, res, next) => {
  try {
    // Use cache if available
    let openRouterModels;
    const now = Date.now();
    if (modelsCache.data && modelsCache.timestamp && (now - modelsCache.timestamp) < modelsCache.ttl) {
      openRouterModels = modelsCache.data;
    } else {
      openRouterModels = await openRouterService.getModels();
      modelsCache.data = openRouterModels;
      modelsCache.timestamp = now;
    }

    res.status(200).json({
      status: 'success',
      data: {
        total: openRouterModels?.length || 0,
        cached: !!(modelsCache.data && modelsCache.timestamp && (now - modelsCache.timestamp) < modelsCache.ttl)
      }
    });
  } catch (error) {
    console.error('❌ Error getting models count:', error);
    next(error);
  }
};

// @desc    Get model by ID
// @route   GET /api/models/:modelId
// @access  Public
const getModelById = async (req, res, next) => {
  try {
    const { modelId } = req.params;
    
    // Try to find in database first
    let model = await AIModel.findOne({ modelId });
    
    if (!model) {
      // If not found in database, try to fetch from providers
      let providerModel = null;
      
      // Try OpenRouter first
      try {
        providerModel = await openRouterService.getModelInfo(modelId);
      } catch (error) {
        // Try HuggingFace if OpenRouter fails
        try {
          providerModel = await huggingFaceService.getModelInfo(modelId);
        } catch (hfError) {
          return next(new AppError('Model not found', 404));
        }
      }
      
      if (!providerModel) {
        return next(new AppError('Model not found', 404));
      }
      
      model = providerModel;
    }

    // Add user-specific data if authenticated
    const modelData = model.toObject ? model.toObject() : model;
    if (req.user) {
      modelData.isFavorite = req.user.preferences.favoriteModels.includes(modelId);
      modelData.canUse = model.pricing.input === 0 || req.user.role !== 'user' || req.user.stats.tokensUsed < req.user.usageLimits.monthlyTokens;
    }

    res.status(200).json({
      status: 'success',
      data: {
        model: modelData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get models by category
// @route   GET /api/models/category/:category
// @access  Public
const getModelsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const validCategories = ['text-only', 'multimodal', 'code', 'image', 'audio'];
    if (!validCategories.includes(category)) {
      return next(new AppError('Invalid category', 400));
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const models = await AIModel.find({ category })
      .sort({ 'metadata.popularity.usage': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AIModel.countDocuments({ category });
    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      results: models.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      },
      data: {
        models
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available providers
// @route   GET /api/models/providers
// @access  Public
const getProviders = async (req, res, next) => {
  try {
    const providers = await AIModel.aggregate([
      {
        $group: {
          _id: '$provider',
          count: { $sum: 1 },
          categories: { $addToSet: '$category' },
          avgPrice: { $avg: '$pricing.input' },
          minPrice: { $min: '$pricing.input' },
          maxPrice: { $max: '$pricing.input' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        providers: providers.map(provider => ({
          name: provider._id,
          modelCount: provider.count,
          categories: provider.categories,
          pricing: {
            average: provider.avgPrice,
            min: provider.minPrice,
            max: provider.maxPrice
          }
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get model categories with stats
// @route   GET /api/models/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    const categories = await AIModel.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          providers: { $addToSet: '$provider' },
          avgPrice: { $avg: '$pricing.input' },
          popularModels: {
            $push: {
              modelId: '$modelId',
              name: '$name',
              usage: '$metadata.popularity.usage'
            }
          }
        }
      },
      {
        $addFields: {
          popularModels: {
            $slice: [
              { $sortArray: { input: '$popularModels', sortBy: { usage: -1 } } },
              3
            ]
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        categories: categories.map(category => ({
          name: category._id,
          modelCount: category.count,
          providers: category.providers,
          avgPrice: category.avgPrice,
          popularModels: category.popularModels.map(model => ({
            modelId: model.modelId,
            name: model.name
          }))
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Sync models from providers
// @route   POST /api/models/sync
// @access  Private (Admin only)
const syncModels = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Admin access required', 403));
    }

    const results = {
      openRouter: { added: 0, updated: 0, errors: 0 },
      huggingFace: { added: 0, updated: 0, errors: 0 }
    };

    // Sync OpenRouter models
    try {
      const openRouterModels = await openRouterService.getModels();
      
      for (const modelData of openRouterModels) {
        try {
          const existingModel = await AIModel.findOne({ modelId: modelData.modelId });
          
          if (existingModel) {
            await AIModel.findOneAndUpdate(
              { modelId: modelData.modelId },
              { ...modelData, updatedAt: new Date() },
              { new: true }
            );
            results.openRouter.updated++;
          } else {
            await AIModel.create(modelData);
            results.openRouter.added++;
          }
        } catch (error) {
          console.error(`Error syncing OpenRouter model ${modelData.modelId}:`, error);
          results.openRouter.errors++;
        }
      }
    } catch (error) {
      console.error('Error fetching OpenRouter models:', error);
    }

    // Sync HuggingFace models
    try {
      const huggingFaceModels = await huggingFaceService.getModels();
      
      for (const modelData of huggingFaceModels) {
        try {
          const existingModel = await AIModel.findOne({ modelId: modelData.modelId });
          
          if (existingModel) {
            await AIModel.findOneAndUpdate(
              { modelId: modelData.modelId },
              { ...modelData, updatedAt: new Date() },
              { new: true }
            );
            results.huggingFace.updated++;
          } else {
            await AIModel.create(modelData);
            results.huggingFace.added++;
          }
        } catch (error) {
          console.error(`Error syncing HuggingFace model ${modelData.modelId}:`, error);
          results.huggingFace.errors++;
        }
      }
    } catch (error) {
      console.error('Error fetching HuggingFace models:', error);
    }

    res.status(200).json({
      status: 'success',
      message: 'Model sync completed',
      data: {
        results
      }
    });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/', validateModelsPagination, getAllModels);
router.get('/count', getModelsCount); // New endpoint for quick model count
router.get('/providers', getProviders);
router.get('/categories', getCategories);
router.get('/category/:category', validateModelsPagination, getModelsByCategory);
router.post('/sync', syncModels);
router.get('/:modelId', getModelById);

module.exports = router;