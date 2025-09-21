import React, { memo, useState, useMemo, useCallback } from 'react';
import { IconLayoutCards, IconLayoutList, IconLayoutColumns, IconLoader, IconAlertTriangle } from '@tabler/icons-react';
import StreamingResponseCard from './streaming-response-card';
import TabbedResponseLayout from './tabbed-response-layout';
import ColumnResponseLayout from './column-response-layout';

const OptimizedMultiResponseContainer = memo(({ 
  responses = [], 
  timestamp, 
  attachments = [], 
  showLayoutToggle = true,
  isLoading = false,
  loadingModelCount = 0
}) => {
  const [layoutMode, setLayoutMode] = useState('columns'); // Default to columns for better multi-model view
  const [expandedCards, setExpandedCards] = useState(new Set([0])); // First card expanded

  // Memoize responses to prevent unnecessary re-renders
  const memoizedResponses = useMemo(() => responses, [responses]);

  const handleCardToggle = useCallback((index, isExpanded) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  }, []);

  // Performance optimization: only render visible cards initially for cards mode
  const [renderLimit, setRenderLimit] = useState(3);
  const visibleResponses = useMemo(() => 
    layoutMode === 'cards' ? memoizedResponses.slice(0, renderLimit) : memoizedResponses,
    [memoizedResponses, renderLimit, layoutMode]
  );

  const hasMoreResponses = memoizedResponses.length > renderLimit && layoutMode === 'cards';

  const loadMoreResponses = useCallback(() => {
    setRenderLimit(prev => Math.min(prev + 3, memoizedResponses.length));
  }, [memoizedResponses.length]);

  if (!memoizedResponses.length && !isLoading) {
    return null;
  }

  // Loading state for initial requests
  if (isLoading && !memoizedResponses.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center space-x-3">
          <IconLoader className="w-5 h-5 animate-spin text-blue-500" />
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Requesting responses from {loadingModelCount} model{loadingModelCount !== 1 ? 's' : ''}...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Layout Toggle & Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span>{memoizedResponses.length} response{memoizedResponses.length !== 1 ? 's' : ''}</span>
          {isLoading && (
            <>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <IconLoader className="w-3 h-3 animate-spin" />
                <span>Loading...</span>
              </div>
            </>
          )}
        </div>

        {showLayoutToggle && memoizedResponses.length > 1 && (
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex space-x-1">
            <button
              onClick={() => setLayoutMode('cards')}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                layoutMode === 'cards'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Card view (better for streaming)"
            >
              <IconLayoutCards size={14} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setLayoutMode('tabbed')}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                layoutMode === 'tabbed'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Tabbed view"
            >
              <IconLayoutList size={14} />
              <span>Tabs</span>
            </button>
            <button
              onClick={() => setLayoutMode('columns')}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                layoutMode === 'columns'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Column view (compare side by side)"
            >
              <IconLayoutColumns size={14} />
              <span>Columns</span>
            </button>
          </div>
        )}
      </div>

      {/* Render based on layout mode */}
      {layoutMode === 'tabbed' && memoizedResponses.length > 1 ? (
        <TabbedResponseLayout
          responses={memoizedResponses}
          timestamp={timestamp}
          attachments={attachments}
        />
      ) : layoutMode === 'columns' && memoizedResponses.length > 1 ? (
        <ColumnResponseLayout
          responses={memoizedResponses}
          attachments={attachments}
        />
      ) : (
        <div className="space-y-3">
          {/* Main responses */}
          {visibleResponses.map((response, index) => (
            <StreamingResponseCard
              key={`${response.id || index}-${response.model || 'unknown'}`}
              response={response}
              timestamp={timestamp}
              attachments={index === 0 ? attachments : []} // Only show attachments on first card
              defaultExpanded={expandedCards.has(index)}
              onToggle={(isExpanded) => handleCardToggle(index, isExpanded)}
            />
          ))}

          {/* Load more button for performance */}
          {hasMoreResponses && (
            <div className="text-center py-3">
              <button
                onClick={loadMoreResponses}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                Load {Math.min(3, memoizedResponses.length - renderLimit)} more response{memoizedResponses.length - renderLimit > 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Loading indicator for additional responses */}
          {isLoading && memoizedResponses.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <IconLoader className="w-4 h-4 animate-spin text-blue-500" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Waiting for additional responses...
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Warning */}
      {memoizedResponses.length > 10 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-300">
            <IconAlertTriangle className="w-4 h-4" />
            <div className="text-xs">
              <strong>Performance Notice:</strong> You have {memoizedResponses.length} responses. 
              Consider using tabbed view or reducing the number of models for better performance.
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedMultiResponseContainer.displayName = 'OptimizedMultiResponseContainer';

export default OptimizedMultiResponseContainer;