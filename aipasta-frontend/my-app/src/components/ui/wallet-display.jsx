import React, { useState, useEffect } from 'react';
import { IconWallet, IconTrendingUp, IconTrendingDown, IconRefresh, IconPlus, IconClock, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { formatTokens, getWalletState, topUpWallet } from '../../lib/wallet';

const WalletDisplay = ({ walletState, onWalletUpdate, onUpgradeClick }) => {
  const [showTransactions, setShowTransactions] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [isClient, setIsClient] = useState(false);
  // localWalletState will hold the effective wallet state when no prop is provided
  const [localWalletState, setLocalWalletState] = useState(walletState ?? null);

  // Prevent hydration mismatch by only rendering after client-side hydration
  useEffect(() => {
    setIsClient(true);
    // Initialize local wallet state on client after hydration if parent didn't provide one
    if (!walletState) {
      try {
        const ws = getWalletState();
        setLocalWalletState(ws);
      } catch (e) {
        setLocalWalletState({ balance: 0, totalSpent: 0, totalRequests: 0, transactions: [] });
      }
    }
  }, []);

  // Sync with incoming walletState prop when it changes
  useEffect(() => {
    if (walletState) setLocalWalletState(walletState);
  }, [walletState]);

  const handleTopUp = (amount) => {
    topUpWallet(amount, `Wallet top-up - $${amount}`);
    const newState = getWalletState();
    setLocalWalletState(newState);
    try { if (typeof onWalletUpdate === 'function') onWalletUpdate(newState); } catch (e) {}
    setShowTopUp(false);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your wallet? This will clear all transaction history.')) {
      resetWallet();
      const newState = getWalletState();
      setLocalWalletState(newState);
      try { if (typeof onWalletUpdate === 'function') onWalletUpdate(newState); } catch (e) {}
    }
  };

  const getBalanceColor = (balance) => {
    const b = typeof balance === 'number' ? balance : parseInt(balance, 10) || 0;
    if (b < 100) return 'text-red-600 dark:text-red-400';
    if (b < 1000) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'deduct':
        return <IconArrowDown className="w-3 h-3 text-red-500" />;
      case 'topup':
        return <IconArrowUp className="w-3 h-3 text-green-500" />;
      case 'refund':
        return <IconRefresh className="w-3 h-3 text-blue-500" />;
      default:
        return <IconWallet className="w-3 h-3 text-neutral-500" />;
    }
  };

  // Show loading state until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IconWallet className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-neutral-900 dark:text-neutral-100">Wallet</span>
          </div>
          <button
            disabled
            className="p-1 text-neutral-300 dark:text-neutral-600"
            title="Loading..."
          >
            <IconPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Loading Balance */}
        <div className="text-center py-2">
          <div className="text-2xl font-bold text-neutral-400 dark:text-neutral-500">
            $---.--
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Available Balance
          </div>
        </div>

        {/* Loading Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-700 rounded">
            <div className="font-medium text-neutral-400 dark:text-neutral-500">
              $---.--
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Total Spent
            </div>
          </div>
          <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-700 rounded">
            <div className="font-medium text-neutral-400 dark:text-neutral-500">
              ---
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Requests
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Use provided walletState prop if present, otherwise local state
  const ws = walletState || localWalletState || { tokens: 0, totalTokensSpent: 0, totalRequests: 0, transactions: [] };

  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconWallet className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-neutral-900 dark:text-neutral-100">Wallet</span>
        </div>
        <button
          onClick={() => {
            // Open the Upgrade / Plans modal instead of direct top-up
            if (typeof onUpgradeClick === 'function') onUpgradeClick();
            else setShowTopUp(!showTopUp);
          }}
          className="p-1 text-neutral-500 hover:text-purple-600 transition-colors"
          title="Upgrade / Plans"
        >
          <IconPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Balance */}
      <div className="text-center py-2">
      <div className={`text-2xl font-bold ${getBalanceColor(ws.tokens)}`}>
        {formatTokens(ws.tokens)}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          Available Tokens
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-700 rounded">
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                {formatTokens(ws.totalTokensSpent)}
              </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Total Spent
          </div>
        </div>
        <div className="text-center p-2 bg-neutral-50 dark:bg-neutral-700 rounded">
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
            {ws.totalRequests}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Requests
          </div>
        </div>
      </div>

      {/* Top Up Section */}
      {/* Replace direct top-up controls with an Upgrade Plans CTA */}
      {showTopUp && (
        <div className="border-t border-neutral-200 dark:border-neutral-600 pt-3 space-y-2">
          <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Upgrade to a plan to get more tokens
          </div>
          <div>
            <button
              onClick={() => { if (typeof onUpgradeClick === 'function') onUpgradeClick(); }}
              className="w-full px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded"
            >
              View Plans
            </button>
          </div>
        </div>
      )}

      {/* Transactions Toggle */}
      <div className="border-t border-neutral-200 dark:border-neutral-600 pt-3">
        <button
          onClick={() => setShowTransactions(!showTransactions)}
          className="w-full flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <span>Recent Transactions</span>
          <IconClock className={`w-4 h-4 transition-transform ${showTransactions ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Transactions List */}
      {showTransactions && (
        <div className="max-h-40 overflow-y-auto space-y-2">
          { (ws.transactions || []).slice(0, 5).map(transaction => (
            <div key={transaction.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getTransactionIcon(transaction.type)}
                <div className="truncate">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100">
                    {transaction.description}
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-400">
                    {new Date(transaction.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className={`font-medium ${
                  transaction.type === 'deduct' 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {transaction.type === 'deduct' ? '-' : '+'}
                  {formatTokens(transaction.amount)}
                </div>
            </div>
          ))}
          
          {(ws.transactions || []).length === 0 && (
            <div className="text-center text-neutral-500 dark:text-neutral-400 text-xs py-2">
              No transactions yet
            </div>
          )}
        </div>
      )}

      {/* Upgrade CTA */}
      <div className="border-t border-neutral-200 dark:border-neutral-600 pt-2">
        <button
          onClick={() => { if (typeof onUpgradeClick === 'function') onUpgradeClick(); else setShowTopUp(true); }}
          className="w-full text-sm text-purple-700 dark:text-purple-300 hover:underline transition-colors"
        >
          Upgrade Plans
        </button>
      </div>
    </div>
  );
};

export default WalletDisplay;