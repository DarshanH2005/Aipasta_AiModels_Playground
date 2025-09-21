import React from 'react';
import { IconX, IconUser, IconWallet } from '@tabler/icons-react';
import WalletDisplay from './wallet-display';
import { useAuth } from '../../contexts/AuthContext';

const SettingsModal = ({ isOpen, onClose, onUpgradeClick }) => {
  if (!isOpen) return null;

  // Pull authoritative user snapshot from AuthContext so wallet UI shows server values
  const { user } = useAuth();

  const walletStateFromUser = (() => {
    try {
      if (!user) return undefined;
      const tokensBalance = (user.tokens && (typeof user.tokens === 'number' ? user.tokens : user.tokens.balance)) ?? user.credits ?? 0;
      return {
        tokens: tokensBalance,
        totalTokensSpent: user.tokens?.totalSpent ?? user.totalTokensSpent ?? 0,
        totalRequests: user.tokens?.totalRequests ?? user.totalRequests ?? 0,
        transactions: user.tokens?.transactions ?? user.transactions ?? []
      };
    } catch (e) {
      return undefined;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal panel (glassmorphic) */}
      <div className="relative z-10 w-full max-w-3xl mx-4">
        <div className="p-6 rounded-xl border border-white/20 bg-white/30 dark:bg-gray-800/60 backdrop-filter backdrop-blur-md shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <IconUser className="w-6 h-6 text-purple-600" />
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Settings</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded hover:bg-white/20 dark:hover:bg-gray-700/40">
              <IconX className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/40 dark:bg-gray-700/40 border border-white/10">
                <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100 flex items-center gap-2"><IconWallet className="w-4 h-4 text-purple-600" /> Wallet</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Manage balance, top-ups and transactions.</p>
                <div className="mt-3">
                  {/* Provide server-side wallet snapshot (if available) so the UI reflects authoritative balance */}
                  <WalletDisplay
                    walletState={walletStateFromUser}
                    onWalletUpdate={() => {}}
                    onUpgradeClick={onUpgradeClick}
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/40 dark:bg-gray-700/40 border border-white/10">
                <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Account</h3>
                <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Profile and preferences will appear here.</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/40 dark:bg-gray-700/40 border border-white/10">
                <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Integrations</h3>
                <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Connected AI providers and API keys (server-side management).</div>
              </div>

              <div className="p-4 rounded-lg bg-white/40 dark:bg-gray-700/40 border border-white/10">
                <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-100">Appearance</h3>
                <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Theme, layout and display preferences.</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
