// Tokenized Wallet Management System
// Client-side demo wallet using integer model-tokens instead of currency

const WALLET_STORAGE_KEY = 'ai_pasta_wallet';
// Default token allocation for new users
const INITIAL_TOKENS = 10000; // 10k tokens free on new accounts

// Token value assumption (used to convert currency model pricing -> tokens)
// Assumption: 1 token == $0.001 USD => $1 == 1000 tokens
// This is an inferred reasonable default; adjust if you have a different token value.
const TOKEN_VALUE_USD = 0.001;

// Wallet data structure (token-centric)
const defaultWalletState = {
  tokens: INITIAL_TOKENS,
  totalTokensSpent: 0,
  totalRequests: 0,
  transactions: [],
  lastUpdated: new Date().toISOString()
};

// Transaction types
export const TRANSACTION_TYPES = {
  DEDUCT: 'deduct',
  REFUND: 'refund',
  TOPUP: 'topup'
};

// Get wallet state from localStorage
export const getWalletState = () => {
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!stored) {
      const initialState = { ...defaultWalletState };
      localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(initialState));
      return initialState;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading wallet state:', error);
    return { ...defaultWalletState };
  }
};

// Save wallet state to localStorage
export const saveWalletState = (walletState) => {
  try {
    walletState.lastUpdated = new Date().toISOString();
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(walletState));
  } catch (error) {
    console.error('Error saving wallet state:', error);
  }
};

// Add a transaction to the wallet (token amounts)
export const addTransaction = (type, tokenAmount, description, metadata = {}) => {
  const walletState = getWalletState();

  const amount = parseInt(tokenAmount, 10) || 0;
  const transaction = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    type,
    amount, // amount (integer tokens)
    description,
    metadata,
    timestamp: new Date().toISOString()
  };

  // Update tokens based on transaction type
  switch (type) {
    case TRANSACTION_TYPES.DEDUCT:
      walletState.tokens = Math.max(0, walletState.tokens - amount);
      walletState.totalTokensSpent = (walletState.totalTokensSpent || 0) + amount;
      if (metadata.isRequest) {
        walletState.totalRequests = (walletState.totalRequests || 0) + 1;
      }
      break;
    case TRANSACTION_TYPES.REFUND:
    case TRANSACTION_TYPES.TOPUP:
      walletState.tokens = (walletState.tokens || 0) + amount;
      break;
  }

  walletState.transactions.unshift(transaction);
  if (walletState.transactions.length > 100) {
    walletState.transactions = walletState.transactions.slice(0, 100);
  }

  saveWalletState(walletState);
  return transaction;
};

// Check if sufficient token balance exists
export const hasSufficientBalance = (tokenAmount) => {
  const walletState = getWalletState();
  const amount = typeof tokenAmount === 'number' ? tokenAmount : (parseInt(tokenAmount, 10) || 0);
  return (walletState.tokens || 0) >= amount;
};

// Token/Cost utilities
export const calculateTokenCount = (text) => {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
};

// Convert USD amount to tokens using TOKEN_VALUE_USD
export const currencyToTokens = (usdAmount) => {
  if (!usdAmount || isNaN(usdAmount)) return 0;
  return Math.ceil((usdAmount) / TOKEN_VALUE_USD);
};

export const tokensToCurrency = (tokens) => {
  return (tokens * TOKEN_VALUE_USD);
};

// Calculate text cost (returns both currency and token estimates)
export const calculateTextCost = (model, inputText, estimatedOutputTokens = 100) => {
  const inputTokens = calculateTokenCount(inputText);
  const inputCostUsd = (inputTokens * (model.pricing.input || 0)) / 1000;
  const outputCostUsd = (estimatedOutputTokens * (model.pricing.output || 0)) / 1000;
  const totalCostUsd = inputCostUsd + outputCostUsd;
  const totalCostTokens = currencyToTokens(totalCostUsd);

  return {
    inputTokens,
    outputTokens: estimatedOutputTokens,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd,
    totalCostTokens
  };
};

// Calculate actual cost after response completion with real token counts
export const calculateActualTextCost = (model, inputTokens, outputTokens) => {
  const inputCostUsd = (inputTokens * (model.pricing.input || 0)) / 1000;
  const outputCostUsd = (outputTokens * (model.pricing.output || 0)) / 1000;
  const totalCostUsd = inputCostUsd + outputCostUsd;
  const totalCostTokens = currencyToTokens(totalCostUsd);

  return {
    inputTokens,
    outputTokens,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd,
    totalCostTokens
  };
};

export const calculateImageCost = (model, imageCount = 1) => {
  if (!model.capabilities.image || !model.pricing.image) {
    return { imageCostUsd: 0, imageCount: 0, imageCostTokens: 0 };
  }

  const imageCostUsd = imageCount * (model.pricing.image || 0);
  return { imageCostUsd, imageCount, imageCostTokens: currencyToTokens(imageCostUsd) };
};

export const calculateAudioCost = (model, audioDurationMinutes = 1) => {
  if (!model.capabilities.audio || !model.pricing.audio) {
    return { audioCostUsd: 0, audioDuration: 0, audioCostTokens: 0 };
  }

  const audioCostUsd = audioDurationMinutes * (model.pricing.audio || 0);
  return { audioCostUsd, audioDuration: audioDurationMinutes, audioCostTokens: currencyToTokens(audioCostUsd) };
};

// calculateTotalRequestCost: supports two signatures for backward-compatibility
// 1) (model, inputText, files)
// 2) (inputText, selectedModelsArray) -> sums costs across selected models
export const calculateTotalRequestCost = (a, b, c = []) => {
  // Signature (inputText, selectedModelsArray)
  if (typeof a === 'string' && Array.isArray(b)) {
    const inputText = a;
    const models = b;
    let totalUsd = 0;
    let totalTokens = 0;
    models.forEach(model => {
      const cost = calculateTextCost(model, inputText, 150);
      totalUsd += cost.totalCostUsd || 0;
      totalTokens += cost.totalCostTokens || 0;
    });
    return { totalCostUsd: totalUsd, totalCostTokens: totalTokens };
  }

  // Signature (model, inputText, files)
  const model = a;
  const inputText = b || '';
  const files = Array.isArray(c) ? c : [];

  const textCost = calculateTextCost(model, inputText);
  let imageCostUsd = 0;
  let imageCount = 0;
  let audioCostUsd = 0;
  let audioDuration = 0;

  files.forEach(file => {
    if (file.type && file.type.startsWith('image/')) {
      const imgCost = calculateImageCost(model, 1);
      imageCostUsd += imgCost.imageCostUsd;
      imageCount += 1;
    } else if (file.type && file.type.startsWith('audio/')) {
      const estimatedMinutes = Math.max(1, Math.ceil(file.size / (1024 * 1024 * 2)));
      const audCost = calculateAudioCost(model, estimatedMinutes);
      audioCostUsd += audCost.audioCostUsd;
      audioDuration += estimatedMinutes;
    }
  });

  const totalUsd = (textCost.totalCostUsd || 0) + imageCostUsd + audioCostUsd;
  const totalTokens = currencyToTokens(totalUsd);

  return {
    ...textCost,
    imageCostUsd,
    imageCount,
    audioCostUsd,
    audioDuration,
    totalCostUsd: totalUsd,
    totalCostTokens: totalTokens
  };
};

// Wallet actions (token amounts)
export const deductCost = (tokenAmount, description = 'Request deduction', metadata = {}) => {
  return addTransaction(TRANSACTION_TYPES.DEDUCT, tokenAmount, description, { ...metadata, isRequest: true });
};

export const refundCost = (tokenAmount, description = 'Refund', metadata = {}) => {
  return addTransaction(TRANSACTION_TYPES.REFUND, tokenAmount, description, metadata);
};

export const topUpWallet = (tokenAmount, description = 'Wallet top-up') => {
  return addTransaction(TRANSACTION_TYPES.TOPUP, tokenAmount, description);
};

// Reset wallet (for testing/demo purposes)
export const resetWallet = () => {
  localStorage.removeItem(WALLET_STORAGE_KEY);
  return getWalletState(); // This will create a fresh wallet
};

// Formatting helpers
export const formatTokens = (tokens) => {
  const t = parseInt(tokens, 10) || 0;
  return `${t.toLocaleString()} TOK`;
};

// Keep legacy export for formatCurrency (currency helpers) in case UI still uses them
export const formatCurrency = (amountUsd) => {
  if (!amountUsd || isNaN(amountUsd)) return '$0.00';
  return `$${Number(amountUsd).toFixed(4)}`;
};