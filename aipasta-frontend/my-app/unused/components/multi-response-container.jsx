import { useState } from 'react';
import { IconLayoutCards, IconLayoutList } from '@tabler/icons-react';
import CollapsibleResponseCard from './collapsible-response-card';
import TabbedResponseLayout from './tabbed-response-layout';

const MultiResponseContainer = ({ responses, timestamp, attachments, showLayoutToggle = true }) => {
  const [layoutMode, setLayoutMode] = useState('tabbed'); // 'tabbed' or 'cards'

  if (!responses || responses.length === 0) return null;

  // If only one response, use simplified layout
  if (responses.length === 1) {
    return (
      <CollapsibleResponseCard
        response={responses[0]}
        timestamp={timestamp}
        attachments={attachments}
        defaultExpanded={true}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Layout Toggle */}
      {showLayoutToggle && responses.length > 1 && (
        <div className="flex justify-end">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex space-x-1">
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
              onClick={() => setLayoutMode('cards')}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                layoutMode === 'cards'
                  ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              title="Card view"
            >
              <IconLayoutCards size={14} />
              <span>Cards</span>
            </button>
          </div>
        </div>
      )}

      {/* Render based on layout mode */}
      {layoutMode === 'tabbed' ? (
        <TabbedResponseLayout
          responses={responses}
          timestamp={timestamp}
          attachments={attachments}
        />
      ) : (
        <div className="space-y-3">
          {responses.map((response, index) => (
            <CollapsibleResponseCard
              key={index}
              response={response}
              timestamp={timestamp}
              attachments={attachments}
              defaultExpanded={index === 0} // Only expand first card by default
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiResponseContainer;