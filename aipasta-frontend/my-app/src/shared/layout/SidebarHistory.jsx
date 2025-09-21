/**
 * SidebarHistory - Chat history management component
 */
import React from 'react';
import { motion } from 'motion/react';
import { IconMessage, IconTrash, IconPin, IconPinned } from '@tabler/icons-react';
import { useSidebar } from './Sidebar';
import { cn } from '../../lib/utils';

export const SidebarHistory = ({ 
  chatSessions = [], 
  currentSessionId, 
  onSessionSelect, 
  onSessionDelete,
  onSessionPin,
  pinnedSessions = [],
  className 
}) => {
  const { open, animate } = useSidebar();

  const handleSessionClick = (sessionId) => {
    if (onSessionSelect) {
      onSessionSelect(sessionId);
    }
  };

  const handleDeleteClick = (e, sessionId) => {
    e.stopPropagation();
    if (onSessionDelete) {
      onSessionDelete(sessionId);
    }
  };

  const handlePinClick = (e, sessionId) => {
    e.stopPropagation();
    if (onSessionPin) {
      onSessionPin(sessionId);
    }
  };

  const isPinned = (sessionId) => pinnedSessions.includes(sessionId);
  const pinnedChats = chatSessions.filter(session => isPinned(session.id));
  const regularChats = chatSessions.filter(session => !isPinned(session.id));

  const renderSessionItem = (session) => (
    <div
      key={session.id}
      onClick={() => handleSessionClick(session.id)}
      className={cn(
        "flex items-center p-2 rounded-md cursor-pointer transition-colors group/session",
        currentSessionId === session.id
          ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
          : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-100"
      )}
    >
      <div className="flex-shrink-0">
        <IconMessage className="w-4 h-4" />
      </div>
      
      <motion.div
        animate={{
          display: animate ? (open ? "flex" : "none") : "flex",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="ml-3 flex-1 flex items-center justify-between min-w-0"
      >
        <span className="text-sm font-medium truncate">
          {session.title || 'New Chat'}
        </span>
        
        <div className="flex items-center gap-1 opacity-0 group-hover/session:opacity-100 transition-opacity">
          <button
            onClick={(e) => handlePinClick(e, session.id)}
            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
          >
            {isPinned(session.id) ? (
              <IconPinned className="w-3 h-3 text-purple-500" />
            ) : (
              <IconPin className="w-3 h-3" />
            )}
          </button>
          
          <button
            onClick={(e) => handleDeleteClick(e, session.id)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
          >
            <IconTrash className="w-3 h-3 text-red-500" />
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className={cn("flex-1 overflow-hidden", className)}>
      <motion.div
        animate={{
          display: animate ? (open ? "block" : "none") : "block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className="mb-3"
      >
        <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-2">
          Chat History
        </h3>
      </motion.div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {/* Pinned Sessions */}
        {pinnedChats.length > 0 && (
          <>
            <motion.div
              animate={{
                display: animate ? (open ? "block" : "none") : "block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="px-2 py-1"
            >
              <div className="text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                <IconPinned className="w-3 h-3" />
                Pinned
              </div>
            </motion.div>
            {pinnedChats.map(renderSessionItem)}
            
            {regularChats.length > 0 && (
              <div className="border-t border-neutral-200 dark:border-neutral-700 my-2" />
            )}
          </>
        )}

        {/* Recent Sessions */}
        {regularChats.length > 0 && (
          <>
            <motion.div
              animate={{
                display: animate ? (open ? "block" : "none") : "block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              className="px-2 py-1"
            >
              <div className="text-xs text-neutral-400 dark:text-neutral-500">
                Recent
              </div>
            </motion.div>
            {regularChats.map(renderSessionItem)}
          </>
        )}

        {/* Empty State */}
        {chatSessions.length === 0 && (
          <motion.div
            animate={{
              display: animate ? (open ? "flex" : "none") : "flex",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <IconMessage className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No chat history yet
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Start a conversation to see it here
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};