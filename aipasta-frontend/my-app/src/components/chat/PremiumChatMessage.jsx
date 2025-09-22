"use client";

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IconRobot, IconUser, IconCopy, IconCheck, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { SlideUp, FadeIn, TypingAnimation, SkeletonLoader } from '../animations';

const PremiumChatMessage = memo(({ 
  message, 
  isUser, 
  streamingResponses, 
  hasActiveResponses,
  isStreaming = false,
  delay = 0
}) => {
  const [imageLoaded, setImageLoaded] = useState({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedStates, setCopiedStates] = useState({});

  const handleImageLoad = (fileId) => {
    setImageLoaded(prev => ({ ...prev, [fileId]: true }));
  };

  const handleCopy = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [messageId]: true }));
      setTimeout(() => {
        setCopiedStates(prev => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Handle streaming AI responses with enhanced animations
  if (!isUser && streamingResponses && streamingResponses.length > 0) {
    return (
      <SlideUp delay={delay} className="flex justify-start mb-6 px-4">
        <div className="max-w-[90%] w-full">
          <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-xl border border-white/20 dark:border-neutral-700/50 shadow-lg">
            {/* Enhanced multi-response container would go here */}
            <div className="p-4">
              {hasActiveResponses && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <IconRobot className="w-5 h-5" />
                    </motion.div>
                    <span className="text-sm font-medium">AI is thinking</span>
                  </div>
                  <TypingAnimation className="text-blue-600 dark:text-blue-400" />
                </div>
              )}
              {/* Response content would be rendered here */}
            </div>
          </div>
        </div>
      </SlideUp>
    );
  }

  // Determine if message content is long enough for collapse feature
  const isLongMessage = message.content && message.content.length > 500;
  const displayContent = isLongMessage && !isExpanded 
    ? message.content.substring(0, 500) + "..." 
    : message.content;

  return (
    <SlideUp 
      delay={delay} 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-4`}
    >
      <motion.div 
        className={`max-w-[95%] sm:max-w-[80%] rounded-xl shadow-sm border backdrop-blur-sm transition-all duration-300 group ${
          isUser 
            ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white border-purple-500/50 shadow-purple-200/50 dark:shadow-purple-900/30' 
            : 'bg-white/95 dark:bg-neutral-800/95 text-neutral-900 dark:text-neutral-100 border-gray-200/50 dark:border-neutral-700/50 hover:shadow-lg hover:bg-white dark:hover:bg-neutral-800'
        }`}
        whileHover={{ 
          y: -1,
          transition: { duration: 0.2 }
        }}
        layout
      >
        {/* Enhanced model label for AI responses */}
        {!isUser && message.model && (
          <motion.div 
            className="px-4 py-3 border-b border-neutral-200/50 dark:border-neutral-600/50 bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-neutral-700/80 dark:to-neutral-800/80 rounded-t-xl backdrop-blur-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: delay + 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <motion.div 
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <span className="font-display">{message.model.name}</span>
              </div>
              <motion.div 
                className="text-xs text-neutral-500 dark:text-neutral-400 bg-white/60 dark:bg-neutral-800/60 px-2 py-1 rounded-full backdrop-blur-sm border border-white/20 dark:border-neutral-700/20"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.15 }}
              >
                {message.model.provider}
              </motion.div>
            </div>
          </motion.div>
        )}
        
        <div className="p-5">
          {/* Enhanced text content with better typography */}
          {message.content && (
            <motion.div 
              className="leading-relaxed text-[15px] font-sans"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
              layout
            >
              {isStreaming ? (
                <div className="flex items-start gap-2">
                  <div className="flex-1">{displayContent}</div>
                  <TypingAnimation className={isUser ? "text-purple-200" : "text-blue-600 dark:text-blue-400"} />
                </div>
              ) : (
                displayContent
              )}
              
              {/* Expand/Collapse button for long messages */}
              <AnimatePresence>
                {isLongMessage && (
                  <motion.button
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`mt-3 flex items-center gap-1 text-sm transition-colors ${
                      isUser 
                        ? 'text-purple-200 hover:text-white' 
                        : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                    }`}
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.15 }}
                  >
                    {isExpanded ? (
                      <>
                        <IconChevronUp className="w-4 h-4" />
                        Show less
                      </>
                    ) : (
                      <>
                        <IconChevronDown className="w-4 h-4" />
                        Show more
                      </>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          
          {/* Enhanced attachments section */}
          <AnimatePresence>
            {message.attachments && message.attachments.length > 0 && (
              <motion.div 
                className="space-y-3 mt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: delay + 0.3 }}
              >
                {message.attachments.map((attachment, index) => {
                  if (attachment.type.startsWith('image/')) {
                    return (
                      <motion.div 
                        key={attachment.id} 
                        className="relative overflow-hidden rounded-lg group"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: delay + 0.3 + (index * 0.1) }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <img
                          src={attachment.url || attachment.preview}
                          alt={attachment.name}
                          className={`max-w-full rounded-lg transition-all duration-300 ${
                            imageLoaded[attachment.id] ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ maxHeight: '300px', objectFit: 'contain' }}
                          onLoad={() => handleImageLoad(attachment.id)}
                        />
                        {!imageLoaded[attachment.id] && (
                          <div className="absolute inset-0 flex items-center justify-center bg-neutral-200/80 dark:bg-neutral-600/80 rounded-lg backdrop-blur-sm">
                            <SkeletonLoader width="100%" height="200px" rounded="rounded-lg" />
                          </div>
                        )}
                        <motion.div 
                          className="text-xs opacity-75 mt-2 font-medium"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.75 }}
                          transition={{ delay: delay + 0.4 + (index * 0.1) }}
                        >
                          {attachment.name}
                        </motion.div>
                      </motion.div>
                    );
                  }
                  
                  // Audio and video attachments with enhanced styling
                  const isAudio = attachment.type.startsWith('audio/');
                  const isVideo = attachment.type.startsWith('video/');
                  
                  if (isAudio || isVideo) {
                    return (
                      <motion.div 
                        key={attachment.id} 
                        className="bg-black/5 dark:bg-white/5 rounded-lg p-4 backdrop-blur-sm border border-white/10 dark:border-neutral-700/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: delay + 0.3 + (index * 0.1) }}
                        whileHover={{ backgroundColor: "rgba(0,0,0,0.08)" }}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <motion.div
                            whileHover={{ rotate: 5 }}
                            transition={{ duration: 0.15 }}
                          >
                            {isAudio ? (
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                <IconRobot className="w-5 h-5 text-white" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                                <IconRobot className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </motion.div>
                          <div>
                            <span className="text-sm font-medium block">{attachment.name}</span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {isAudio ? 'Audio file' : 'Video file'}
                            </span>
                          </div>
                        </div>
                        {isAudio ? (
                          <audio 
                            controls 
                            className="w-full rounded-lg" 
                            style={{ maxWidth: '300px' }}
                            src={attachment.url || attachment.preview}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        ) : (
                          <video 
                            controls 
                            className="w-full rounded-lg shadow-sm"
                            style={{ maxWidth: '400px', maxHeight: '300px' }}
                            src={attachment.url || attachment.preview}
                          >
                            Your browser does not support the video element.
                          </video>
                        )}
                      </motion.div>
                    );
                  }
                  
                  // Other file types
                  return (
                    <motion.div 
                      key={attachment.id} 
                      className="flex items-center gap-3 bg-black/5 dark:bg-white/5 rounded-lg p-3 backdrop-blur-sm border border-white/10 dark:border-neutral-700/20 group cursor-pointer"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: delay + 0.3 + (index * 0.1) }}
                      whileHover={{ 
                        backgroundColor: "rgba(0,0,0,0.08)",
                        x: 5
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <IconRobot className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{attachment.name}</span>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Copy button for non-user messages */}
          {!isUser && message.content && (
            <motion.div 
              className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-200/30 dark:border-neutral-600/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.4 }}
            >
              <motion.button
                onClick={() => handleCopy(message.content, message.id)}
                className="flex items-center gap-2 text-xs sm:text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors px-3 py-2 sm:px-2 sm:py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 touch-target"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <AnimatePresence mode="wait">
                  {copiedStates[message.id] ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      className="flex items-center gap-1 text-green-600 dark:text-green-400"
                    >
                      <IconCheck className="w-3 h-3" />
                      Copied!
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="flex items-center gap-1"
                    >
                      <IconCopy className="w-3 h-3" />
                      Copy
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          )}
          
          {/* Enhanced token information */}
          <AnimatePresence>
            {(isUser && (message.totalTokens || message.tokens)) && (
              <motion.div 
                className={`text-xs mt-3 pt-2 border-t transition-colors ${
                  isUser 
                    ? 'text-purple-100/80 border-purple-400/30' 
                    : 'text-neutral-500 border-neutral-300/30 dark:border-neutral-600/30'
                }`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: delay + 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                  {message.totalTokens ? (
                    <span>
                      Tokens used: <span className="font-medium">{message.totalTokens}</span>
                      {message.modelCount && (
                        <> • <span className="font-medium">{message.modelCount}</span> models</>
                      )}
                    </span>
                  ) : (
                    <span>
                      Tokens used: <span className="font-medium">{message.tokens}</span>
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI response token information */}
          <AnimatePresence>
            {(!isUser && message.tokensUsed) && (
              <motion.div 
                className="text-xs mt-3 pt-2 border-t border-neutral-300/30 dark:border-neutral-600/30 text-neutral-500 dark:text-neutral-400"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: delay + 0.5 }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                  <span>
                    Tokens: <span className="font-medium">{message.tokensUsed}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Enhanced timestamp */}
          <AnimatePresence>
            {message.timestamp && (
              <motion.div 
                className={`text-xs mt-2 flex items-center gap-2 ${
                  isUser ? 'text-purple-100/70' : 'text-neutral-400 dark:text-neutral-500'
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.6 }}
              >
                <div className="w-1 h-1 rounded-full bg-current opacity-40" />
                <span className="font-medium">
                  {new Date(message.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </SlideUp>
  );
});

PremiumChatMessage.displayName = 'PremiumChatMessage';

export default PremiumChatMessage;