import React, { useState } from 'react';
import { IconCurrency, IconTrendingUp, IconGift, IconCreditCard, IconSettings } from '@tabler/icons-react';

const TokenDisplay = ({ user, onUpgradeClick }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!user) return null;

  const totalTokens = user.tokens?.balance ?? user.credits ?? 0;
  const freeTokens = user.tokens?.freeTokens ?? 0;
  const paidTokens = user.tokens?.paidTokens ?? 0;
  
  // Determine user tier based on tokens
  const getUserTier = () => {
    if (paidTokens === 0) return 'Free';
    if (paidTokens < 1000000) return 'Basic';
    if (paidTokens < 5000000) return 'Pro';
    return 'Enterprise';
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Free': return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
      case 'Basic': return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'Pro': return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
      case 'Enterprise': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    }
  };

  const formatTokens = (tokens) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const getTokenStatus = () => {
    if (totalTokens === 0) return { color: 'text-red-600', status: 'Empty' };
    if (totalTokens < 10) return { color: 'text-orange-600', status: 'Low' };
    if (totalTokens < 100) return { color: 'text-yellow-600', status: 'Medium' };
    return { color: 'text-green-600', status: 'Good' };
  };

  const tokenStatus = getTokenStatus();
  const userTier = getUserTier();
  const tierColor = getTierColor(userTier);

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 mr-3">
            <IconCurrency className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Token Balance
            </h3>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tierColor}`}>
              {userTier} Plan
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded transition-colors"
        >
          <IconSettings className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Main Balance */}
      <div className="mb-3">
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {formatTokens(totalTokens)}
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400 ml-1">tokens</span>
          <span className={`text-xs ml-2 ${tokenStatus.color} font-medium`}>
            {tokenStatus.status}
          </span>
        </div>
      </div>

      {/* Token Breakdown (if details shown) */}
      {showDetails && (totalTokens > 0 || freeTokens > 0 || paidTokens > 0) && (
        <div className="mb-3 space-y-2 text-xs">
          {freeTokens > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <IconGift className="w-3 h-3 text-green-500 mr-1" />
                <span className="text-neutral-600 dark:text-neutral-400">Free tokens</span>
              </div>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatTokens(freeTokens)}
              </span>
            </div>
          )}
          {paidTokens > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <IconCreditCard className="w-3 h-3 text-blue-500 mr-1" />
                <span className="text-neutral-600 dark:text-neutral-400">Purchased tokens</span>
              </div>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatTokens(paidTokens)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {totalTokens <= 10 && (
          <button
            onClick={onUpgradeClick}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            <IconTrendingUp className="w-4 h-4 mr-2" />
            Upgrade Plan
          </button>
        )}
        
        {totalTokens > 10 && (
          <button
            onClick={onUpgradeClick}
            className="w-full py-2 px-3 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            <IconCurrency className="w-4 h-4 mr-2" />
            Buy More Tokens
          </button>
        )}
      </div>

      {/* Usage Tip */}
      {totalTokens > 0 && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/10 rounded border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> Free models use 1 token, premium models use 10 tokens per request.
          </p>
        </div>
      )}

      {/* Empty State */}
      {totalTokens === 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
            No tokens remaining
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Upgrade to continue using AI models
          </p>
        </div>
      )}
    </div>
  );
};

export default TokenDisplay;