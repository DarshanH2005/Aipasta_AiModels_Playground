import React from 'react';
import { IconBrain } from '@tabler/icons-react';
import { StaggerContainer, StaggerItem, SlideUp } from '../../../components/animations';
import PremiumChatMessage from '../../../components/chat/PremiumChatMessage';
import { MultiResponseContainer } from '../../../features';

const ChatArea = ({
  messages,
  conversationFlow,
  selectedModels,
  isSubmitting,
  hasActiveResponses,
  messagesEndRef
}) => {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-custom mobile-scroll py-4 sm:py-6 chat-window bg-gray-50 dark:bg-neutral-800">
      {messages.length === 0 && (
        <div className="text-center text-neutral-500 dark:text-neutral-400 py-16 px-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 max-w-md mx-auto shadow-sm border border-gray-200 dark:border-neutral-700">
            <IconBrain className="w-16 h-16 mx-auto mb-6 opacity-50 text-purple-400" />
            {selectedModels.length === 0 ? (
              <>
                <h2 className="text-xl font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                  Welcome to AI Pasta
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Select AI models above to start chatting
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-medium mb-2 text-neutral-900 dark:text-neutral-100">
                  Ready to Chat
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Start a conversation by typing your message below
                </p>
                {selectedModels.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {selectedModels.map((model) => (
                      <span
                        key={model.id}
                        className="inline-flex items-center px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full border border-purple-200 dark:border-purple-800"
                      >
                        {model.name}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <StaggerContainer className="space-y-1">
        {conversationFlow.map((item, index) => {
          if (item.type === "message") {
            const message = item.data;
            return (
              <StaggerItem key={message.id}>
                <PremiumChatMessage
                  message={message}
                  isUser={message.isUser}
                  streamingResponses={[]}
                  hasActiveResponses={false}
                  delay={index * 0.05}
                />
              </StaggerItem>
            );
          } else if (item.type === "responses") {
            const responseData = item.data;
            return (
              <StaggerItem key={`responses-${index}`}>
                <div className="mb-6">
                  <MultiResponseContainer
                    responses={responseData.responses}
                    timestamp={responseData.timestamp}
                    attachments={[]}
                    isLoading={responseData.hasActiveResponses}
                    loadingModelCount={
                      Array.from(responseData.loadingStates.values()).filter(Boolean).length
                    }
                  />
                </div>
              </StaggerItem>
            );
          }
          return null;
        })}
      </StaggerContainer>

      {isSubmitting && !hasActiveResponses && (
        <SlideUp className="mb-6 px-4">
          <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-xl p-4 max-w-xs shadow-lg border border-white/20 dark:border-neutral-700/50">
            <div className="flex items-center space-x-3 text-neutral-700 dark:text-neutral-300">
              <div className="relative">
                <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                <div className="absolute inset-0 animate-pulse w-4 h-4 border-2 border-purple-200 dark:border-purple-600 rounded-full"></div>
              </div>
              <span className="text-sm font-medium">
                AI is preparing responses...
              </span>
            </div>
          </div>
        </SlideUp>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatArea;
