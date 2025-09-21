/**
 * SidebarFooter - Footer section with logout and branding
 */
import React from 'react';
import { motion } from 'motion/react';
import { IconLogout, IconBrain, IconLock, IconLockOpen } from '@tabler/icons-react';
import { useSidebar } from './Sidebar';
import { cn } from '../../lib/utils';

export const SidebarFooter = ({ 
  user,
  onLogout,
  onToggleLock,
  isLocked,
  version = "1.0.0",
  className 
}) => {
  const { open, animate, setLocked } = useSidebar();

  const handleToggleLock = () => {
    if (setLocked) {
      setLocked(!isLocked);
    }
    if (onToggleLock) {
      onToggleLock(!isLocked);
    }
  };

  return (
    <div className={cn("border-t border-neutral-200 dark:border-neutral-700 pt-3 mt-auto", className)}>
      {/* Lock Toggle */}
      <div className="mb-3">
        <button
          onClick={handleToggleLock}
          className={cn(
            "w-full flex items-center p-2 rounded-md transition-colors group/lock",
            "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-100"
          )}
          title={isLocked ? 'Unlock sidebar' : 'Lock sidebar open'}
        >
          <div className="flex-shrink-0">
            {isLocked ? (
              <IconLock className="w-4 h-4 text-purple-600" />
            ) : (
              <IconLockOpen className="w-4 h-4" />
            )}
          </div>
          
          <motion.span
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            className="ml-3 text-sm font-medium"
          >
            {isLocked ? 'Unlock Sidebar' : 'Lock Sidebar'}
          </motion.span>
        </button>
      </div>

      {/* Logout */}
      {user && (
        <div className="mb-3">
          <button
            onClick={onLogout}
            className={cn(
              "w-full flex items-center p-2 rounded-md transition-colors group/logout",
              "text-neutral-600 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
            )}
          >
            <div className="flex-shrink-0">
              <IconLogout className="w-4 h-4" />
            </div>
            
            <motion.span
              animate={{
                display: animate ? (open ? "inline-block" : "none") : "inline-block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="ml-3 text-sm font-medium"
            >
              Logout
            </motion.span>
          </button>
        </div>
      )}

      {/* Branding */}
      <motion.div
        animate={{
          display: animate ? (open ? "block" : "none") : "block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="px-2 py-2 border-t border-neutral-200 dark:border-neutral-700"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <IconBrain className="w-4 h-4 text-purple-600 dark:text-purple-400 mr-2" />
            <div>
              <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                AI Pasta
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                v{version}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Collapsed State Branding */}
      <motion.div
        animate={{
          display: animate ? (open ? "none" : "flex") : "none",
          opacity: animate ? (open ? 0 : 1) : 0,
        }}
        className="flex items-center justify-center py-2"
      >
        <IconBrain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
      </motion.div>
    </div>
  );
};