/**
 * SidebarSettings - Settings and configuration component
 */
import React from 'react';
import { motion } from 'motion/react';
import { IconSettings, IconPalette, IconMoon, IconSun, IconUser, IconCreditCard } from '@tabler/icons-react';
import { useSidebar } from './Sidebar';
import { cn } from '../../lib/utils';

export const SidebarSettings = ({ 
  user,
  credits,
  darkMode,
  onToggleDarkMode,
  onOpenSettings,
  onOpenPlans,
  onOpenUserProfile,
  className 
}) => {
  const { open, animate } = useSidebar();

  const settingsItems = [
    {
      icon: <IconSettings className="w-4 h-4" />,
      label: 'Settings',
      onClick: onOpenSettings,
      description: 'Configure your preferences'
    },
    {
      icon: darkMode ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />,
      label: darkMode ? 'Light Mode' : 'Dark Mode',
      onClick: onToggleDarkMode,
      description: 'Toggle theme'
    },
    {
      icon: <IconUser className="w-4 h-4" />,
      label: 'Profile',
      onClick: onOpenUserProfile,
      description: 'Manage your account'
    },
    {
      icon: <IconCreditCard className="w-4 h-4" />,
      label: 'Upgrade Plan',
      onClick: onOpenPlans,
      description: 'View pricing options'
    }
  ];

  return (
    <div className={cn("border-t border-neutral-200 dark:border-neutral-700 pt-3", className)}>
      <motion.div
        animate={{
          display: animate ? (open ? "block" : "none") : "block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="mb-3"
      >
        <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-2">
          Settings
        </h3>
      </motion.div>

      {/* User Info */}
      {user && (
        <div className="mb-3 p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
              <IconUser className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            
            <motion.div
              animate={{
                display: animate ? (open ? "block" : "none") : "block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="ml-3 min-w-0 flex-1"
            >
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {credits !== undefined ? `${credits} tokens` : 'Loading...'}
              </p>
            </motion.div>
          </div>
        </div>
      )}

      {/* Settings Items */}
      <div className="space-y-1">
        {settingsItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={cn(
              "w-full flex items-center p-2 rounded-md text-left transition-colors group/setting",
              "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-100"
            )}
          >
            <div className="flex-shrink-0">
              {item.icon}
            </div>
            
            <motion.div
              animate={{
                display: animate ? (open ? "block" : "none") : "block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="ml-3 min-w-0 flex-1"
            >
              <p className="text-sm font-medium">
                {item.label}
              </p>
              {item.description && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {item.description}
                </p>
              )}
            </motion.div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        animate={{
          display: animate ? (open ? "block" : "none") : "block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-700"
      >
        <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-2 px-2">
          Quick Actions
        </div>
        
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <div className="flex flex-col items-center">
              {darkMode ? <IconSun className="w-4 h-4" /> : <IconMoon className="w-4 h-4" />}
              <span className="text-xs mt-1">Theme</span>
            </div>
          </button>
          
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            title="Open Settings"
          >
            <div className="flex flex-col items-center">
              <IconSettings className="w-4 h-4" />
              <span className="text-xs mt-1">Config</span>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
};