import React, { memo, useState, useEffect, useRef } from 'react';
import { IconChevronDown, IconChevronUp, IconCopy, IconCheck, IconLoader, IconRobot } from '@tabler/icons-react';
import { formatCurrency } from '../../lib/wallet';
import MarkdownRenderer from './markdown-renderer';

// Virtualized content component with Markdown support
const VirtualizedContent = memo(({ content, maxHeight = 400, className = "" }) => {
  const containerRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      setIsOverflowing(container.scrollHeight > container.clientHeight);
    }
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight: `${maxHeight}px` }}
    >
      <MarkdownRenderer 
        content={content}
        className="leading-relaxed"
        enableSyntaxHighlighting={true}
        enableGfm={true}
      />
      {isOverflowing && (
        <div className="sticky bottom-0 h-4 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
      )}
    </div>
  );
});

VirtualizedContent.displayName = 'VirtualizedContent';

// Streaming response component optimized for performance
const StreamingResponseCard = memo(({ 
  response,
  timestamp, 
  attachments = [],
  defaultExpanded = false,
  onToggle
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const contentRef = useRef(null);
  const progressRef = useRef({ lastLength: 0, chunks: 0 });

  // Auto-scroll to bottom when content updates (only if user is at bottom)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (!response?.content) return;
    
    const container = contentRef.current;
    if (container && shouldAutoScroll) {
      const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
      if (isAtBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }

    // Update progress tracking
    const currentLength = response.content.length;
    if (currentLength > progressRef.current.lastLength) {
      progressRef.current = {
        lastLength: currentLength,
        chunks: progressRef.current.chunks + 1
      };
      
      if (!response.isComplete) {
        setShowProgress(true);
        const timer = setTimeout(() => setShowProgress(false), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [response?.content, response?.isComplete, shouldAutoScroll]);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded);
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

  const handleScroll = (e) => {
    const container = e.target;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10;
    setShouldAutoScroll(isAtBottom);
  };

  const getProviderColor = (provider) => {
    // Use neutral colors for clean, readable design
    return 'bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700';
  };

  // Handle missing response data
  if (!response) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800 mb-3">
        <p className="text-gray-500 dark:text-gray-400">No response available</p>
      </div>
    );
  }

  // Extract provider and model name
  const provider = response.model ? response.model.split('/')[0] : 'unknown';
  const modelName = response.model ? response.model.split('/').pop() : 'Unknown Model';
  const isStreaming = !response.isComplete && response.content;

  return (
    <div className={`border rounded-lg transition-all duration-200 ${getProviderColor(provider)} mb-3 overflow-hidden`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <IconRobot className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {modelName}
            </div>
            <div className="text-xs opacity-75 flex items-center gap-2">
              <span>{provider}</span>
              {isStreaming && (
                <div className="flex items-center gap-1">
                  <IconLoader className="w-3 h-3 animate-spin" />
                  <span>streaming...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            {response.cost && (
              <span className="font-medium">
                {formatCurrency(response.cost)}
              </span>
            )}
            {timestamp && (
              <span className="opacity-60">
                {new Date(timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {showProgress && (
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            title="Copy response"
            disabled={!response.content}
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
        <div className="border-t border-black/10 dark:border-white/10">
          <div className="p-3">
            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium mb-2 opacity-75">Attachments:</div>
                <div className="flex flex-wrap gap-1">
                  {attachments.map((attachment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-1 bg-black/10 dark:bg-white/10 px-2 py-1 rounded text-xs"
                    >
                      <span>📎 {attachment.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response Content */}
            {response.error ? (
              <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm">
                <p className="font-medium">Error:</p>
                <p>{response.error}</p>
              </div>
            ) : response.content ? (
              <div 
                ref={contentRef}
                onScroll={handleScroll}
                className="relative"
              >
                <VirtualizedContent
                  content={response.content}
                  maxHeight={400}
                  className="prose dark:prose-invert prose-sm max-w-none"
                />
                {isStreaming && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-blue-600 dark:text-blue-400">
                    <IconLoader className="w-3 h-3 animate-spin" />
                    <span>Generating response...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                <IconLoader className="w-4 h-4 animate-spin mr-2" />
                Waiting for response...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

StreamingResponseCard.displayName = 'StreamingResponseCard';

export default StreamingResponseCard;