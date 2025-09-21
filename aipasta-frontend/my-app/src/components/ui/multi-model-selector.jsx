import React, { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconPhoto, IconMusic, IconCurrency, IconCheck, IconSelector } from '@tabler/icons-react';
import { formatCurrency } from '../../lib/wallet';

const MultiModelSelector = ({ selectedModels = [], onModelsChange, models = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleModelToggle = (model) => {
    const isSelected = selectedModels.some(m => m.id === model.id);
    
    if (isSelected) {
      // Remove model
      const updatedModels = selectedModels.filter(m => m.id !== model.id);
      onModelsChange(updatedModels);
    } else {
      // Add model
      const updatedModels = [...selectedModels, model];
      onModelsChange(updatedModels);
    }
  };

  const isModelSelected = (model) => {
    return selectedModels.some(m => m.id === model.id);
  };

  const getCapabilitiesText = (capabilities) => {
    const caps = [];
    if (capabilities.text) caps.push('Text');
    if (capabilities.image) caps.push('Image');
    if (capabilities.audio) caps.push('Audio');
    if (capabilities.video) caps.push('Video');
    return caps.join(', ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="w-full p-3 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg cursor-pointer flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-600"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-neutral-900 dark:text-neutral-100">
            {selectedModels.length === 0 && 'Select models'}
            {selectedModels.length === 1 && selectedModels[0].name}
            {selectedModels.length > 1 && `${selectedModels.length} models selected`}
          </div>
          
          {selectedModels.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              {selectedModels.length === 1 ? (
                // Show detailed info for single model
                <>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {selectedModels[0].provider}
                  </div>
                  
                  {/* Capabilities */}
                  <div className="flex items-center gap-1">
                    {selectedModels[0].capabilities.text && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" title="Text" />
                    )}
                    {selectedModels[0].capabilities.image && (
                      <IconPhoto className="w-3 h-3 text-green-500" title="Image" />
                    )}
                    {selectedModels[0].capabilities.audio && (
                      <IconMusic className="w-3 h-3 text-purple-500" title="Audio" />
                    )}
                  </div>
                  
                  {/* Pricing */}
                  <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <IconCurrency className="w-3 h-3" />
                    <span>{formatCurrency(selectedModels[0].pricing.input)}/1K in</span>
                  </div>
                </>
              ) : (
                // Show summary for multiple models
                <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <div className="flex items-center gap-1">
                    <IconSelector className="w-3 h-3" />
                    <span>{selectedModels.map(m => m.provider).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <IconChevronDown 
          className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {/* Header */}
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-600">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Select Models ({selectedModels.length} selected)
            </div>
            {selectedModels.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onModelsChange([]);
                }}
                className="text-xs text-purple-600 hover:text-purple-700 mt-1"
              >
                Clear all
              </button>
            )}
          </div>
          
          {/* Model List */}
          {models.map((model) => {
            const selected = isModelSelected(model);
            
            return (
              <div
                key={model.id}
                className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-600 cursor-pointer border-b border-neutral-100 dark:border-neutral-600 last:border-b-0"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModelToggle(model);
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center mt-0.5 transition-colors ${
                    selected 
                      ? 'bg-purple-600 border-purple-600' 
                      : 'border-neutral-300 dark:border-neutral-500'
                  }`}>
                    {selected && (
                      <IconCheck className="w-3 h-3 text-white" />
                    )}
                  </div>
                  
                  {/* Model Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      {model.name}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      {model.provider} • {model.description}
                    </div>
                    
                    {/* Capabilities Row */}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Supports:
                      </div>
                      <div className="flex items-center gap-2">
                        {model.capabilities.text && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                            Text
                          </span>
                        )}
                        {model.capabilities.image && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                            <IconPhoto className="w-3 h-3" />
                            Image
                          </span>
                        )}
                        {model.capabilities.audio && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                            <IconMusic className="w-3 h-3" />
                            Audio
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Pricing Row */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center gap-1">
                        <IconCurrency className="w-3 h-3" />
                        <span>In: {formatCurrency(model.pricing.input)}/1K</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Out: {formatCurrency(model.pricing.output)}/1K</span>
                      </div>
                      {model.pricing.image && (
                        <div className="flex items-center gap-1">
                          <IconPhoto className="w-3 h-3" />
                          <span>{formatCurrency(model.pricing.image)}/img</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Model Stats */}
                  <div className="text-right text-xs text-neutral-400 dark:text-neutral-500">
                    <div>{model.maxTokens?.toLocaleString()} max tokens</div>
                    <div>{(model.contextLength / 1000).toFixed(0)}K context</div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Footer */}
          {selectedModels.length > 0 && (
            <div className="p-3 border-t border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800">
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''} selected. 
                Requests will be sent to all selected models simultaneously.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MultiModelSelector;