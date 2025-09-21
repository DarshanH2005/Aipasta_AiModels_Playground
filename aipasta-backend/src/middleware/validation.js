const { body, validationResult, param, query } = require('express-validator');
const { AppError } = require('./errorHandler');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return next(new AppError(`Validation failed: ${errorMessages.map(e => e.message).join(', ')}`, 400));
  }
  next();
};

// Auth validation rules
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  handleValidationErrors
];

// Chat validation rules
const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message must be between 1 and 10000 characters'),
  
  body('modelId')
    .notEmpty()
    .withMessage('Model ID is required'),
  
  body('sessionId')
    .optional()
    .custom((value) => {
      // Allow MongoDB ObjectId format OR local session format
      if (!value) return true; // Optional field
      
      // Check if it's a valid MongoDB ObjectId
      if (value.match(/^[0-9a-fA-F]{24}$/)) return true;
      
      // Check if it's a local session format (local_session_* or chat_*)
      if (value.match(/^(local_session_|chat_)[0-9a-zA-Z_]+$/)) return true;
      
      throw new Error('Invalid session ID format');
    })
    .withMessage('Invalid session ID format'),
  
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  
  body('options.temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),
  
  body('options.max_tokens')
    .optional()
    .isInt({ min: 1, max: 4000 })
    .withMessage('Max tokens must be between 1 and 4000'),
  
  body('options.top_p')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Top P must be between 0 and 1'),
  
  handleValidationErrors
];

// Chat thread validation rules
const validateChatThread = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('modelId')
    .optional()
    .notEmpty()
    .withMessage('Model ID cannot be empty if provided'),
  
  handleValidationErrors
];

// User profile validation
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  
  body('preferences.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be 2-5 characters'),
  
  handleValidationErrors
];

// Model validation rules
const validateModelId = [
  param('modelId')
    .notEmpty()
    .withMessage('Model ID is required'),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// Models pagination validation (allows higher limits for OpenRouter models)
const validateModelsPagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  
  handleValidationErrors
];

// Admin validation rules
const validateUserUpdate = [
  body('role')
    .optional()
    .isIn(['user', 'premium', 'admin'])
    .withMessage('Role must be user, premium, or admin'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  body('usageLimits')
    .optional()
    .isObject()
    .withMessage('Usage limits must be an object'),
  
  body('usageLimits.dailyRequests')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Daily requests limit must be a non-negative integer'),
  
  body('usageLimits.monthlyRequests')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Monthly requests limit must be a non-negative integer'),
  
  handleValidationErrors
];

// API Key validation
const validateApiKeyGeneration = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('API key name must be between 1 and 100 characters'),
  
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Permissions must be an array'),
  
  body('expiresIn')
    .optional()
    .isIn(['30d', '90d', '1y', 'never'])
    .withMessage('Expires in must be 30d, 90d, 1y, or never'),
  
  handleValidationErrors
];

// File upload validation
const validateFileUpload = [
  body('type')
    .optional()
    .isIn(['image', 'document', 'audio'])
    .withMessage('File type must be image, document, or audio'),
  
  handleValidationErrors
];

// Custom validation middleware
const validateMongoId = (field) => [
  param(field)
    .isMongoId()
    .withMessage(`Invalid ${field} format`),
  handleValidationErrors
];

const validateOptionalMongoId = (field) => [
  param(field)
    .optional()
    .isMongoId()
    .withMessage(`Invalid ${field} format`),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validatePasswordChange,
  validateChatMessage,
  validateChatThread,
  validateProfileUpdate,
  validateModelId,
  validatePagination,
  validateModelsPagination,
  validateUserUpdate,
  validateApiKeyGeneration,
  validateFileUpload,
  validateMongoId,
  validateOptionalMongoId
};