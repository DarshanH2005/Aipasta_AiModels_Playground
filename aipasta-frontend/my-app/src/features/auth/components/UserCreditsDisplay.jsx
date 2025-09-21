import React from 'react';
import { IconCoins, IconUser, IconLogout } from '@tabler/icons-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../shared';

const UserCreditsDisplay = ({ onAuthClick }) => {
  const { user, credits, logout, isAuthenticated } = useAuth();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
  };

  if (!isAuthenticated) {
    return (
      <button
        onClick={onAuthClick}
        className="flex items-center space-x-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
      >
        <IconUser size={16} />
        <span>Login</span>
      </button>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Credits Display */}
      <div className="flex items-center space-x-2 bg-neutral-100 dark:bg-neutral-700 px-3 py-2 rounded-lg">
        <IconCoins className={`w-4 h-4 ${credits > 0 ? 'text-yellow-500' : 'text-red-500'}`} />
        <span className={`text-sm font-medium ${credits > 0 ? 'text-neutral-900 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>
          {credits} {credits === 1 ? 'credit' : 'credits'}
        </span>
      </div>

      {/* User Menu */}
      <div className="flex items-center space-x-2">
        <div className="text-sm">
          <div className="font-medium text-neutral-900 dark:text-white">
            {user?.name}
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          title="Logout"
        >
          <IconLogout size={16} />
        </button>
      </div>
    </div>
  );
};

export default UserCreditsDisplay;