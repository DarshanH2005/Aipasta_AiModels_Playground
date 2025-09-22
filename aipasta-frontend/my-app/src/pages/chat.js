import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal, UserCreditsDisplay, MultiResponseContainer, ModelSelectionModal, SimpleUploadButton, PlaceholdersAndVanishInput } from '../features';
import { ToastProvider, useToast, SettingsModal, PlansModal, Sidebar, SidebarBody, SidebarLink, SidebarProvider, SidebarFooter } from '../shared';
import ThemeToggle from '../components/ui/working-theme-toggle';
import { IconBrain, IconRobot, IconSend, IconSettings, IconChevronDown, IconPhoto, IconMusic, IconCurrency, IconEye, IconVideo, IconFile, IconAlertTriangle, IconChevronUp, IconPinned, IconPin, IconTrash, IconLogout, IconMenu2, IconSun, IconMoon } from '@tabler/icons-react';
import { useStreamingResponses, streamModelResponse } from '../hooks/useStreamingResponses';
import { getChatSessions, createChatSession, getChatSession, sendChatMessage, deleteChatSession } from '../lib/api-client';
import { AI_MODELS, AI_CHAT_PLACEHOLDERS } from '../constants/models';
import { calculateTokensNeeded, hasSufficientTokens, getTokenRequirements } from '../utils/tokens';

// Optimized chat message component for streaming responses
const ChatMessage = ({ message, isUser, streamingResponses, hasActiveResponses }) => {
  const [imageLoaded, setImageLoaded] = useState({});
  
  const handleImageLoad = (fileId) => {
    setImageLoaded(prev => ({ ...prev, [fileId]: true }));
  };

  // Handle streaming AI responses
  if (!isUser && streamingResponses && streamingResponses.length > 0) {
    return (
      <div className="flex justify-start mb-6 px-4">
        <div className="max-w-[90%] w-full">
          <MultiResponseContainer
            responses={streamingResponses}
            timestamp={message.timestamp}
            attachments={message.attachments}
            isLoading={hasActiveResponses}
            loadingModelCount={hasActiveResponses ? streamingResponses.filter(r => !r.isComplete).length : 0}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-4`}>
      <div className={`max-w-[80%] rounded-xl shadow-sm border transition-all duration-200 ${
        isUser 
          ? 'bg-purple-600 text-white border-purple-500 shadow-purple-200 dark:shadow-purple-900/20' 
          : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border-gray-200 dark:border-neutral-700 hover:shadow-md'
      }`}>
        {/* Model label for AI responses */}
        {!isUser && message.model && (
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-600 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-neutral-700 dark:to-neutral-800 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {message.model.name}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 px-2 py-1 rounded-full">
                {message.model.provider}
              </div>
            </div>
          </div>
        )}
        
        <div className="p-5">
          {/* Text content */}
          {message.content && (
            <div className="leading-relaxed text-[15px]">{message.content}</div>
          )}
          
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-2 mt-2">
              {message.attachments.map((attachment) => {
                if (attachment.type.startsWith('image/')) {
                  return (
                    <div key={attachment.id} className="relative">
                      <img
                        src={attachment.url || attachment.preview}
                        alt={attachment.name}
                        className={`max-w-full rounded transition-opacity duration-200 ${
                          imageLoaded[attachment.id] ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ maxHeight: '300px', objectFit: 'contain' }}
                        onLoad={() => handleImageLoad(attachment.id)}
                      />
                      {!imageLoaded[attachment.id] && (
                        <div className="absolute inset-0 flex items-center justify-center bg-neutral-200 dark:bg-neutral-600 rounded">
                          <div className="animate-spin w-6 h-6 border-2 border-neutral-400 border-t-neutral-600 rounded-full"></div>
                        </div>
                      )}
                      <div className="text-xs opacity-75 mt-1">{attachment.name}</div>
                    </div>
                  );
                }
                
                if (attachment.type.startsWith('audio/')) {
                  return (
                    <div key={attachment.id} className="bg-black/10 dark:bg-white/10 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <IconMusic className="w-4 h-4" />
                        <span className="text-sm font-medium">{attachment.name}</span>
                      </div>
                      <audio 
                        controls 
                        className="w-full" 
                        style={{ maxWidth: '300px' }}
                        src={attachment.url || attachment.preview}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  );
                }
                
                if (attachment.type.startsWith('video/')) {
                  return (
                    <div key={attachment.id} className="bg-black/10 dark:bg-white/10 rounded p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <IconVideo className="w-4 h-4" />
                        <span className="text-sm font-medium">{attachment.name}</span>
                      </div>
                      <video 
                        controls 
                        className="w-full rounded"
                        style={{ maxWidth: '400px', maxHeight: '300px' }}
                        src={attachment.url || attachment.preview}
                      >
                        Your browser does not support the video element.
                      </video>
                    </div>
                  );
                }
                
                // Fallback for other file types
                return (
                  <div key={attachment.id} className="flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded p-2">
                    <IconFile className="w-4 h-4" />
                    <span className="text-sm">{attachment.name}</span>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Token information for user messages */}
          {isUser && (message.totalTokens || message.tokens) && (
            <div className={`text-xs mt-2 pt-2 border-t ${
              isUser 
                ? 'text-purple-100 border-purple-400' 
                : 'text-neutral-500 border-neutral-300 dark:border-neutral-600'
            }`}>
              {message.totalTokens ? (
                <div>
                  Tokens used: {message.totalTokens} 
                  {message.modelCount && ` • ${message.modelCount} models`}
                </div>
              ) : (
                <div>
                  Tokens used: {message.tokens}
                </div>
              )}
            </div>
          )}
          
          {/* Token information for AI responses */}
          {!isUser && message.tokensUsed && (
            <div className="text-xs mt-2 pt-2 border-t border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
              Tokens: {message.tokensUsed}
            </div>
          )}
          
          {/* Timestamp */}
          {message.timestamp && (
            <div className={`text-xs mt-1 ${isUser ? 'text-purple-100' : 'text-neutral-500'}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function ChatPageContent({ open, setOpen, locked, setLocked, hasFirstMessageSent, setHasFirstMessageSent, showPlansModal, setShowPlansModal }) {
  // Toast notifications
  const toast = useToast();
  const [models, setModels] = useState([]); // Available models from backend
  const [modelsLoading, setModelsLoading] = useState(false); // Fixed: Start with false, not true
  const [hasLoadedModels, setHasLoadedModels] = useState(false); // Track if models have been loaded
  const modelsLoadAttempted = useRef(false); // Track if we've attempted to load models
  const [selectedModels, setSelectedModels] = useState([]); // Array of selected models
  const [chatSessions, setChatSessions] = useState([]); // Chat history from backend
  const [chatSessionsLoading, setChatSessionsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null); // Current active session
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [tokenBreakdown, setTokenBreakdown] = useState({ input: 0, output: 0 });

  // Helper to derive a coarse token cost per model and memoized total for UI
  const getModelTokenCost = (model) => {
    if (!model) return 10; // unknown model -> conservative cost
    const pricing = model.pricing || {};
    const hasPricing = typeof pricing.input !== 'undefined' || typeof pricing.output !== 'undefined' || typeof pricing.image !== 'undefined';
    if (hasPricing) {
      const input = typeof pricing.input === 'number' ? pricing.input : 0;
      const output = typeof pricing.output === 'number' ? pricing.output : 0;
      if (input === 0 && output === 0) return 1;
      return 10;
    }
    if (model.isPaid === true || model.paid === true) return 10;
    if (model.free === true) return 1;
    return 10;
  };

  const tokensNeeded = useMemo(() => selectedModels.reduce((total, model) => total + getModelTokenCost(model), 0), [selectedModels]);
  const [showModelModal, setShowModelModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [walletTokens, setWalletTokens] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState(null); // Add missing error state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [backendStatus, setBackendStatus] = useState({
    isOnline: true,
    lastChecked: null,
    errorCount: 0
  }); // Backend connectivity status

  // Auth context
  const { user, credits, isAuthenticated, deductCredits, updateCredits, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Use optimized streaming responses hook
  const {
    allResponses,
    loadingStates,
    initializeResponse,
    updateResponse,
    setResponseError,
    clearResponses,
    hasActiveResponses,
    totalResponses
  } = useStreamingResponses();

  // Create a combined conversation flow that maintains proper user->AI->user->AI sequence like ChatGPT
  const conversationFlow = useMemo(() => {
    const flow = [];
    
    // Group messages into conversation turns (user message followed by AI responses)
    const conversationTurns = [];
    let currentTurn = null;
    
    // Sort all messages chronologically first
    const sortedMessages = [...messages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sortedMessages.forEach((message) => {
      if (message.isUser) {
        // Start a new conversation turn
        currentTurn = {
          userMessage: message,
          aiResponses: [],
          timestamp: new Date(message.timestamp).getTime()
        };
        conversationTurns.push(currentTurn);
      } else if (currentTurn) {
        // Add AI response to current turn
        currentTurn.aiResponses.push(message);
      }
    });
    
    // Convert conversation turns into flow items
    conversationTurns.forEach((turn) => {
      // Add user message
      flow.push({
        type: 'message',
        data: turn.userMessage,
        timestamp: turn.timestamp
      });
      
      // Add AI responses immediately after the user message
      if (turn.aiResponses.length > 0) {
        if (turn.aiResponses.length > 1) {
          // Multiple AI responses - use multi-response container
          flow.push({
            type: 'responses',
            data: {
              responses: turn.aiResponses.map(msg => ({
                id: msg.id,
                content: msg.content,
                model: msg.model?.name || 'Unknown',
                provider: msg.model?.provider || 'Unknown',
                timestamp: msg.timestamp,
                isComplete: true,
                cost: msg.cost,
                error: msg.error
              })),
              timestamp: turn.aiResponses[0].timestamp,
              hasActiveResponses: false,
              loadingStates: new Map()
            },
            timestamp: turn.timestamp + 1 // Ensure AI responses come right after user message
          });
        } else {
          // Single AI response - use individual message
          flow.push({
            type: 'message',
            data: turn.aiResponses[0],
            timestamp: turn.timestamp + 1 // Ensure AI response comes right after user message
          });
        }
      }
    });
    
    // Add current streaming/completed responses for the latest exchange
    if (allResponses.length > 0) {
      // Find the last user message to attach responses to
      const lastUserMessage = messages.filter(m => m.isUser).pop();
      const baseTimestamp = lastUserMessage ? new Date(lastUserMessage.timestamp).getTime() + 1 : Date.now();
      
      flow.push({
        type: 'responses',
        data: {
          responses: allResponses,
          timestamp: new Date(baseTimestamp).toISOString(),
          hasActiveResponses,
          loadingStates
        },
        timestamp: baseTimestamp
      });
    }
    
    // Sort by timestamp to maintain proper conversation flow
    return flow.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, allResponses, hasActiveResponses, loadingStates]);

  // Convert completed responses to permanent messages
  const saveCompletedResponses = useCallback(() => {
    const completedResponses = allResponses.filter(response => response.isComplete);
    
    if (completedResponses.length === 0) return;

    // Create response messages but preserve multi-response structure
    // Build messages with stable ids based on the response.id to allow reliable dedupe
    const responseMessages = completedResponses.map(response => ({
      id: `ai_${response.id}`,
      content: response.content,
      isUser: false,
      timestamp: response.timestamp || new Date().toISOString(),
      model: {
        name: response.model,
        provider: response.provider
      },
      cost: response.cost,
      error: response.error
    }));

    // Clear streaming responses first so the UI doesn't show both streaming blobs and saved messages
    clearResponses();

    // Add response messages to the main messages array, deduping by id (preferred) or content as fallback
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const filtered = prev.filter(msg => !responseMessages.some(rm => (rm.id && rm.id === msg.id)));

      // Append only messages that are not already present (by id); fallback: avoid exact-content duplicates
      const toAdd = responseMessages.filter(rm => !existingIds.has(rm.id));
      const merged = [...filtered, ...toAdd].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return merged;
    });
  }, [allResponses, clearResponses]);

  // Auto-save completed responses when all streaming finishes
  useEffect(() => {
    if (allResponses.length > 0 && !hasActiveResponses) {
      // All responses are complete, save them
      const timer = setTimeout(() => {
        saveCompletedResponses();
      }, 1000); // Small delay to ensure UI updates are complete

      return () => clearTimeout(timer);
    }
  }, [allResponses, hasActiveResponses, saveCompletedResponses]);

  // Set client-side flag after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  const loadModels = useCallback(async () => {
    // Prevent multiple loads - only load once
    if (modelsLoading) {
      console.log('🔄 Models already loading, skipping...');
      return;
    }

    try {
      setModelsLoading(true);
      
      // Load models from backend API instead of direct OpenRouter to avoid redundant calls
      console.log('🔄 Loading models from backend API...');
      
      // Import the fetchModels function from api-client
      const { fetchModels } = await import('../lib/api-client');
      
      console.log('🔄 Calling fetchModels...');
      const response = await fetchModels();
      console.log('✅ fetchModels response:', response);
      
      // Extract models array from the response
      const models = response.models || [];
      console.log('📦 Extracted models count:', models.length);
      
      setModels(models);
      const loadedCount = models.length;
      
      // Set a good default model if none selected
      if (selectedModels.length === 0 && models.length > 0) {
        // Priority list of preferred free models (best quality free models)
        const preferredFreeModels = [
          'meta-llama/llama-3.1-405b-instruct:free', // Excellent large model
          'deepseek/deepseek-r1:free',                // Great reasoning model  
          'deepseek/deepseek-chat-v3.1:free',         // Latest DeepSeek chat model
          'cognitivecomputations/dolphin3.0-mistral-24b:free', // Good quality, uncensored
          'deepseek/deepseek-r1-distill-llama-70b:free',       // Distilled large model
          'arliai/qwq-32b-arliai-rpr-v1:free'        // Good quality reasoning
        ];
        
        // Try to find a preferred model, or fall back to any free model
        let defaultModel = null;
        
        // First, try preferred free models
        for (const preferredId of preferredFreeModels) {
          defaultModel = models.find(model => model.id === preferredId);
          if (defaultModel) break;
        }
        
        // If no preferred model found, find any free model
        if (!defaultModel) {
          defaultModel = models.find(model => 
            model.pricing && 
            (model.pricing.input === 0 || model.pricing.input === null) &&
            model.id && 
            typeof model.id === 'string' && 
            model.id.length >= 3
          );
        }
        
        // Final fallback to first available model
        if (!defaultModel) {
          defaultModel = models.find(model => 
            model.id && 
            typeof model.id === 'string' && 
            model.id.length >= 3
          );
        }
        
        if (defaultModel) {
          setSelectedModels([defaultModel]);
          console.log('🎯 Set default model:', defaultModel.name || defaultModel.id, 
                     `(${defaultModel.pricing?.input === 0 ? 'FREE' : 'PAID'})`);
        } else {
          console.error('No valid models found for default selection');
        }
      }
      
      console.log(`✅ Loaded ${loadedCount} models from backend API`);
      toast.success(`Connected to Backend - ${loadedCount} models loaded`);
      setHasLoadedModels(true); // Mark models as loaded
    } catch (error) {
      console.error('❌ Error loading models from backend:', error);
      toast.error('Failed to load AI models: ' + error.message);
      setError('Failed to load AI models: ' + error.message);
    } finally {
      setModelsLoading(false);
    }
  }, [toast, modelsLoading]);

  const checkAuthAndLoadModels = useCallback(async () => {
    console.log('✅ User authenticated, loading models directly from OpenRouter');
    try {
      await loadModels();
      console.log('✅ Models loaded successfully - ready for live chat');
    } catch (error) {
      console.error('❌ Error in checkAuthAndLoadModels:', error);
      toast.error('Failed to initialize: ' + error.message);
      setError('Failed to initialize: ' + error.message);
    }
  }, [loadModels, toast]);

  // Check authentication and load models when user state changes
  useEffect(() => {
    if (isClient && !authLoading && user && !modelsLoadAttempted.current) {
      // Only call checkAuthAndLoadModels once when user is authenticated
      modelsLoadAttempted.current = true;
      checkAuthAndLoadModels();
    } else if (isClient && !authLoading && !user) {
      // Clear models and data when user is not authenticated
      setModels([]);
      setError(null);
      setHasLoadedModels(false); // Reset loaded flag so models can be loaded for next user
      modelsLoadAttempted.current = false; // Reset load attempt flag
      console.log('❌ User not authenticated, clearing models');
    }
  }, [user, isClient, authLoading, checkAuthAndLoadModels]);

  // Helper function to update backend status with change detection
  const updateBackendStatus = useCallback((isOnline, error = null) => {
    setBackendStatus(prev => {
      // Only update if status actually changed
      if (prev.isOnline === isOnline) {
        return {
          ...prev,
          lastChecked: new Date(),
          // Only increment error count if still offline
          errorCount: isOnline ? 0 : prev.errorCount
        };
      }
      
      // Status changed - create new state
      return {
        isOnline,
        lastChecked: new Date(),
        errorCount: isOnline ? 0 : prev.errorCount + 1
      };
    });
    
    if (!isOnline && error) {
      console.warn('Backend connectivity issue:', error);
    }
  }, []);

  // Fetch chat sessions from backend only when authenticated
  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      // Skip loading chat sessions if not authenticated or still loading auth
      setChatSessionsLoading(false);
      return;
    }

    const loadChatSessions = async () => {
      try {
        setChatSessionsLoading(true);
        const sessions = await getChatSessions(); // getChatSessions doesn't take parameters
        setChatSessions(sessions || []);
        updateBackendStatus(true); // Backend is working
        console.log(`Loaded ${sessions?.length || 0} chat sessions`);
      } catch (error) {
        console.error('Failed to fetch chat sessions:', error);
        updateBackendStatus(false, error); // Backend is failing
        
        // Show user-friendly offline message
        if (error.status === 500) {
          toast.error('Backend server error - working in offline mode');
        } else if (!error.status) {
          toast.error('Backend unavailable - working in offline mode');
        } else {
          toast.warning('Could not load chat history from server - working offline');
        }
        
        setChatSessions([]); // Empty array on error
      } finally {
        setChatSessionsLoading(false);
      }
    };

    loadChatSessions();
  }, [isAuthenticated, authLoading, updateBackendStatus, toast]);

  // Handle deleting chat sessions
  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteChatSession(sessionId);
      setChatSessions(prev => prev.filter(session => session._id !== sessionId));
      
      // If we deleted the current session, clear the chat
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      
      toast.success('Chat deleted successfully');
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      toast.error('Failed to delete chat. Please try again.');
    }
  };

  // Auto scroll to bottom when new messages are added (throttled)
  const scrollToBottom = useRef(null);
  useEffect(() => {
    if (scrollToBottom.current) {
      clearTimeout(scrollToBottom.current);
    }
    scrollToBottom.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    return () => {
      if (scrollToBottom.current) {
        clearTimeout(scrollToBottom.current);
      }
    };
  }, [messages, totalResponses]);

  // Enhanced message sending with session management and direct OpenRouter
  const sendMessage = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || selectedModels.length === 0 || isSubmitting) return;

    // Check authentication
    if (!isAuthenticated) {
      toast.warning('Please login to send messages');
      setShowAuthModal(true);
      return;
    }

    // Check credits before sending
    if (credits <= 0) {
      toast.error('No credits left. Please upgrade.');
      return;
    }

    // Calculate tokens needed based on selected models
      // NOTE: use a helper so we can handle missing pricing metadata robustly
      const getModelTokenCost = (model) => {
        if (!model) return 10; // unknown model -> conservative cost
        const pricing = model.pricing || {};
        const hasPricing = typeof pricing.input !== 'undefined' || typeof pricing.output !== 'undefined' || typeof pricing.image !== 'undefined';
        if (hasPricing) {
          const input = typeof pricing.input === 'number' ? pricing.input : 0;
          const output = typeof pricing.output === 'number' ? pricing.output : 0;
          // If both input and output pricing are zero, treat as free (low cost)
          if (input === 0 && output === 0) return 1;
          return 10; // paid model - coarse bucket (10 tokens)
        }

        // If model explicitly marks paid/free use that
        if (model.isPaid === true || model.paid === true) return 10;
        if (model.free === true) return 1;

        // Fallback: if we can't determine pricing, assume paid (conservative)
        return 10;
      };

      const tokensNeeded = selectedModels.reduce((total, model) => total + getModelTokenCost(model), 0);
    
    if (tokensNeeded > credits) {
      toast.error(`Not enough credits. Need ${tokensNeeded} credits, but you only have ${credits}.`);
      return;
    }

  setIsSubmitting(true);
  // reset token usage for this request
  setTokensUsed(0);
  setTokenBreakdown({ input: 0, output: 0 });

    // Create model requests from selected models
    const modelRequests = selectedModels.map(model => ({
      model,
      cost: { totalCost: model.pricing?.input > 0 ? 10 : 1 } // Token cost
    }));
    
    // Check if we have any valid models to process
    if (modelRequests.length === 0) {
      toast.error('No valid models selected. Please select models with proper IDs.');
      setIsSubmitting(false);
      return;
    }

    // Ensure we have a chat session
    let sessionId = currentSessionId;
    if (!sessionId) {
      const title = selectedModels.length > 0 
        ? `Chat with ${selectedModels[0].name}` 
        : 'New Chat';
      const firstModelId = selectedModels.length > 0 ? selectedModels[0].id : null;
      
      try {
        const sessionResult = await createChatSession(null, title, firstModelId);
        
        if (sessionResult?.success && sessionResult.session) {
          sessionId = sessionResult.session.id || sessionResult.session._id;
          setCurrentSessionId(sessionId);
          setChatSessions(prev => [sessionResult.session, ...prev]);
          console.log('Created new session for message sending');
        } else {
          console.log('Failed to create session, continuing without session storage');
        }
      } catch (error) {
        console.warn('Session creation failed:', error);
        toast.warning('Session creation failed, messages may not be saved');
      }
    }

    const currentInput = inputValue;
    const currentFiles = attachedFiles;

    // Add user message to state immediately
    const userMessage = {
      id: `msg-${Date.now()}`,
      content: currentInput,
      isUser: true,
      timestamp: new Date().toISOString(),
      files: currentFiles
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachedFiles([]);

    // Start streaming responses from all models in parallel
    const streamPromises = selectedModels.map(async (model, index) => {
      const responseId = `response-${Date.now()}-${index}`;
      
        try {
        // Initialize response immediately
        initializeResponse(responseId, {
          model: `${model.provider}/${model.name}`,
          provider: model.provider,
          tokens: model.pricing?.input > 0 ? 10 : 1 // Token cost instead of cost
        });

        // Use backend API through streamModelResponse (no direct OpenRouter calls)
        try {
          await streamModelResponse(
            model, 
            currentInput, 
            currentFiles, 
            (chunk, isComplete) => {
              updateResponse(responseId, chunk, isComplete);
            },
            (finalResponse) => {
              console.log(`✅ Backend API response from ${model.name} completed`);
              // The final chunk is already passed via onChunk with isLastChunk=true,
              // so we avoid calling updateResponse again here to prevent double-appending
              // a trailing empty chunk which could race with the last chunk and
              // produce duplicated text.

              // Extract token usage if available and accumulate
              try {
                const maybe = finalResponse?.data || finalResponse || {};
                const usage = maybe.aiMessage?.usage || maybe.usage || maybe.data?.usage || null;
                const inputTokens = usage?.prompt_tokens || usage?.input_tokens || 0;
                const outputTokens = usage?.completion_tokens || usage?.output_tokens || 0;
                const totalTokensUsed = (inputTokens || 0) + (outputTokens || 0);
                if (totalTokensUsed > 0) {
                  setTokensUsed(prev => prev + totalTokensUsed);
                  setTokenBreakdown(prev => ({ input: prev.input + inputTokens, output: prev.output + outputTokens }));
                }
              } catch (uErr) {
                // ignore
              }

              toast.success(`Got response from ${model.name} successfully`);
            },
            (error) => {
              console.error(`❌ Error from ${model.name}:`, error);
              // Ensure the response is marked complete so loading stops
              try { updateResponse(responseId, '', true); } catch (e) {}
              setResponseError(responseId, error);
              // Normalize error message access (error may be plain object or Error)
              const msg = error?.message || error?.messageText || error?.msg || (typeof error === 'string' ? error : JSON.stringify(error));
              toast.error(`Failed to get response from ${model.name}: ${msg}`);
              // If the error contains usage info (some backends may return partial usage), apply it
              try {
                const maybeUsage = error?.raw?.data?.usage || error?.raw?.usage || error?.usage || null;
                const inT = maybeUsage?.prompt_tokens || 0;
                const outT = maybeUsage?.completion_tokens || 0;
                const t = (inT || 0) + (outT || 0);
                if (t > 0) {
                  setTokensUsed(prev => prev + t);
                  setTokenBreakdown(prev => ({ input: prev.input + inT, output: prev.output + outT }));
                }
              } catch (uErr) {
                // ignore
              }
            },
            sessionId,
            false // Use backend, not local session
          );
        } catch (streamError) {
          // Additional safety net: catch any throws that escape from streamModelResponse
          console.error(`❌ Unexpected throw from streamModelResponse for ${model.name}:`, streamError);
          setResponseError(responseId, streamError);
          toast.error(`Failed to get response from ${model.name}: ${streamError.message || streamError}`);
        }
      } catch (outerError) {
        console.error(`Outer error for ${model.name}:`, outerError);
        const responseId = `response-${Date.now()}-${selectedModels.indexOf(model)}`;
        updateResponse(responseId, `Error: ${outerError.message}`, true, true);
      }
    });

    try {
      // Use Promise.allSettled to prevent Next.js error overlay from appearing
      // when individual model responses fail (they're handled in their own try/catch)
      const results = await Promise.allSettled(streamPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        toast.success(`${successful} response${successful === 1 ? '' : 's'} completed${failed > 0 ? ` (${failed} failed)` : ''}`);
      } else if (failed > 0) {
        toast.error('All responses failed');
      }
    } catch (error) {
      console.error('Unexpected error in streaming promises:', error);
      toast.error('Unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-resize textarea

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  // Enhanced new chat with session creation and backend storage
  const handleNewChat = async () => {
    const title = selectedModels.length > 0 
      ? `Chat with ${selectedModels[0].name}` 
      : 'New Chat';
    
    // Clear current conversation state for fresh start
    setMessages([]);
    clearResponses();
    setInputValue('');
    setAttachedFiles([]);
    setError(null);
    
    try {
      // Create new chat session via backend
      const newSession = await createChatSession(null, title, null);
      
      if (newSession?.success && newSession.session) {
        const session = newSession.session;
        const sessionId = session._id || session.id;
        
        setCurrentSessionId(sessionId);
        setChatSessions(prev => [session, ...prev]);
        
        toast.success('New chat session created');
        console.log('Created new chat session:', sessionId);
      } else {
        throw new Error('Failed to create session');
      }
    } catch (error) {
      console.warn('Backend session creation failed:', error);
      toast.warning('Session creation failed, messages may not be saved');
    }
  };

  // Load chat session and messages from backend
  const handleLoadChat = async (sessionId) => {
    console.log(`🔄 Loading chat for session: ${sessionId}`);
    
    if (!sessionId) {
      console.warn('Cannot load chat: sessionId is required');
      toast.error('Invalid session ID');
      return;
    }

    // Switch session ID first for immediate UI feedback
    setCurrentSessionId(sessionId);
    setMessages([]); // Clear current messages
    clearResponses(); // Clear existing responses
    setError(null); // Clear any previous errors
    
    try {
      // Fetch session details and messages from backend
      const sessionData = await getChatSession(sessionId);
      console.log('📨 Session data received:', sessionData);
      
      if (sessionData?.session && sessionData?.messages) {
        // Convert backend messages to frontend format
        const formattedMessages = sessionData.messages.map(msg => ({
          id: msg._id || msg.id,
          content: msg.content,
          isUser: msg.role === 'user',
          timestamp: msg.createdAt || msg.timestamp,
          model: msg.role !== 'user' && msg.model ? {
            name: msg.model.name || 'AI Assistant',
            provider: msg.model.provider || 'Unknown'
          } : undefined
        }));
        
        // Sort messages chronologically
        const sortedMessages = formattedMessages.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        setMessages(sortedMessages);
        console.log(`Loaded ${sortedMessages.length} messages for session ${sessionId}`);
        toast.info(`Loaded conversation with ${sortedMessages.length} messages`);
      } else {
        console.warn('No messages found for session:', sessionId);
        toast.info('No messages found in this conversation');
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
      toast.error('Failed to load chat session: ' + error.message);
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue]);

  // Backend health check - periodic monitoring with stable interval
  useEffect(() => {
    let interval = null;
    let isActive = true;

    const checkBackendHealth = async () => {
      // Don't run if component is unmounted
      if (!isActive) return;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        // Build the correct backend health URL
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
        let healthUrl;
        
        if (API_BASE) {
          // Use the actual backend health endpoint
          healthUrl = `${API_BASE}/health`;
        } else {
          // Fallback to local health endpoint (this might not work correctly)
          healthUrl = '/api/health';
        }
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Only update status if component is still active
        if (isActive) {
          if (response.ok) {
            updateBackendStatus(true);
          } else {
            updateBackendStatus(false, `Backend returned ${response.status}`);
          }
        }
      } catch (error) {
        // Only update status if component is still active
        if (isActive) {
          if (error.name === 'AbortError') {
            updateBackendStatus(false, 'Backend timeout');
          } else {
            updateBackendStatus(false, error.message);
          }
        }
      }
    };

    // Check immediately on component mount
    checkBackendHealth();
    
    // Then check every 30 seconds
    interval = setInterval(checkBackendHealth, 30000);
    
    return () => {
      isActive = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [updateBackendStatus]); // Include updateBackendStatus dependency

  // Sidebar links - conditionally include admin link for admin users
  const sidebarLinks = [
    // Add admin link if user has admin role
    ...(user?.role === 'admin' ? [{
      label: 'Admin Panel',
      href: '/admin',
      icon: IconSettings
    }] : [])
  ];

  return (
    <>
      <Head>
        <title>AI Pasta - Chat</title>
        <meta name="description" content="Chat with AI models through AI Pasta" />
      </Head>

      {/* Model Selection Modal */}
      <ModelSelectionModal
        isOpen={showModelModal}
        onClose={() => setShowModelModal(false)}
        models={models}
        selectedModels={selectedModels}
        onModelsChange={setSelectedModels}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />

      {/* Sidebar + Chat Layout */}
      <div className="h-screen flex bg-gray-50 dark:bg-neutral-950 p-2 gap-2">
        <Sidebar open={open} setOpen={setOpen} animate={true} locked={locked} setLocked={setLocked}>
          <SidebarBody className="flex flex-col gap-2 h-full bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 p-4">
            <div className="flex flex-col space-y-2 flex-shrink-0">
              {/* Logo Card */}
              <div className={`flex items-center ${!(open || locked) ? 'justify-center p-2' : 'justify-between p-3'} bg-gray-50 dark:bg-neutral-800 rounded-lg shadow-sm`}>
                {!(open || locked) ? (
                  // Collapsed state - just logo centered
                  <div className="text-2xl">🍝</div>
                ) : (
                  // Expanded state - logo + text + controls
                  <>
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">🍝</div>
                      <div className="font-bold text-xl text-neutral-800 dark:text-neutral-100 whitespace-nowrap overflow-hidden">
                        AI Pasta
                      </div>
                    </div>
                    {/* Pin Toggle */}
                    <button
                      onClick={() => {
                        const newLocked = !locked;
                        setLocked(newLocked);
                        if (newLocked) {
                          // When pinning, force sidebar open
                          setOpen(true);
                        }
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        locked 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                          : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-200'
                      }`}
                      title={locked ? "Unpin sidebar" : "Pin sidebar open"}
                    >
                      {locked ? <IconPinned className="h-4 w-4" /> : <IconPin className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </div>





              {/* Status Card */}
              <div className={`bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 ${!(open || locked) ? 'p-2' : 'p-3'}`}>
                <div className={`w-full flex items-center justify-center ${!(open || locked) ? 'p-1' : 'p-2'} rounded-lg ${
                  backendStatus.isOnline 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      backendStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                    } ${!(open || locked) ? 'animate-pulse' : 'mr-2'}`}
                    title={backendStatus.isOnline ? 'Backend Online' : 'Backend Offline'}
                  />
                  {(open || locked) && (
                    <span className="text-xs font-medium">
                      {backendStatus.isOnline ? 'Backend Online' : 'Offline Mode'}
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                {sidebarLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    className={`flex items-center ${!(open || locked) ? 'p-1 justify-center' : 'p-2'} rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors`}
                  >
                    <link.icon className="w-5 h-5" />
                    {(open || locked) && (
                      <span className="ml-3 text-sm font-medium whitespace-nowrap">
                        {link.label}
                      </span>
                    )}
                  </a>
                ))}
              </div>

            </div>

            {/* Chat History Card - Only show when open or locked */}
            {(open || locked) && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3 min-w-0 flex-shrink-0">
                  <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider truncate">
                    Recent Chats
                  </div>
                  <button
                    onClick={handleNewChat}
                    className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium px-2 py-1 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex-shrink-0"
                  >
                    New Chat
                  </button>
                </div>
                
                <div className="overflow-hidden rounded-lg bg-gray-50 dark:bg-neutral-700 p-2 min-w-0 flex-1 flex flex-col relative">
                  {chatSessionsLoading ? (
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 p-3 text-center">
                      Loading chats...
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 p-3 text-center">
                      No chat history yet
                    </div>
                  ) : (
                    <>
                      <div className="space-y-0.5 flex-1 overflow-y-auto overflow-x-hidden scrollbar-custom min-w-0">
                      {chatSessions.map((session) => (
                        <div
                          key={session._id}
                          className={`grid grid-cols-[1fr_auto] items-center group rounded-lg transition-all shadow-sm min-w-0 ${
                            currentSessionId === session._id
                              ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800'
                              : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-transparent hover:border-gray-200 dark:hover:border-neutral-700'
                          }`}
                        >
                          <button
                            onClick={() => handleLoadChat(session._id)}
                            className="text-left p-2 text-xs transition-colors min-w-0 w-full"
                          >
                            <div className={`font-medium truncate min-w-0 text-xs ${
                              currentSessionId === session._id
                                ? 'text-purple-700 dark:text-purple-300'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}>
                              {session.title}
                              {session.isLocal && (
                                <span className="text-orange-500 text-xs ml-1" title="Local session">●</span>
                              )}
                            </div>
                            <div className="text-neutral-400 dark:text-neutral-500 mt-0.5 truncate text-xs opacity-75">
                              {new Date(session.createdAt).toLocaleDateString()}
                              {session.isLocal && <span className="ml-1 text-orange-400">(Local)</span>}
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session._id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                            title="Delete chat"
                          >
                            <IconTrash className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      </div>
                      {/* Subtle fade indicator for scrollable content */}
                      {chatSessions.length > 8 && (
                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-50 dark:from-neutral-700 to-transparent pointer-events-none rounded-b-lg"></div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
              {/* Sidebar footer - only show when expanded */}
              {(open || locked) && (
                <SidebarFooter className="px-0">
                  {/* Combined Theme & Logout Container - matches Recent Chats styling */}
                  <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-3 space-y-2">
                    {/* Theme Toggle */}
                    <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors">
                      <ThemeToggle size="sm" />
                      <span className="ml-3 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                        Theme
                      </span>
                    </div>
                    {/* Logout Button */}
                    <button
                      onClick={async () => {
                        await logout();
                        // Intentionally do not redirect after logout
                      }}
                      className="w-full flex items-center p-2 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <IconLogout className="w-5 h-5" />
                      <span className="ml-3 text-sm font-medium">Logout</span>
                    </button>
                  </div>
                </SidebarFooter>
              )}
          </SidebarBody>
        </Sidebar>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-white to-gray-50 dark:from-neutral-800 dark:to-neutral-700 border-b border-neutral-200 dark:border-neutral-700 p-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedModels.length === 0 && 'Select AI Models'}
                  {selectedModels.length === 1 && `Chat with ${selectedModels[0].name}`}
                  {selectedModels.length > 1 && `Multi-Model Chat (${selectedModels.length} models)`}
                </h1>
                {selectedModels.length > 0 && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {selectedModels.length === 1 
                      ? `Provider: ${selectedModels[0].provider}`
                      : `Providers: ${[...new Set(selectedModels.map(m => m.provider))].join(', ')}`
                    }
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Model Selection Button */}
                <button
                  onClick={() => setShowModelModal(true)}
                  disabled={modelsLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-sm"
                >
                  <IconBrain className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {modelsLoading && 'Loading Models...'}
                    {!modelsLoading && selectedModels.length === 0 && 'Select Models'}
                    {!modelsLoading && selectedModels.length === 1 && 'Change Model'}
                    {!modelsLoading && selectedModels.length > 1 && `${selectedModels.length} Selected`}
                  </span>
                </button>
                {/* Settings modal trigger in header */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3 py-2 bg-white dark:bg-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors border border-gray-200 dark:border-neutral-600 shadow-sm"
                  title="Settings"
                >
                  <IconSettings className="w-5 h-5" />
                </button>
              </div>
              {/* Header Logout Button - always accessible */}
              <button
                onClick={async () => {
                  await logout();
                  // Intentionally do not redirect after logout
                }}
                title="Logout"
                className="ml-3 p-2 rounded-md bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <IconLogout className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
              </button>
            </div>
            
            {/* Selected Models Display */}
            {selectedModels.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedModels.map(model => (
                  <span
                    key={model.id}
                    className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                  >
                    {model.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto scrollbar-custom py-6 chat-window bg-gray-50 dark:bg-neutral-800">
            {messages.length === 0 && (
              <div className="text-center text-neutral-500 dark:text-neutral-400 py-16 px-4">
                <div className="bg-white dark:bg-neutral-800 rounded-2xl p-8 max-w-md mx-auto shadow-sm border border-gray-200 dark:border-neutral-700">
                  <IconBrain className="w-16 h-16 mx-auto mb-6 opacity-50 text-purple-400" />
                  {selectedModels.length === 0 ? (
                    <>
                      <h2 className="text-xl font-medium mb-2 text-neutral-900 dark:text-neutral-100">Welcome to AI Pasta</h2>
                      <p className="text-neutral-600 dark:text-neutral-400">Click &quot;Select Models&quot; above to choose AI models and start chatting</p>
                    </>
                  ) : selectedModels.length === 1 ? (
                    <>
                      <h2 className="text-xl font-medium mb-2 text-neutral-900 dark:text-neutral-100">Chat with {selectedModels[0].name}</h2>
                      <p className="text-neutral-600 dark:text-neutral-400">Start a conversation by typing your message below</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-medium mb-2 text-neutral-900 dark:text-neutral-100">Multi-Model Chat Ready</h2>
                      <p className="text-neutral-600 dark:text-neutral-400 mb-4">Your message will be sent to {selectedModels.length} AI models simultaneously</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {selectedModels.map(model => (
                          <span
                            key={model.id}
                            className="inline-flex items-center px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full border border-purple-200 dark:border-purple-800"
                          >
                            {model.name}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {conversationFlow.map((item, index) => {
              if (item.type === 'message') {
                const message = item.data;
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isUser={message.isUser}
                    streamingResponses={[]} // Individual messages don't need streaming responses
                    hasActiveResponses={false}
                  />
                );
              } else if (item.type === 'responses') {
                const responseData = item.data;
                return (
                  <div key={`responses-${index}`} className="mb-6">
                    <MultiResponseContainer
                      responses={responseData.responses}
                      timestamp={responseData.timestamp}
                      attachments={[]}
                      isLoading={responseData.hasActiveResponses}
                      loadingModelCount={Array.from(responseData.loadingStates.values()).filter(Boolean).length}
                    />
                  </div>
                );
              }
              return null;
            })}

            {/* Loading indicator */}
            {(isSubmitting && !hasActiveResponses) && (
              <div className="mb-6 px-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 max-w-xs shadow-sm border border-gray-200 dark:border-neutral-700">
                  <div className="flex items-center space-x-3 text-neutral-600 dark:text-neutral-400">
                    <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                    <span className="text-sm">Preparing responses...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Fixed at Bottom */}
          <div className="p-4 bg-gray-50 dark:bg-neutral-800 border-t border-gray-200 dark:border-neutral-700 rounded-b-xl">
            {/* Warning Cards */}
            <div className="space-y-2 mb-4">
              {/* Low Credits Warning */}
              {isAuthenticated && isClient && credits <= 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-sm">
                  <IconAlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    No tokens remaining. Please upgrade your account to continue.
                  </div>
                </div>
              )}

              {/* Insufficient Tokens for Current Request Warning */}
              {isAuthenticated && isClient && credits > 0 && selectedModels.length > 0 && (
                (() => {
                  const tokensNeeded = selectedModels.reduce((total, model) => {
                    const isPaidModel = model.pricing && (model.pricing.input > 0 || model.pricing.output > 0);
                    return total + (isPaidModel ? 10 : 1);
                  }, 0);
                  return tokensNeeded > credits ? (
                    <div className="flex items-center gap-3 p-4 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg shadow-sm">
                      <IconAlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        Insufficient tokens: have {credits}, need {tokensNeeded} tokens
                      </div>
                    </div>
                  ) : null;
                })()
              )}
            </div>

            {/* Input Card */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-6xl bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-300 dark:border-neutral-600 p-2">
                <div 
                  style={{ 
                    opacity: isSubmitting || selectedModels.length === 0 || (isClient && credits <= 0) ? 0.5 : 1, 
                    pointerEvents: isSubmitting || selectedModels.length === 0 || (isClient && credits <= 0) ? 'none' : 'auto' 
                  }}
                >
                  <PlaceholdersAndVanishInput
                    placeholders={selectedModels.length === 0 
                      ? ["Select models to start chatting..."] 
                      : AI_CHAT_PLACEHOLDERS
                    }
                    onChange={(e) => {
                      setInputValue(e.target.value);
                    }}
                    onSubmit={(e) => {
                      if ((inputValue.trim() || attachedFiles.length > 0) && !isSubmitting && selectedModels.length > 0 && !(isClient && credits <= 0)) {
                        sendMessage();
                        // The component will clear its own value after the vanish animation
                        // We need to clear our local state too
                        setTimeout(() => setInputValue(''), 100);
                      }
                    }}
                  />
                </div>
                
                {/* Loading overlay */}
                {(isSubmitting || hasActiveResponses) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-neutral-900/90 rounded-xl pointer-events-none backdrop-blur-sm">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Settings Modal rendered at page root */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onWalletUpdate={(newState) => {
          try {
            if (newState && typeof newState.tokens === 'number') {
              setWalletTokens(newState.tokens);
            }
          } catch (e) {}
        }}
        onUpgradeClick={() => setShowPlansModal(true)}
      />
    </>
  );
}

export default function ChatPage() {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hasFirstMessageSent, setHasFirstMessageSent] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [toastShown, setToastShown] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  // Handle auth modal close
  const handleAuthModalClose = useCallback(() => {
    if (user) {
      // Only allow closing if user is authenticated
      setShowAuthModal(false);
    } else {
      // If not authenticated, show warning (but don't spam)
      if (!toastShown) {
        toast.warning('Authentication is required to use AI chat features');
      }
    }
  }, [user, toast, toastShown]);

  // Handle plan selection and purchase
  const handlePlanSelect = useCallback((purchaseData) => {
    console.log('Plan selected:', purchaseData);
    // Update user's token balance (this should be handled by the backend response)
    toast.success(`Successfully purchased ${purchaseData.plan.name}! You now have ${purchaseData.newTokenBalance} tokens.`);
    setShowPlansModal(false);
  }, [toast]);

  // Check authentication status and show appropriate UI
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        // User is not authenticated, show auth modal and toast (only once)
        setShowAuthModal(true);
        if (!toastShown) {
          toast.error('Please log in to access AI chat functionality');
          setToastShown(true);
        }
      } else {
        // User is authenticated, ensure auth modal is closed and reset toast flag
        setShowAuthModal(false);
        setToastShown(false);
      }
    }
  }, [user, authLoading, toast, toastShown]);

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <SidebarProvider open={open} setOpen={setOpen} locked={locked} setLocked={setLocked}>
        {/* Auth Modal - Show when user is not authenticated */}
        <AuthModal
          key={String(showAuthModal)}
          isOpen={showAuthModal}
          onClose={handleAuthModalClose}
          initialMode="login"
        />
        
        <ChatPageContent 
          open={open} 
          setOpen={setOpen} 
          locked={locked} 
          setLocked={setLocked} 
          hasFirstMessageSent={hasFirstMessageSent}
          setHasFirstMessageSent={setHasFirstMessageSent}
          showPlansModal={showPlansModal}
          setShowPlansModal={setShowPlansModal}
        />

        {/* Plans Modal */}
        <PlansModal
          isOpen={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          onPlanSelect={handlePlanSelect}
        />
      </SidebarProvider>
    </ToastProvider>
  );
}