import { useState, useEffect, useRef } from 'react';
import { IconX, IconSearch, IconBrain, IconPhoto, IconMusic, IconCurrency, IconCheck, IconFilter, IconStar, IconPlus } from '@tabler/icons-react';
import { formatCurrency } from '../../../lib/wallet';

const ModelSelectionModal = ({ 
  isOpen, 
  onClose, 
  models, 
  selectedModels, 
  onModelsChange 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedModels, setTempSelectedModels] = useState([...selectedModels]);
  const [activeQuickFilter, setActiveQuickFilter] = useState('all'); // all, free, text, vision, multimodal
  const [providerFilter, setProviderFilter] = useState('all');
  const [favoriteGroups, setFavoriteGroups] = useState(() => {
    // Load saved favorite groups from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('modelFavoriteGroups');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const searchInputRef = useRef(null);
  const modalRef = useRef(null);

  // Load favorite groups from localStorage after component mounts (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('modelFavoriteGroups');
      if (saved) {
        try {
          const groups = JSON.parse(saved);
          // Clean up any groups with invalid model IDs
          const cleanedGroups = {};
          let needsCleanup = false;

          Object.entries(groups).forEach(([groupName, models]) => {
            const validModels = models.filter(model => {
              if (!model.id || typeof model.id !== 'string' || model.id.length < 3) {
                console.warn('Removing invalid model from favorite group:', model);
                needsCleanup = true;
                return false;
              }
              return true;
            });
            
            // Only keep groups that have at least one valid model
            if (validModels.length > 0) {
              cleanedGroups[groupName] = validModels;
            } else if (models.length > 0) {
              console.warn('Removing empty favorite group after cleanup:', groupName);
              needsCleanup = true;
            }
          });

          setFavoriteGroups(cleanedGroups);
          
          // Save cleaned groups back to localStorage if cleanup was needed
          if (needsCleanup) {
            localStorage.setItem('modelFavoriteGroups', JSON.stringify(cleanedGroups));
            console.log('Cleaned up invalid model IDs from favorite groups');
          }
        } catch (error) {
          console.warn('Failed to load favorite groups from localStorage:', error);
          // Clear corrupted data
          localStorage.removeItem('modelFavoriteGroups');
        }
      }
    }
  }, []);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset temp selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedModels([...selectedModels]);
      setSearchQuery('');
      setActiveQuickFilter('all');
      setProviderFilter('all');
    }
  }, [isOpen, selectedModels]);

  if (!isOpen) return null;

  // Get unique providers
  const uniqueProviders = [...new Set(models.map(model => model.provider))];

  // Apply all filters
  let filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Provider filter
  if (providerFilter !== 'all') {
    filteredModels = filteredModels.filter(model => model.provider === providerFilter);
  }

  // Quick filters
  if (activeQuickFilter === 'free') {
    filteredModels = filteredModels.filter(model => 
      model.pricing.input === 0 && model.pricing.output === 0 && model.pricing.image === 0
    );
  } else if (activeQuickFilter === 'text') {
    filteredModels = filteredModels.filter(model => 
      model.capabilities.text && !model.capabilities.image && !model.capabilities.audio
    );
  } else if (activeQuickFilter === 'vision') {
    filteredModels = filteredModels.filter(model => model.capabilities.image);
  } else if (activeQuickFilter === 'multimodal') {
    filteredModels = filteredModels.filter(model => 
      model.capabilities.text && (model.capabilities.image || model.capabilities.audio)
    );
  }

  // Categorize models
  const textOnlyModels = filteredModels.filter(model => 
    model.capabilities.text && !model.capabilities.image && !model.capabilities.audio
  );
  
  const multimodalModels = filteredModels.filter(model => 
    model.capabilities.text && (model.capabilities.image || model.capabilities.audio)
  );

  const specializedModels = filteredModels.filter(model => 
    !model.capabilities.text || (!model.capabilities.image && !model.capabilities.audio && model.capabilities.text)
  );

  // Debug logging
  console.log('🔍 Modal Debug Info:', {
    totalModels: models.length,
    filteredModels: filteredModels.length,
    textOnlyModels: textOnlyModels.length,
    multimodalModels: multimodalModels.length,
    specializedModels: specializedModels.length,
    activeQuickFilter,
    searchQuery,
    sampleModel: filteredModels[0] ? {
      id: filteredModels[0].id,
      name: filteredModels[0].name,
      capabilities: filteredModels[0].capabilities
    } : 'none'
  });

  const toggleModelSelection = (model) => {
    const isSelected = tempSelectedModels.some(m => m.id === model.id);
    if (isSelected) {
      setTempSelectedModels(tempSelectedModels.filter(m => m.id !== model.id));
    } else {
      setTempSelectedModels([...tempSelectedModels, model]);
    }
  };

  const handleApply = () => {
    onModelsChange(tempSelectedModels);
    onClose();
  };

  const handleSelectAll = () => {
    setTempSelectedModels([...filteredModels]);
  };

  const handleClearAll = () => {
    setTempSelectedModels([]);
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim() && tempSelectedModels.length > 0) {
      // Filter out any models with invalid IDs
      const validModels = tempSelectedModels.filter(model => {
        if (!model.id || typeof model.id !== 'string' || model.id.length < 3) {
          console.warn('Excluding invalid model from favorite group:', model);
          return false;
        }
        return true;
      });

      if (validModels.length === 0) {
        console.error('No valid models to save in favorite group');
        return;
      }

      const newGroups = {
        ...favoriteGroups,
        [newGroupName.trim()]: validModels.map(model => ({
          id: model.id,
          name: model.name,
          provider: model.provider
        }))
      };
      setFavoriteGroups(newGroups);
      // Save to localStorage only on client-side
      if (typeof window !== 'undefined') {
        localStorage.setItem('modelFavoriteGroups', JSON.stringify(newGroups));
      }
      setNewGroupName('');
      setShowCreateGroup(false);
    }
  };

  const handleLoadGroup = (groupName) => {
    const groupModels = favoriteGroups[groupName];
    if (groupModels) {
      const modelsToSelect = models.filter(model => 
        groupModels.some(groupModel => {
          // Validate that the group model ID is a proper model format
          if (!groupModel.id || typeof groupModel.id !== 'string' || groupModel.id.length < 3) {
            console.warn('Invalid model ID found in favorite group:', groupModel.id);
            return false;
          }
          return groupModel.id === model.id;
        })
      );
      setTempSelectedModels(modelsToSelect);
    }
  };

  const handleDeleteGroup = (groupName) => {
    const newGroups = { ...favoriteGroups };
    delete newGroups[groupName];
    setFavoriteGroups(newGroups);
    // Save to localStorage only on client-side
    if (typeof window !== 'undefined') {
      localStorage.setItem('modelFavoriteGroups', JSON.stringify(newGroups));
    }
  };

  const ModelCard = ({ model }) => {
    const isSelected = tempSelectedModels.some(m => m.id === model.id);
    const isFree = model.pricing.input === 0 && model.pricing.output === 0 && model.pricing.image === 0;

    return (
      <div
        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 group ${
          isSelected 
            ? 'border-purple-500/50 bg-purple-50/80 dark:bg-purple-900/20 shadow-sm' 
            : 'border-white/30 dark:border-neutral-700/50 hover:border-purple-300/60 dark:hover:border-purple-600/50 bg-white/30 dark:bg-neutral-800/30 hover:bg-white/50 dark:hover:bg-neutral-700/40'
        }`}
        onClick={() => toggleModelSelection(model)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              isSelected 
                ? 'border-purple-500 bg-purple-500' 
                : 'border-neutral-300/70 dark:border-neutral-600/70 bg-white/50 dark:bg-neutral-700/50 group-hover:border-purple-400'
            }`}>
              {isSelected && <IconCheck className="w-2.5 h-2.5 text-white" />}
            </div>
            <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 truncate">
              {model.name}
            </div>
          
          {/* Pricing Badge */}
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
            isFree 
              ? 'bg-green-100/80 dark:bg-green-900/50 text-green-700 dark:text-green-300'
              : 'bg-amber-100/80 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
          }`}>
            {isFree ? 'FREE' : 'PAID'}
          </div>
        </div>
        
        {/* Provider */}
        <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 truncate">
          {model.provider}
        </div>
        
        {/* Capabilities */}
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          {model.capabilities.text && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded border border-blue-200/50 dark:border-blue-700/50">
              <IconBrain className="w-2.5 h-2.5" />
              Text
            </span>
          )}
          {model.capabilities.image && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100/60 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded border border-green-200/50 dark:border-green-700/50">
              <IconPhoto className="w-2.5 h-2.5" />
              Image
            </span>
          )}
          {model.capabilities.audio && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100/60 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded border border-purple-200/50 dark:border-purple-700/50">
              <IconMusic className="w-2.5 h-2.5" />
              Audio
            </span>
          )}
        </div>
        
        {/* Bottom Info */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <div className="truncate">
            {(model.contextLength / 1000).toFixed(0)}K context
          </div>
          {!isFree && (
            <div className="flex items-center gap-1 text-xs">
              <IconCurrency className="w-2.5 h-2.5" />
              <span>{formatCurrency(model.pricing.input)}/1K</span>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  };

  const ModelSection = ({ title, models, icon }) => {
    if (models.length === 0) return null;
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
            {title} ({models.length})
          </h3>
        </div>
        <div className="space-y-2">
          {models.map(model => (
            <ModelCard key={model.id} model={model} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-neutral-700/50 w-full max-w-7xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-neutral-700/50">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Select AI Models
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Choose one or more models for your chat session
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 dark:hover:bg-neutral-700/50 rounded-lg transition-all duration-200"
          >
            <IconX className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="p-6 border-b border-white/20 dark:border-neutral-700/50">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-white/30 dark:border-neutral-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 bg-white/50 dark:bg-neutral-700/50 backdrop-blur-sm dark:text-neutral-100 placeholder-neutral-400"
            />
          </div>
        </div>
        
        {/* Main Content - 2 Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column - Filters */}
          <div className="w-80 border-r border-white/20 dark:border-neutral-700/50 p-6 space-y-6 overflow-y-auto">
            {/* Quick Filters */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <IconFilter className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Quick Filters</span>
              </div>
              <div className="space-y-2">
                {[
                  { key: 'all', label: 'All Models', icon: IconBrain },
                  { key: 'free', label: 'Free Models', icon: IconCurrency },
                  { key: 'text', label: 'Text Only', icon: IconBrain },
                  { key: 'vision', label: 'Vision Models', icon: IconPhoto },
                  { key: 'multimodal', label: 'Multimodal', icon: IconMusic }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveQuickFilter(key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeQuickFilter === key
                        ? 'bg-purple-600/80 text-white border border-purple-500/30'
                        : 'bg-white/30 dark:bg-neutral-700/30 text-neutral-700 dark:text-neutral-300 border border-white/20 dark:border-neutral-600/30 hover:bg-white/40 dark:hover:bg-neutral-600/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Provider</label>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/50 dark:bg-neutral-700/50 border border-white/30 dark:border-neutral-600/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 dark:text-neutral-100"
              >
                <option value="all">All Providers</option>
                {uniqueProviders.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>

            {/* Favorite Groups */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconStar className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Quick Filter Baskets</span>
                </div>
                <button
                  onClick={() => setShowCreateGroup(!showCreateGroup)}
                  disabled={tempSelectedModels.length === 0}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-600/80 text-white rounded-md hover:bg-purple-700/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IconPlus className="w-3 h-3" />
                  Save Current
                </button>
              </div>
              
              {showCreateGroup && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-white/20 dark:bg-neutral-800/20 rounded-lg">
                  <input
                    type="text"
                    placeholder="Group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs bg-transparent border-b border-white/30 dark:border-neutral-600/50 focus:outline-none focus:border-purple-500/50 dark:text-neutral-100"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateGroup()}
                  />
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {setShowCreateGroup(false); setNewGroupName('')}}
                    className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {Object.keys(favoriteGroups).map(groupName => (
                  <div key={groupName} className="flex items-center justify-between p-2 bg-yellow-100/40 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-lg border border-yellow-200/30 dark:border-yellow-700/30">
                    <button
                      onClick={() => handleLoadGroup(groupName)}
                      className="flex-1 text-left text-sm hover:underline"
                    >
                      {groupName} ({favoriteGroups[groupName].length})
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(groupName)}
                      className="text-yellow-600/70 dark:text-yellow-400/70 hover:text-red-500 dark:hover:text-red-400 px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {Object.keys(favoriteGroups).length === 0 && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-4">
                    No saved groups yet. Select models and click "Save Current" to create a group.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-white/20 dark:border-neutral-700/50">
              <button
                onClick={handleSelectAll}
                disabled={filteredModels.length === 0}
                className="w-full px-3 py-2 text-sm bg-white/30 dark:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-white/40 dark:hover:bg-neutral-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Select All ({filteredModels.length})
              </button>
              <button
                onClick={handleClearAll}
                disabled={tempSelectedModels.length === 0}
                className="w-full px-3 py-2 text-sm bg-white/30 dark:bg-neutral-700/50 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-white/40 dark:hover:bg-neutral-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Clear All
              </button>
            </div>

            {/* Selection Summary */}
            <div className="text-sm text-neutral-600 dark:text-neutral-400 pt-4 border-t border-white/20 dark:border-neutral-700/50">
              <div className="flex items-center justify-between mb-1">
                <span>Selected:</span>
                <span>{tempSelectedModels.length}</span>
              </div>
              {tempSelectedModels.length > 0 && (
                <div className="text-xs">
                  <span>Providers: {[...new Set(tempSelectedModels.map(m => m.provider))].join(', ')}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Column - Models */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredModels.length === 0 ? (
              <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                <IconSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No models found matching your filters</p>
                {searchQuery && <p className="text-sm mt-1">Try different search terms or filters</p>}
              </div>
            ) : (
              <div>
                {activeQuickFilter === 'all' ? (
                  <>
                    <ModelSection
                      title="Multimodal Models"
                      models={filteredModels.filter(model => 
                        model.capabilities.text && (model.capabilities.image || model.capabilities.audio)
                      )}
                      icon={<IconPhoto className="w-4 h-4 text-green-600" />}
                    />
                    
                    <ModelSection
                      title="Text-Only Models"
                      models={filteredModels.filter(model => 
                        model.capabilities.text && !model.capabilities.image && !model.capabilities.audio
                      )}
                      icon={<IconBrain className="w-4 h-4 text-blue-600" />}
                    />
                    
                    <ModelSection
                      title="Free Models"
                      models={filteredModels.filter(model => 
                        model.pricing.input === 0 && model.pricing.output === 0 && model.pricing.image === 0
                      )}
                      icon={<IconCurrency className="w-4 h-4 text-purple-600" />}
                    />
                  </>
                ) : (
                  <ModelSection
                    title={`Filtered Models (${
                      activeQuickFilter === 'free' ? 'Free' :
                      activeQuickFilter === 'text' ? 'Text Only' :
                      activeQuickFilter === 'vision' ? 'Vision' :
                      activeQuickFilter === 'multimodal' ? 'Multimodal' : 'All'
                    })`}
                    models={filteredModels}
                    icon={
                      activeQuickFilter === 'free' ? <IconCurrency className="w-4 h-4 text-purple-600" /> :
                      activeQuickFilter === 'text' ? <IconBrain className="w-4 h-4 text-blue-600" /> :
                      activeQuickFilter === 'vision' ? <IconPhoto className="w-4 h-4 text-green-600" /> :
                      activeQuickFilter === 'multimodal' ? <IconMusic className="w-4 h-4 text-yellow-600" /> :
                      <IconBrain className="w-4 h-4 text-neutral-600" />
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/20 dark:border-neutral-700/50">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {tempSelectedModels.length === 0 ? (
              "Select at least one model to continue"
            ) : (
              `${tempSelectedModels.length} model${tempSelectedModels.length === 1 ? '' : 's'} selected`
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={tempSelectedModels.length === 0}
              className="px-6 py-2 bg-purple-600/80 backdrop-blur-sm text-white rounded-lg hover:bg-purple-700/80 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 border border-purple-500/30"
            >
              Apply Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelectionModal;