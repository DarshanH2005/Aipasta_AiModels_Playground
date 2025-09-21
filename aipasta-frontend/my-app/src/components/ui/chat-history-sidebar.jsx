import React, { useState } from 'react';
import { 
  IconPlus, 
  IconMessage, 
  IconTrash, 
  IconEdit, 
  IconCheck, 
  IconX,
  IconDots,
  IconClock
} from '@tabler/icons-react';

const ChatHistorySidebar = ({ 
  sessions = [], 
  currentSessionId, 
  onSessionSelect, 
  onNewChat, 
  onDeleteSession,
  onRenameSession,
  isLoading = false 
}) => {
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuSessionId, setMenuSessionId] = useState(null);

  const handleStartEdit = (session) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
    setMenuSessionId(null);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim() && onRenameSession) {
      onRenameSession(editingSessionId, editTitle.trim());
    }
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditTitle('');
  };

  const handleDeleteClick = (sessionId) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      onDeleteSession?.(sessionId);
    }
    setMenuSessionId(null);
  };

  const formatLastActivity = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <IconPlus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto scrollbar-custom">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <IconMessage size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`relative group mb-2 rounded-lg transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-blue-100 dark:bg-blue-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div
                  className="flex items-center p-3 cursor-pointer"
                  onClick={() => onSessionSelect?.(session.id)}
                >
                  <div className="flex-shrink-0 mr-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      currentSessionId === session.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                    }`}>
                      <IconMessage size={16} />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingSessionId === session.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                          onKeyDown={(e) => e.key === 'Escape' && handleCancelEdit()}
                          className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-green-600 hover:text-green-800"
                        >
                          <IconCheck size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                          {session.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                          {session.preview}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <IconClock size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {formatLastActivity(session.lastActivity)}
                          </span>
                          <span className="text-xs text-gray-400">
                            • {session.messageCount} messages
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {editingSessionId !== session.id && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuSessionId(menuSessionId === session.id ? null : session.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                      >
                        <IconDots size={16} />
                      </button>

                      {menuSessionId === session.id && (
                        <div className="absolute right-0 top-8 z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(session);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <IconEdit size={14} />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(session.id);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                          >
                            <IconTrash size={14} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Click outside to close menu */}
      {menuSessionId && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setMenuSessionId(null)}
        />
      )}
    </div>
  );
};

export default ChatHistorySidebar;