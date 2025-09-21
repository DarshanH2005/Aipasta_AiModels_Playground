import React, { useState } from 'react';
import { IconCopy, IconCheck, IconRobot, IconCurrency, IconLoader, IconMaximize, IconMinimize } from '@tabler/icons-react';
import { formatCurrency } from '../../lib/wallet';
import MarkdownRenderer from './markdown-renderer';

const ColumnResponseLayout = ({ responses, timestamp, attachments }) => {
  const [copiedStates, setCopiedStates] = useState({});
  const [expandedCards, setExpandedCards] = useState(new Set([0])); // First card expanded by default

  const handleCopy = async (content, index) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedStates({ ...copiedStates, [index]: true });
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, [index]: false });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleToggleExpand = (index) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const getProviderInfo = (modelString) => {
    const [provider, ...modelParts] = modelString.split('/');
    const modelName = modelParts.join('/');
    return { provider: provider || 'unknown', modelName: modelName || 'Unknown Model' };
  };

  const getProviderColor = (provider) => {
    const colors = {
      'openai': 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300',
      'anthropic': 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      'google': 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'cohere': 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      'meta': 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      'mistral': 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
      'openrouter': 'border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
      'default': 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300'
    };
    
    const providerLower = provider.toLowerCase();
    return colors[providerLower] || colors.default;
  };

  if (!responses || responses.length === 0) return null;

  return (
    <div className="w-full">
      {/* First 3 columns in a grid that takes full width */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {responses.slice(0, 3).map((response, index) => {
          const { provider, modelName } = getProviderInfo(response?.model || '');
          const isStreaming = !response?.isComplete && response?.content;
          const isExpanded = expandedCards.has(index);

          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
            >
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 text-xs font-medium rounded-lg border ${getProviderColor(provider)}`}>
                    <div className="flex items-center space-x-1">
                      <IconRobot 
                        size={14} 
                        className={isStreaming ? 'animate-pulse text-blue-500' : ''} 
                      />
                      <span className="font-semibold">{modelName}</span>
                    </div>
                  </div>
                  {isStreaming && (
                    <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                      <IconLoader className="w-3 h-3 animate-spin" />
                      <span>Streaming</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {response?.cost && (
                    <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                      <IconCurrency size={12} />
                      <span className="font-mono">${formatCurrency(response.cost)}</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => handleToggleExpand(index)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
                  </button>

                  <button
                    onClick={() => handleCopy(response?.content || '', index)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Copy response"
                  >
                    {copiedStates[index] ? (
                      <IconCheck size={16} className="text-green-500" />
                    ) : (
                      <IconCopy size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* Provider and timestamp info */}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>via {provider}</span>
                {timestamp && (
                  <span>{new Date(timestamp).toLocaleTimeString()}</span>
                )}
              </div>
            </div>

            {/* Attachments (only show on first card) */}
            {index === 0 && attachments && attachments.length > 0 && (
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs text-blue-800 dark:text-blue-300 font-medium mb-1">
                  Attachments ({attachments.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {attachments.map((attachment, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded"
                    >
                      📎 {attachment.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <div 
                className={`transition-all duration-200 ${
                  isExpanded ? 'max-h-[600px]' : 'max-h-48'
                } overflow-y-auto`}
              >
                {response?.content ? (
                  <MarkdownRenderer 
                    content={response.content}
                    className="prose-sm max-w-none"
                    enableSyntaxHighlighting={true}
                    enableGfm={true}
                  />
                ) : response?.error ? (
                  <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm">
                    <p className="font-medium">Error:</p>
                    <p>{response.error}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-center space-y-2">
                      <IconLoader className="w-6 h-6 animate-spin mx-auto" />
                      <p className="text-sm">Waiting for response...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Fade overlay when collapsed */}
              {!isExpanded && response?.content && response.content.length > 200 && (
                <div className="relative -mt-8 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
              )}
            </div>

            {/* Footer with expand button for long content */}
            {!isExpanded && response?.content && response.content.length > 200 && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                <button
                  onClick={() => handleToggleExpand(index)}
                  className="w-full text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Click to expand full response...
                </button>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
};

export default ColumnResponseLayout;