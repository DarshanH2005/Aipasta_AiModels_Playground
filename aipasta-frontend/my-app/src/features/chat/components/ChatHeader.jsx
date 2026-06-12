import React from 'react';
import { IconMenu2, IconBrain, IconSettings, IconLogout } from '@tabler/icons-react';
import { PremiumButton } from '../../../components/animations';

const ChatHeader = ({ 
  open, 
  setOpen, 
  selectedModels, 
  modelsLoading, 
  setShowModelModal, 
  setIsSettingsOpen, 
  logout 
}) => {
  return (
    <div className="sticky top-0 z-30 bg-gradient-to-r from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-700 border-b border-neutral-200 dark:border-neutral-700 p-3 sm:p-4 rounded-none sm:rounded-t-xl">
      <div className="flex items-center justify-between">
        {/* Mobile Hamburger + Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors touch-target"
            aria-label="Toggle sidebar"
          >
            <IconMenu2 className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
          </button>

          <div className="flex-1 min-w-0">
            {/* Responsive Title */}
            <h1 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {selectedModels.length === 0 && "Select AI Models"}
              {selectedModels.length === 1 && (
                <span className="hidden sm:inline">
                  Chat with {selectedModels[0].name}
                </span>
              )}
              {selectedModels.length === 1 && (
                <span className="sm:hidden">
                  {selectedModels[0].name}
                </span>
              )}
              {selectedModels.length > 1 && (
                <>
                  <span className="hidden sm:inline">
                    Multi-Model Chat ({selectedModels.length} models)
                  </span>
                  <span className="sm:hidden">
                    {selectedModels.length} Models
                  </span>
                </>
              )}
            </h1>
            {selectedModels.length > 0 && (
              <p className="hidden sm:block text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {selectedModels.length === 1
                  ? `Provider: ${selectedModels[0].provider}`
                  : `Providers: ${[...new Set(selectedModels.map((m) => m.provider))].join(", ")}`}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          <PremiumButton
            onClick={() => setShowModelModal(true)}
            disabled={modelsLoading}
            loading={modelsLoading}
            variant="gradient"
            size="md"
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 touch-target"
          >
            <IconBrain className="w-4 h-4" />
            <span className="hidden sm:inline font-medium">
              {!modelsLoading && selectedModels.length === 0 && "Select Models"}
              {!modelsLoading && selectedModels.length === 1 && "Change Model"}
              {!modelsLoading && selectedModels.length > 1 && `${selectedModels.length} Selected`}
            </span>
            <span className="sm:hidden font-medium">
              {selectedModels.length || "Models"}
            </span>
          </PremiumButton>

          <PremiumButton
            onClick={() => setIsSettingsOpen(true)}
            variant="secondary"
            size="md"
            title="Settings"
            className="px-2 sm:px-3 py-1.5 sm:py-2 touch-target"
          >
            <IconSettings className="w-4 h-4 sm:w-5 sm:h-5" />
          </PremiumButton>

          <button
            onClick={logout}
            title="Logout"
            className="p-2 rounded-md bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors touch-target"
          >
            <IconLogout className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-700 dark:text-neutral-200" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
