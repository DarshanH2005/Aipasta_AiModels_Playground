import React, { useState, useRef, useEffect } from 'react';
import { IconUser, IconRobot, IconCopy, IconCheck, IconExternalLink, IconLoader } from '@tabler/icons-react';
import MarkdownRenderer from './markdown-renderer';
import ColumnResponseLayout from './column-response-layout';
import { formatCurrency } from '../../lib/wallet';

const ConversationLayout = ({ conversationTurns, isLoading, onRetry }) => {
  const [copiedStates, setCopiedStates] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    });
  };

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [conversationTurns]);

  useEffect(() => {
    // Scroll when loading state changes
    if (isLoading) {
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleCopy = async (content, messageId) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates({ ...copiedStates, [messageId]: true });
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [messageId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const renderUserMessage = (userMessage) => {
    return (
      <div key={userMessage.id} className="flex items-start space-x-3 mb-6">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <IconUser size={16} className="text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3 mb-2">
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer content={userMessage.content} />
            </div>
            
            {/* Attachments */}
            {userMessage.attachments && userMessage.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
                  Attachments:
                </div>
                <div className="flex flex-wrap gap-2">
                  {userMessage.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-1 bg-blue-100 dark:bg-blue-800/30 px-2 py-1 rounded text-xs"
                    >
                      <span>📎 {attachment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{new Date(userMessage.timestamp).toLocaleTimeString()}</span>
            <button
              onClick={() => handleCopy(userMessage.content, userMessage.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Copy message"
            >
              {copiedStates[userMessage.id] ? (
                <IconCheck size={12} className="text-green-500" />
              ) : (
                <IconCopy size={12} />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderModelResponses = (modelResponses, turnId) => {
    if (!modelResponses || modelResponses.length === 0) {
      return (
        <div className="flex items-start space-x-3 mb-6">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
              <IconLoader size={16} className="text-white animate-spin" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2 text-gray-500">
                <IconLoader size={16} className="animate-spin" />
                <span>AI models are thinking...</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // If multiple models, use column layout
    if (modelResponses.length > 1) {
      return (
        <div className="mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <IconRobot size={16} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                AI Responses ({modelResponses.length} models)
              </div>
              <ColumnResponseLayout 
                responses={modelResponses}
                timestamp={turnId}
                attachments={[]}
              />
            </div>
          </div>
        </div>
      );
    }

    // Single model response
    const response = modelResponses[0];
    return (
      <div key={response.id} className="flex items-start space-x-3 mb-6">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <IconRobot size={16} className="text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg px-4 py-3 mb-2">
            {/* Model header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {response.model?.name || response.model?.id || 'AI Assistant'}
                </span>
                {response.model?.provider && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    via {response.model.provider}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {response.cost && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                    ${formatCurrency(response.cost)}
                  </span>
                )}
                
                {response.isStreaming && (
                  <IconLoader size={14} className="text-blue-500 animate-spin" />
                )}
              </div>
            </div>
            
            {/* Response content */}
            {response.error ? (
              <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">
                <p className="font-medium">Error:</p>
                <p>{response.error}</p>
                {onRetry && (
                  <button
                    onClick={() => onRetry(response.model)}
                    className="mt-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm underline"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : response.content ? (
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownRenderer content={response.content} />
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <IconLoader size={16} className="animate-spin" />
                <span>Generating response...</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>{new Date(response.timestamp).toLocaleTimeString()}</span>
            {response.content && (
              <button
                onClick={() => handleCopy(response.content, response.id)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Copy response"
              >
                {copiedStates[response.id] ? (
                  <IconCheck size={12} className="text-green-500" />
                ) : (
                  <IconCopy size={12} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!conversationTurns || conversationTurns.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <IconRobot size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium mb-2">Start a conversation</p>
          <p className="text-sm">Send a message to begin chatting with AI models</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversationTurns.map((turn) => (
        <div key={turn.id} className="space-y-2">
          {/* User message */}
          {renderUserMessage(turn.userMessage)}
          
          {/* Model responses */}
          {renderModelResponses(turn.modelResponses, turn.id)}
        </div>
      ))}
      
      {/* Loading indicator for new messages */}
      {isLoading && (
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <IconLoader size={16} className="text-white animate-spin" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-lg px-4 py-3 border-l-4 border-blue-500">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-gray-600 dark:text-gray-400">AI models are thinking...</span>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                This may take a few moments depending on the selected models
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ConversationLayout;