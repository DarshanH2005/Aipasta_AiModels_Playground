import React, { useState } from 'react';
import { IconCopy, IconCheck, IconRobot, IconCurrency, IconLoader } from '@tabler/icons-react';
import { formatCurrency, formatTokens } from '../../../lib/wallet';
import MarkdownRenderer from '../../../shared/components/MarkdownRenderer';

const TabbedResponseLayout = ({ responses, timestamp, attachments }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [copiedStates, setCopiedStates] = useState({});

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

  const getTabColor = (provider, isActive) => {
    const providerLower = provider.toLowerCase();
    const baseColors = {
      'openai': {
        active: 'bg-green-100 border-green-300 text-green-900 dark:bg-green-900/30 dark:border-green-700 dark:text-green-100',
        inactive: 'text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/20'
      },
      'anthropic': {
        active: 'bg-orange-100 border-orange-300 text-orange-900 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-100',
        inactive: 'text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-900/20'
      },
      'google': {
        active: 'bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-100',
        inactive: 'text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20'
      },
      'openrouter': {
        active: 'bg-indigo-100 border-indigo-300 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-100',
        inactive: 'text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-900/20'
      },
      'default': {
        active: 'bg-gray-100 border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100',
        inactive: 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50'
      }
    };
    
    const colorSet = baseColors[providerLower] || baseColors.default;
    return isActive ? colorSet.active : colorSet.inactive;
  };

  if (!responses || responses.length === 0) return null;

  const activeResponse = responses[activeTab];
  const { provider, modelName } = getProviderInfo(activeResponse?.model || '');
  const isStreaming = !activeResponse?.isComplete && activeResponse?.content;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex overflow-x-auto scrollbar-hide">
          {responses.map((response, index) => {
            const { provider, modelName } = getProviderInfo(response?.model || '');
            const isTabActive = activeTab === index;
            const isTabStreaming = !response?.isComplete && response?.content;
            
            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 hover:bg-white/50 dark:hover:bg-gray-800/50 ${
                  isTabActive
                    ? `${getTabColor(provider, true)} border-current shadow-sm`
                    : `${getTabColor(provider, false)} border-transparent`
                }`}
              >
                <div className="flex items-center space-x-2">
                  <IconRobot 
                    size={16} 
                    className={isTabStreaming ? 'animate-pulse text-blue-500' : ''} 
                  />
                  <div className="flex flex-col items-start">
                    <span className="truncate max-w-32 font-medium">
                      {modelName}
                    </span>
                    <span className="text-xs opacity-75 font-normal">
                      {provider}
                    </span>
                  </div>
                  {response?.cost && (
                    <span className="text-xs opacity-75 font-mono">
                      {typeof response.cost === 'number' ? formatTokens(response.cost) : `$${formatCurrency(response.cost)}`}
                    </span>
                  )}
                  {isTabStreaming && (
                    <IconLoader className="w-3 h-3 animate-spin text-blue-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeResponse && (
          <div className="space-y-4">
            {/* Model Info Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${getProviderColor(provider)}`}>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{modelName}</span>
                    <span className="text-xs opacity-75">via {provider}</span>
                  </div>
                </div>
                {isStreaming && (
                  <div className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400">
                    <IconLoader className="w-4 h-4 animate-spin" />
                    <span className="font-medium">Streaming...</span>
                  </div>
                )}
                {timestamp && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(timestamp).toLocaleString()}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {activeResponse.cost && (
                  <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                    <IconCurrency size={14} />
                    <span className="font-mono font-medium">{typeof activeResponse.cost === 'number' ? formatTokens(activeResponse.cost) : `$${formatCurrency(activeResponse.cost)}`}</span>
                  </div>
                )}
                <button
                  onClick={() => handleCopy(activeResponse.content, activeTab)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Copy response"
                >
                  {copiedStates[activeTab] ? (
                    <IconCheck size={18} className="text-green-500" />
                  ) : (
                    <IconCopy size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Attachments ({attachments.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm"
                    >
                      <span className="text-gray-600 dark:text-gray-400">
                        📎 {attachment.name}
                      </span>
                      {attachment.size && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          ({(attachment.size / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response Content with Enhanced Markdown */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
              <div className="max-h-[500px] overflow-y-auto p-4">
                {activeResponse.content ? (
                  <MarkdownRenderer 
                    content={activeResponse.content}
                    className="prose-sm max-w-none"
                    enableSyntaxHighlighting={true}
                    enableGfm={true}
                  />
                ) : activeResponse.error ? (
                  <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <p className="font-medium">Error:</p>
                    <p>{activeResponse.error}</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-center space-y-2">
                      <IconLoader className="w-8 h-8 animate-spin mx-auto" />
                      <p className="text-sm">Waiting for response...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabbedResponseLayout;