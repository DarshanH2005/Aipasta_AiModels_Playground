/**
 * Token Management Utility
 * Handles token calculations, deductions, and validations
 */

/**
 * Get coarse token cost per model
 * @param {Object} model - The model object
 * @returns {number} - Token cost
 */
export const getModelTokenCost = (model) => {
  if (!model) return 10; // unknown model -> conservative cost
  const pricing = model.pricing || {};
  const hasPricing =
    typeof pricing.input !== "undefined" ||
    typeof pricing.output !== "undefined" ||
    typeof pricing.image !== "undefined";
    
  if (hasPricing) {
    const input = typeof pricing.input === "number" ? pricing.input : 0;
    const output = typeof pricing.output === "number" ? pricing.output : 0;
    if (input === 0 && output === 0) return 1;
    return 10;
  }
  
  if (model.isPaid === true || model.paid === true) return 10;
  if (model.free === true) return 1;
  return 10;
};

/**
 * Calculate tokens needed for a set of models
 * @param {Array} models - Array of selected models
 * @returns {number} - Total tokens needed
 */
export const calculateTokensNeeded = (models) => {
  if (!Array.isArray(models)) return 0;
  return models.reduce((total, model) => total + getModelTokenCost(model), 0);
};

/**
 * Check if user has sufficient tokens for the request
 * @param {number} userCredits - User's current token balance
 * @param {Array} models - Array of selected models
 * @returns {boolean} - Whether user has enough tokens
 */
export const hasSufficientTokens = (userCredits, models) => {
  const tokensNeeded = calculateTokensNeeded(models);
  return userCredits >= tokensNeeded;
};

/**
 * Get token requirement details for UI display
 * @param {number} userCredits - User's current token balance
 * @param {Array} models - Array of selected models
 * @returns {Object} - Token requirement details
 */
export const getTokenRequirements = (userCredits, models) => {
  const tokensNeeded = calculateTokensNeeded(models);
  const hasEnough = userCredits >= tokensNeeded;
  
  return {
    needed: tokensNeeded,
    available: userCredits,
    sufficient: hasEnough,
    deficit: hasEnough ? 0 : tokensNeeded - userCredits
  };
};

/**
 * Calculate cost estimation for models
 * @param {Array} models - Array of selected models
 * @param {number} estimatedTokens - Estimated tokens for the request
 * @returns {Object} - Cost breakdown
 */
export const calculateCostEstimation = (models, estimatedTokens = 1000) => {
  let totalCost = 0;
  const breakdown = [];
  
  models.forEach(model => {
    if (model.pricing) {
      const inputCost = (model.pricing.input || 0) * (estimatedTokens / 1000);
      const outputCost = (model.pricing.output || 0) * (estimatedTokens / 1000);
      const modelTotal = inputCost + outputCost;
      
      totalCost += modelTotal;
      breakdown.push({
        model: model.name,
        inputCost,
        outputCost,
        total: modelTotal
      });
    }
  });
  
  return {
    totalCost,
    breakdown,
    tokensUsed: estimatedTokens
  };
};

/**
 * Format token count for display
 * @param {number} tokens - Token count
 * @returns {string} - Formatted token display
 */
export const formatTokenDisplay = (tokens) => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};

/**
 * Validate model selection for token requirements
 * @param {Array} models - Array of selected models
 * @param {number} userCredits - User's current token balance
 * @returns {Object} - Validation result
 */
export const validateModelSelection = (models, userCredits) => {
  if (!models || models.length === 0) {
    return {
      valid: false,
      error: 'No models selected'
    };
  }
  
  if (userCredits <= 0) {
    return {
      valid: false,
      error: 'No tokens remaining'
    };
  }
  
  const requirements = getTokenRequirements(userCredits, models);
  
  if (!requirements.sufficient) {
    return {
      valid: false,
      error: `Insufficient tokens: need ${requirements.needed}, have ${requirements.available}`
    };
  }
  
  return {
    valid: true,
    requirements
  };
};