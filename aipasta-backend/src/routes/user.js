const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const { AppError } = require('../middleware/errorHandler');
const { 
  validateProfileUpdate, 
  validatePagination,
  validateApiKeyGeneration
} = require('../middleware/validation');

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PATCH /api/user/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const { name, bio, preferences } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Update allowed fields
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (preferences) {
      if (preferences.theme) user.preferences.theme = preferences.theme;
      if (preferences.language) user.preferences.language = preferences.language;
      if (preferences.notifications !== undefined) {
        user.preferences.notifications = { ...user.preferences.notifications, ...preferences.notifications };
      }
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user usage statistics
// @route   GET /api/user/stats
// @access  Private
const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = '30d' } = req.query;

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get detailed stats
    const [sessionStats, messageStats, dailyUsage] = await Promise.all([
      // Session statistics
      ChatSession.aggregate([
        {
          $match: { 
            userId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            totalMessages: { $sum: '$messageCount' },
            totalTokens: { $sum: '$totalTokensUsed' },
            totalCostUSD: { $sum: '$totalCost.usd' },
            totalCostINR: { $sum: '$totalCost.inr' },
            avgTokensPerSession: { $avg: '$totalTokensUsed' },
            avgMessagesPerSession: { $avg: '$messageCount' }
          }
        }
      ]),

      // Message statistics by model
      ChatMessage.aggregate([
        {
          $match: { 
            userId,
            createdAt: { $gte: startDate },
            role: 'assistant'
          }
        },
        {
          $group: {
            _id: '$modelId',
            count: { $sum: 1 },
            totalTokens: { $sum: '$usage.totalTokens' },
            totalCost: { $sum: '$cost.usd' },
            avgTokensPerMessage: { $avg: '$usage.totalTokens' }
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
            totalCost: 1,
            avgTokensPerMessage: 1
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Daily usage
      ChatMessage.aggregate([
        {
          $match: { 
            userId,
            createdAt: { $gte: startDate },
            role: 'assistant'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            messages: { $sum: 1 },
            tokens: { $sum: '$usage.totalTokens' },
            cost: { $sum: '$cost.usd' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ])
    ]);

    const overallStats = sessionStats[0] || {
      totalSessions: 0,
      totalMessages: 0,
      totalTokens: 0,
      totalCostUSD: 0,
      totalCostINR: 0,
      avgTokensPerSession: 0,
      avgMessagesPerSession: 0
    };

    res.status(200).json({
      status: 'success',
      data: {
        period,
        overview: overallStats,
        modelUsage: messageStats,
        dailyUsage: dailyUsage.map(day => ({
          date: `${day._id.year}-${day._id.month.toString().padStart(2, '0')}-${day._id.day.toString().padStart(2, '0')}`,
          messages: day.messages,
          tokens: day.tokens,
          cost: day.cost
        })),
        limits: {
          daily: req.user.usageLimits.dailyRequests,
          monthly: req.user.usageLimits.monthlyRequests,
          tokens: req.user.usageLimits.monthlyTokens
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manage favorite models
// @route   POST /api/user/favorites/:modelId
// @access  Private
const toggleFavoriteModel = async (req, res, next) => {
  try {
    const { modelId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const favoriteIndex = user.preferences.favoriteModels.indexOf(modelId);
    let action;

    if (favoriteIndex > -1) {
      // Remove from favorites
      user.preferences.favoriteModels.splice(favoriteIndex, 1);
      action = 'removed';
    } else {
      // Add to favorites (limit to 10)
      if (user.preferences.favoriteModels.length >= 10) {
        return next(new AppError('Maximum 10 favorite models allowed', 400));
      }
      user.preferences.favoriteModels.push(modelId);
      action = 'added';
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: `Model ${action} to favorites`,
      data: {
        favoriteModels: user.preferences.favoriteModels
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get favorite models
// @route   GET /api/user/favorites
// @access  Private
const getFavoriteModels = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Get detailed model information
    const AIModel = require('../models/AIModel');
    const favoriteModels = await AIModel.find({
      modelId: { $in: user.preferences.favoriteModels }
    }).select('modelId name provider description category pricing capabilities');

    res.status(200).json({
      status: 'success',
      data: {
        favoriteModels
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate API key
// @route   POST /api/user/api-keys
// @access  Private
const generateApiKey = async (req, res, next) => {
  try {
    const { name, permissions = ['chat', 'models'], expiresIn = '30d' } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user already has maximum API keys (5)
    if (user.apiKeys.length >= 5) {
      return next(new AppError('Maximum 5 API keys allowed', 400));
    }

    // Generate API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn !== 'never') {
      expiresAt = new Date();
      switch (expiresIn) {
        case '30d':
          expiresAt.setDate(expiresAt.getDate() + 30);
          break;
        case '90d':
          expiresAt.setDate(expiresAt.getDate() + 90);
          break;
        case '1y':
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          break;
      }
    }

    // Add API key to user
    user.apiKeys.push({
      name,
      key: hashedKey,
      permissions,
      expiresAt,
      lastUsed: null,
      isActive: true
    });

    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'API key generated successfully',
      data: {
        apiKey: `aipasta_${apiKey}`, // Only show once
        keyInfo: {
          name,
          permissions,
          expiresAt,
          createdAt: new Date()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List API keys
// @route   GET /api/user/api-keys
// @access  Private
const listApiKeys = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Return API key info without the actual key
    const apiKeyInfo = user.apiKeys.map(key => ({
      id: key._id,
      name: key.name,
      permissions: key.permissions,
      expiresAt: key.expiresAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
      createdAt: key.createdAt
    }));

    res.status(200).json({
      status: 'success',
      data: {
        apiKeys: apiKeyInfo
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Revoke API key
// @route   DELETE /api/user/api-keys/:keyId
// @access  Private
const revokeApiKey = async (req, res, next) => {
  try {
    const { keyId } = req.params;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const keyIndex = user.apiKeys.findIndex(key => key._id.toString() === keyId);
    if (keyIndex === -1) {
      return next(new AppError('API key not found', 404));
    }

    user.apiKeys.splice(keyIndex, 1);
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'API key revoked successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export user data
// @route   GET /api/user/export
// @access  Private
const exportUserData = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get all user data
    const [user, sessions, messages] = await Promise.all([
      User.findById(userId).select('-password -apiKeys'),
      ChatSession.find({ userId }),
      ChatMessage.find({ userId })
    ]);

    const exportData = {
      user,
      sessions,
      messages,
      exportedAt: new Date()
    };

    res.status(200).json({
      status: 'success',
      data: exportData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
const deleteUserAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user._id;

    // Verify password
    const user = await User.findById(userId).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect password', 401));
    }

    // Delete all user data
    await Promise.all([
      ChatMessage.deleteMany({ userId }),
      ChatSession.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/profile', getUserProfile);
router.patch('/profile', validateProfileUpdate, updateUserProfile);
router.get('/stats', getUserStats);
router.post('/favorites/:modelId', toggleFavoriteModel);
router.get('/favorites', getFavoriteModels);
router.post('/api-keys', validateApiKeyGeneration, generateApiKey);
router.get('/api-keys', listApiKeys);
router.delete('/api-keys/:keyId', revokeApiKey);
router.get('/export', exportUserData);
router.delete('/account', deleteUserAccount);

module.exports = router;