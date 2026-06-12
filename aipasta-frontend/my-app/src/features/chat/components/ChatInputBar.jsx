import React from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { SlideUp, FadeIn } from '../../../components/animations';
import { PlaceholdersAndVanishInput } from '../../../features';

const ChatInputBar = ({
  inputValue,
  setInputValue,
  attachedFiles,
  isSubmitting,
  hasActiveResponses,
  selectedModels,
  credits,
  isAuthenticated,
  isClient,
  sendMessage,
  backendOnline,
  isReconnecting,
  AI_CHAT_PLACEHOLDERS
}) => {
  const tokensNeeded = selectedModels.reduce((total, model) => {
    const isPaidModel = model.pricing && (model.pricing.input > 0 || model.pricing.output > 0);
    return total + (isPaidModel ? 10 : 1);
  }, 0);

  return (
    <div className="sticky bottom-0 p-3 sm:p-4 bg-gradient-to-t from-gray-50/95 to-gray-50/85 dark:from-neutral-800/95 dark:to-neutral-800/85 backdrop-blur-md border-t border-white/20 dark:border-neutral-700/50 rounded-none sm:rounded-b-xl safe-area-inset-bottom">
      <div className="space-y-2 mb-4">
        {isAuthenticated && isClient && credits <= 0 && (
          <SlideUp>
            <div className="flex items-center gap-3 p-4 bg-red-100/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-xl shadow-lg">
              <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="text-sm font-medium text-red-700 dark:text-red-300">
                No tokens remaining. Please upgrade your account to continue.
              </div>
            </div>
          </SlideUp>
        )}

        {isAuthenticated && isClient && credits > 0 && selectedModels.length > 0 && tokensNeeded > credits && (
          <SlideUp delay={0.1}>
            <div className="flex items-center gap-3 p-4 bg-orange-100/80 dark:bg-orange-900/40 backdrop-blur-sm border border-orange-200/50 dark:border-orange-800/50 rounded-xl shadow-lg">
              <IconAlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
              <div className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Insufficient tokens: have {credits}, need {tokensNeeded} tokens
              </div>
            </div>
          </SlideUp>
        )}
      </div>

      {!backendOnline && (
        <FadeIn className="flex justify-center mb-4">
          <div className="flex items-center gap-3 p-3 bg-red-100/80 dark:bg-red-900/40 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-xl shadow-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <div className="text-sm font-medium text-red-700 dark:text-red-300">
              {isReconnecting
                ? "?? Reconnecting to backend..."
                : "? Backend is offline - trying to reconnect"}
            </div>
          </div>
        </FadeIn>
      )}

      <div className="flex justify-center">
        <div className="relative w-full max-w-6xl bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl border border-white/40 dark:border-neutral-600/40 p-2 sm:p-3 transition-all duration-300 hover:shadow-xl sm:hover:shadow-3xl hover:bg-white/95 dark:hover:bg-neutral-900/95">
          <div
            style={{
              opacity: isSubmitting || selectedModels.length === 0 || (isClient && credits <= 0) ? 0.5 : 1,
              pointerEvents: isSubmitting || selectedModels.length === 0 || (isClient && credits <= 0) ? "none" : "auto",
            }}
          >
            <PlaceholdersAndVanishInput
              placeholders={selectedModels.length === 0 ? ["Select models to start chatting..."] : AI_CHAT_PLACEHOLDERS}
              onChange={(e) => setInputValue(e.target.value)}
              onSubmit={(e) => {
                if ((inputValue.trim() || attachedFiles.length > 0) && !isSubmitting && selectedModels.length > 0 && !(isClient && credits <= 0)) {
                  sendMessage();
                  setTimeout(() => setInputValue(""), 100);
                }
              }}
            />
          </div>

          {(isSubmitting || hasActiveResponses) && (
            <FadeIn className="absolute inset-0 flex items-center justify-center bg-white/95 dark:bg-neutral-900/95 rounded-2xl pointer-events-none backdrop-blur-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-6 h-6 border-2 border-purple-200 dark:border-purple-700 rounded-full animate-pulse"></div>
                </div>
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Processing...
                </span>
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInputBar;
