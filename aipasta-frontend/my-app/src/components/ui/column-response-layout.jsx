import React, { useState, useEffect } from 'react';
import { IconCopy, IconCheck, IconRobot, IconCurrency, IconLoader, IconMaximize, IconMinimize, IconExternalLink, IconX } from '@tabler/icons-react';
import { formatCurrency } from '../../lib/wallet';
import MarkdownRenderer from './markdown-renderer';

const ColumnResponseLayout = ({ responses, timestamp, attachments }) => {
  const [copiedStates, setCopiedStates] = useState({});
  const [expandedCards, setExpandedCards] = useState(new Set([0, 1, 2])); // First 3 cards expanded by default
  const [popupContent, setPopupContent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // Reset expanded cards to first 3 when timestamp changes (new chat request)
  useEffect(() => {
    setExpandedCards(new Set([0, 1, 2]));
  }, [timestamp]);

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

  const handlePopup = (response, index) => {
    const { provider, modelName } = getProviderInfo(response?.model || '');
    setPopupContent({
      response,
      index,
      provider,
      modelName
    });
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setPopupContent(null);
  };

  // Handle escape key for popup
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showPopup) {
        closePopup();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showPopup]);

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

  const renderResponseCard = (response, index) => {
    const { provider, modelName } = getProviderInfo(response?.model || '');
    const isStreaming = !response?.isComplete && response?.content;
    const isExpanded = expandedCards.has(index);
    const isInFirstThree = index < 3;

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
                <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                  <IconLoader size={12} className="animate-spin" />
                  <span className="text-xs">Streaming</span>
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
                onClick={() => handlePopup(response, index)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Open in popup"
              >
                <IconExternalLink size={16} />
              </button>

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
        </div>

        {/* Content */}
        <div className={`transition-all duration-300 ${isExpanded ? 'max-h-none' : 'max-h-96 overflow-hidden'}`}>
          <div className="p-4">
            {/* Attachments for first response */}
            {index === 0 && attachments && attachments.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Attachments:</div>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment, attachmentIndex) => (
                    <div
                      key={attachmentIndex}
                      className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs"
                    >
                      <span>📎 {attachment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response content */}
            {response?.error ? (
              <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">
                <p className="font-medium">Error:</p>
                <p>{response.error}</p>
              </div>
            ) : response?.content ? (
              <MarkdownRenderer 
                content={response.content}
                enableSyntaxHighlighting={true}
                enableGfm={true}
              />
            ) : (
              <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                <IconLoader className="w-4 h-4 animate-spin mr-2" />
                Waiting for response...
              </div>
            )}
          </div>

          {/* Show More button for collapsed content */}
          {!isExpanded && response?.content && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <button
                onClick={() => handleToggleExpand(index)}
                className="w-full flex items-center justify-center space-x-2 text-sm font-bold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-all duration-200 py-3 px-4 rounded-lg bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 border-2 border-blue-300 dark:border-blue-700 shadow-sm hover:shadow-md"
              >
                <IconMaximize size={18} />
                <span>Show More ({response.content.length} chars)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="overflow-x-auto scrollbar-custom pb-4">
        <div 
          className="flex gap-4" 
          style={{ 
            width: responses.length > 3 
              ? `calc(100% + ${(responses.length - 3) * 336}px)` // 320px + 16px gap for each extra model
              : '100%' 
          }}
        >
          {responses.map((response, index) => {
            // Only first 3 models use flex-1 to fit screen width
            // All others (4th, 5th, 6th, etc.) use fixed width for scrolling
            const isInFirstThree = index < 3;
            
            return (
              <div 
                key={index} 
                className={isInFirstThree ? 'flex-1 min-w-0' : 'w-80 flex-shrink-0'}
              >
                {renderResponseCard(response, index)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Popup Modal */}
      {showPopup && popupContent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/10 dark:bg-black/20 backdrop-blur-md"
          onClick={closePopup}
        >
          <div 
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20 dark:border-gray-700/50 max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1.5 text-sm font-medium rounded-lg border ${getProviderColor(popupContent.provider)}`}>
                    <div className="flex items-center space-x-2">
                      <IconRobot size={16} />
                      <span className="font-semibold">{popupContent.modelName}</span>
                    </div>
                  </div>
                  {popupContent.response?.cost && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 py-1 rounded border border-white/20 dark:border-gray-700/50">
                      <IconCurrency size={14} />
                      <span className="font-mono">${formatCurrency(popupContent.response.cost)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={closePopup}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Close popup"
                >
                  <IconX size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] scrollbar-custom">
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownRenderer content={popupContent.response?.content || 'No content available.'} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ColumnResponseLayout;