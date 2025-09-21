const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { 
  validateRegister, 
  validateLogin, 
  validatePasswordChange 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

const { OAuth2Client } = require('google-auth-library');

const router = express.Router();

// Initialize Google OAuth2 client when GOOGLE_CLIENT_ID is available
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Send token response
const createSendToken = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  
  const cookieOptions = {
    expires: new Date(Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    message,
    token,
    data: {
      user
    }
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Create user with 10k free tokens/credits
    const newUser = await User.create({
      name,
      email,
      password, // Will be hashed by the pre-save middleware
      credits: 10000,
      tokens: {
        balance: 10000,
        freeTokens: 10000,
        paidTokens: 0,
        totalUsed: 0
      }
    });

    // Update stats (with safe initialization)
    try {
      if (!newUser.stats) {
        newUser.stats = {
          messagesGenerated: 0,
          tokensUsed: 0,
          totalCost: { usd: 0, inr: 0 },
          loginCount: 0
        };
      }
      newUser.stats.lastActive = new Date();
      await newUser.save({ validateBeforeSave: false });
    } catch (statsError) {
      console.error('Error updating new user stats:', statsError.message);
      // Continue without failing registration
    }

    createSendToken(newUser, 201, res, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 401));
    }

    // Update last active (with safe initialization)
    try {
      if (!user.stats) {
        user.stats = {
          messagesGenerated: 0,
          tokensUsed: 0,
          totalCost: { usd: 0, inr: 0 },
          loginCount: 0
        };
      }
      user.stats.lastActive = new Date();
      user.stats.loginCount += 1;
      await user.save({ validateBeforeSave: false });
    } catch (statsError) {
      console.error('Error updating login stats:', statsError.message);
      // Continue without failing login
    }

    createSendToken(user, 200, res, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({ 
    status: 'success',
    message: 'Logged out successfully' 
  });
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
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

// @desc    Update password
// @route   PATCH /api/auth/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    // Get user from collection
    const user = await User.findById(req.user.id).select('+password');

    // Check if current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return next(new AppError('Your current password is incorrect.', 401));
    }

    // Update password
    user.password = req.body.newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Log the user in with new password (send JWT)
    createSendToken(user, 200, res, 'Password updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    // Get user based on posted email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('There is no user with that email address.', 404));
    }

    // Generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      // In a real app, you would send an email here
      // For now, we'll just return the token (DO NOT DO THIS IN PRODUCTION)
      if (process.env.NODE_ENV === 'development') {
        res.status(200).json({
          status: 'success',
          message: 'Password reset token generated',
          resetToken: resetToken // Only for development
        });
      } else {
        res.status(200).json({
          status: 'success',
          message: 'Password reset instructions sent to email'
        });
      }
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new AppError('There was an error sending the email. Try again later.', 500));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res, next) => {
  try {
    const { idToken, id_token, token } = req.body;
    const tokenToVerify = idToken || id_token || token;

    if (!tokenToVerify) {
      return next(new AppError('Missing id token', 400));
    }

    if (!googleClient) {
      return next(new AppError('Google OAuth not configured on server', 500));
    }

    // Verify token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenToVerify,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return next(new AppError('Invalid Google token payload', 400));
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || 'Google User';
    const avatar = payload.picture || null;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // If found, allow login regardless of provider (per requirements)
      // Optionally update authProvider to 'google' if not set
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        // don't modify password
        try { await user.save({ validateBeforeSave: false }); } catch (e) { /* ignore */ }
      }

      // Update last active and login count safely
      try {
        if (!user.stats) user.stats = {};
        user.stats.lastActive = new Date();
        user.stats.loginCount = (user.stats.loginCount || 0) + 1;
        await user.save({ validateBeforeSave: false });
      } catch (err) {
        console.warn('Failed to update user stats after Google login:', err.message);
      }

      return createSendToken(user, 200, res, 'Login successful (Google)');
    }

    // If user doesn't exist, create a new user with 10k free tokens/credits
    const newUser = new User({
      name,
      email,
      avatar,
      authProvider: 'google',
      credits: 10000,
      tokens: {
        balance: 10000,
        freeTokens: 10000,
        paidTokens: 0,
        totalUsed: 0
      }
    });

    await newUser.save();

    // Update stats safely
    try {
      newUser.stats = newUser.stats || {};
      newUser.stats.lastActive = new Date();
      newUser.stats.loginCount = 1;
      await newUser.save({ validateBeforeSave: false });
    } catch (err) {
      // ignore
    }

    return createSendToken(newUser, 201, res, 'User created and logged in (Google)');
  } catch (error) {
    console.error('Google login error:', error);
    return next(new AppError('Failed to authenticate with Google', 400));
  }
};

// @desc    Reset password
// @route   PATCH /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    // Get user based on token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // If token has not expired and there is a user, set new password
    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    // Log the user in
    createSendToken(user, 200, res, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Verify token
// @route   GET /api/auth/verify
// @access  Private
const verifyToken = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Token is valid',
    data: {
      user: req.user
    }
  });
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = async (req, res, next) => {
  try {
    // Update last active
    req.user.stats.lastActive = new Date();
    await req.user.save({ validateBeforeSave: false });

    createSendToken(req.user, 200, res, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};



// @desc    Deduct credits from user
// @route   POST /api/auth/deduct-credits  
// @access  Private
const deductCredits = async (req, res, next) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return next(new AppError('Invalid credit amount', 400));
    }

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    if (user.credits < amount) {
      return next(new AppError('Insufficient credits', 403));
    }

    user.credits -= amount;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Credits deducted successfully',
      data: {
        creditsRemaining: user.credits,
        creditsDeducted: amount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user credits
// @route   GET /api/auth/credits
// @access  Private
const getCredits = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        credits: user.credits
      }
    });
  } catch (error) {
    next(error);
  }
};
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/google', googleLogin);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);
router.get('/credits', authenticateToken, getCredits);
router.post('/deduct-credits', authenticateToken, deductCredits);
router.patch('/password', authenticateToken, validatePasswordChange, updatePassword);
router.post('/forgot-password', forgotPassword);
router.patch('/reset-password/:token', resetPassword);
router.get('/verify', authenticateToken, verifyToken);
router.post('/refresh', authenticateToken, refreshToken);

module.exports = router;