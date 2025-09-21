const express = require('express');
const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const AIModel = require('../models/AIModel');
const { AppError } = require('../middleware/errorHandler');
const { requireAdmin } = require('../middleware/auth');
const { validateUserUpdate, validatePagination } = require('../middleware/validation');

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getAdminStats = async (req, res, next) => {
  try {
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

    // Get comprehensive stats
    const [userStats, sessionStats, messageStats, modelStats, recentActivity] = await Promise.all([
      // User statistics
      User.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [
              { $match: { 'stats.lastActive': { $gte: startDate } } },
              { $count: 'count' }
            ],
            byRole: [
              { $group: { _id: '$role', count: { $sum: 1 } } }
            ],
            newUsers: [
              { $match: { createdAt: { $gte: startDate } } },
              { $count: 'count' }
            ],
            topUsers: [
              { $sort: { 'stats.tokensUsed': -1 } },
              { $limit: 10 },
              {
                $project: {
                  name: 1,
                  email: 1,
                  role: 1,
                  tokensUsed: '$stats.tokensUsed',
                  messagesGenerated: '$stats.messagesGenerated',
                  totalCost: '$stats.totalCost'
                }
              }
            ]
          }
        }
      ]),

      // Session statistics
      ChatSession.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            recent: [
              { $match: { createdAt: { $gte: startDate } } },
              { $count: 'count' }
            ],
            avgDuration: [
              {
                $group: {
                  _id: null,
                  avgDuration: {
                    $avg: {
                      $subtract: ['$lastActivity', '$createdAt']
                    }
                  }
                }
              }
            ],
            byModel: [
              { $group: { _id: '$modelId', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            totalTokensUsed: [
              { $group: { _id: null, total: { $sum: '$totalTokensUsed' } } }
            ],
            totalCost: [
              { $group: { _id: null, usd: { $sum: '$totalCost.usd' }, inr: { $sum: '$totalCost.inr' } } }
            ]
          }
        }
      ]),

      // Message statistics
      ChatMessage.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            recent: [
              { $match: { createdAt: { $gte: startDate } } },
              { $count: 'count' }
            ],
            byRole: [
              { $group: { _id: '$role', count: { $sum: 1 } } }
            ],
            avgTokensPerMessage: [
              { $match: { role: 'assistant' } },
              {
                $group: {
                  _id: null,
                  avgTokens: { $avg: '$usage.totalTokens' }
                }
              }
            ],
            dailyActivity: [
              { $match: { createdAt: { $gte: startDate } } },
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                  },
                  messages: { $sum: 1 },
                  tokens: { $sum: '$usage.totalTokens' }
                }
              },
              { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
            ]
          }
        }
      ]),

      // Model statistics
      AIModel.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            byProvider: [
              { $group: { _id: '$provider', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            byCategory: [
              { $group: { _id: '$category', count: { $sum: 1 } } },
              { $sort: { count: -1 } }
            ],
            mostUsed: [
              { $sort: { 'metadata.popularity.usage': -1 } },
              { $limit: 10 },
              {
                $project: {
                  modelId: 1,
                  name: 1,
                  provider: 1,
                  usage: '$metadata.popularity.usage',
                  pricing: 1
                }
              }
            ]
          }
        }
      ]),

      // Recent activity
      ChatMessage.find({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(20)
        .select('userId modelId role content createdAt usage cost')
    ]);

    // Format the response
    const stats = {
      users: {
        total: userStats[0].total[0]?.count || 0,
        active: userStats[0].active[0]?.count || 0,
        new: userStats[0].newUsers[0]?.count || 0,
        byRole: userStats[0].byRole,
        topUsers: userStats[0].topUsers
      },
      sessions: {
        total: sessionStats[0].total[0]?.count || 0,
        recent: sessionStats[0].recent[0]?.count || 0,
        avgDuration: sessionStats[0].avgDuration[0]?.avgDuration || 0,
        totalTokens: sessionStats[0].totalTokensUsed[0]?.total || 0,
        totalCost: sessionStats[0].totalCost[0] || { usd: 0, inr: 0 },
        byModel: sessionStats[0].byModel
      },
      messages: {
        total: messageStats[0].total[0]?.count || 0,
        recent: messageStats[0].recent[0]?.count || 0,
        avgTokens: messageStats[0].avgTokensPerMessage[0]?.avgTokens || 0,
        byRole: messageStats[0].byRole,
        dailyActivity: messageStats[0].dailyActivity.map(day => ({
          date: `${day._id.year}-${day._id.month.toString().padStart(2, '0')}-${day._id.day.toString().padStart(2, '0')}`,
          messages: day.messages,
          tokens: day.tokens
        }))
      },
      models: {
        total: modelStats[0].total[0]?.count || 0,
        byProvider: modelStats[0].byProvider,
        byCategory: modelStats[0].byCategory,
        mostUsed: modelStats[0].mostUsed
      },
      recentActivity
    };

    res.status(200).json({
      status: 'success',
      data: {
        period,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with pagination and filtering
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      role, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { email: { $regex: new RegExp(search, 'i') } }
      ];
    }
    
    if (role) filter.role = role;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-password'),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages
      },
      data: {
        users
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific user details
// @route   GET /api/admin/users/:userId
// @access  Private (Admin only)
const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Get user's activity stats
    const [sessions, messages, recentActivity] = await Promise.all([
      ChatSession.find({ userId }).sort({ createdAt: -1 }).limit(5),
      ChatMessage.countDocuments({ userId }),
      ChatMessage.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('modelId role content createdAt usage cost')
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        user,
        activity: {
          totalSessions: sessions.length,
          totalMessages: messages,
          recentSessions: sessions,
          recentMessages: recentActivity
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user (admin action)
// @route   PATCH /api/admin/users/:userId
// @access  Private (Admin only)
const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role, isActive, usageLimits, preferences } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent admin from demoting themselves
    if (userId === req.user._id.toString() && role && role !== 'admin') {
      return next(new AppError('Cannot change your own admin role', 400));
    }

    // Update allowed fields
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (usageLimits) {
      if (usageLimits.dailyRequests !== undefined) {
        user.usageLimits.dailyRequests = usageLimits.dailyRequests;
      }
      if (usageLimits.monthlyRequests !== undefined) {
        user.usageLimits.monthlyRequests = usageLimits.monthlyRequests;
      }
      if (usageLimits.monthlyTokens !== undefined) {
        user.usageLimits.monthlyTokens = usageLimits.monthlyTokens;
      }
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin action)
// @route   DELETE /api/admin/users/:userId
// @access  Private (Admin only)
const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return next(new AppError('Cannot delete your own account', 400));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Delete all user data
    await Promise.all([
      ChatMessage.deleteMany({ userId }),
      ChatSession.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system health and performance metrics
// @route   GET /api/admin/system
// @access  Private (Admin only)
const getSystemMetrics = async (req, res, next) => {
  try {
    const metrics = {
      timestamp: new Date(),
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {
        // Basic connection status
        isConnected: require('mongoose').connection.readyState === 1,
        collections: {
          users: await User.estimatedDocumentCount(),
          sessions: await ChatSession.estimatedDocumentCount(),
          messages: await ChatMessage.estimatedDocumentCount(),
          models: await AIModel.estimatedDocumentCount()
        }
      }
    };

    res.status(200).json({
      status: 'success',
      data: {
        metrics
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manage AI models (admin actions)
// @route   PATCH /api/admin/models/:modelId
// @access  Private (Admin only)
const updateModel = async (req, res, next) => {
  try {
    const { modelId } = req.params;
    const { isAvailable, status, pricing } = req.body;

    const model = await AIModel.findOne({ modelId });
    if (!model) {
      return next(new AppError('Model not found', 404));
    }

    if (isAvailable !== undefined) model.isAvailable = isAvailable;
    if (status !== undefined) model.status = status;
    if (pricing) {
      if (pricing.input !== undefined) model.pricing.input = pricing.input;
      if (pricing.output !== undefined) model.pricing.output = pricing.output;
    }

    await model.save();

    res.status(200).json({
      status: 'success',
      message: 'Model updated successfully',
      data: {
        model
      }
    });
  } catch (error) {
    next(error);
  }
};

// Routes
router.get('/stats', getAdminStats);
router.get('/users', validatePagination, getAllUsers);
router.get('/users/:userId', getUserDetails);
router.patch('/users/:userId', validateUserUpdate, updateUser);
router.delete('/users/:userId', deleteUser);
router.get('/system', getSystemMetrics);
router.patch('/models/:modelId', updateModel);

module.exports = router;