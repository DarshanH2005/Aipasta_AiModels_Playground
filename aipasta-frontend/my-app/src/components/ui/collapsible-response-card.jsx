import React, { useState } from 'react';
import { IconChevronDown, IconChevronUp, IconCopy, IconCheck } from '@tabler/icons-react';
import { formatCurrency } from '../../lib/wallet';

const CollapsibleResponseCard = ({ 
  response,
  timestamp, 
  attachments = [],
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  // Handle case where response might be undefined
  if (!response) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">No response available</p>
      </div>
    );
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(response.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const getProviderColor = (provider) => {
    if (!provider) return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
    
    switch (provider.toLowerCase()) {
      case 'openrouter': 
      case 'openai': 
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'anthropic': 
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'google':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'cohere':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'meta':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'mistral':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'hugging face': 
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      default: 
        return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
    }
  };

  // Extract provider from model string (e.g., "openai/gpt-4" -> "openai")
  const provider = response.model ? response.model.split('/')[0] : 'unknown';
  const modelName = response.model ? response.model.split('/').pop() : 'Unknown Model';

  return (
    <div className={`border rounded-lg transition-all duration-200 ${getProviderColor(provider)} mb-3`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-1">
            <div className="font-medium text-sm">
              {modelName}
            </div>
            <div className="text-xs opacity-75">
              {provider}
            </div>
          </div>
          {response.cost && (
            <div className="text-xs font-medium">
              ${formatCurrency(response.cost)}
            </div>
          )}
          {timestamp && (
            <div className="text-xs opacity-60">
              {new Date(timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            title="Copy response"
          >
            {copied ? (
              <IconCheck className="w-4 h-4 text-green-600" />
            ) : (
              <IconCopy className="w-4 h-4" />
            )}
          </button>
          {isExpanded ? (
            <IconChevronUp className="w-4 h-4" />
          ) : (
            <IconChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-black/10 dark:border-white/10">
          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium mb-2 opacity-75">Attachments:</div>
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 bg-black/10 dark:bg-white/10 px-2 py-1 rounded text-sm"
                  >
                    <span>📎 {attachment.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response Content with Height Limit */}
          <div className="max-h-96 overflow-y-auto">
            {response.error ? (
              <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded">
                <p className="font-medium">Error:</p>
                <p>{response.error}</p>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap break-words">
                  {response.content}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollapsibleResponseCard;