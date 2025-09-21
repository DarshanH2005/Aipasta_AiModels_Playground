import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from '../components/auth/AuthModal';
import SettingsModal from '../components/ui/settings-modal';
import PlansModal from '../components/ui/plans-modal';
import { Sidebar, SidebarBody, SidebarLink, SidebarProvider, SidebarFooter } from '../components/ui/sidebar';
import { IconBrain, IconRobot, IconSend, IconSettings, IconChevronDown, IconPhoto, IconMusic, IconCurrency, IconEye, IconVideo, IconFile, IconAlertTriangle, IconChevronUp, IconPinned, IconPin, IconTrash, IconLogout } from '@tabler/icons-react';
import SimpleUploadButton from '../components/ui/simple-upload-button';
import ModelSelectionModal from '../components/ui/model-selection-modal';
import OptimizedMultiResponseContainer from '../components/ui/optimized-multi-response-container';
import { useStreamingResponses, streamModelResponse } from '../hooks/useStreamingResponses';
import { getChatSessions, createChatSession, getChatSession, sendChatMessage, deleteChatSession } from '../lib/api-client';
import { ToastProvider, useToast } from '../components/ui/toast-notifications';

// Mock AI models data with multimodal capabilities and pricing - Extended OpenRouter models
const AI_MODELS = [
  { 
    id: 'gpt-4o', 
    name: 'GPT-4o', 
    provider: 'OpenRouter', 
    description: 'Latest OpenAI multimodal model with vision and audio',
    pricing: { input: 0.0025, output: 0.01, image: 0.00765 },
    capabilities: { text: true, image: true, audio: true, video: false },
    maxTokens: 4096, contextLength: 128000
  },
  { 
    id: 'gpt-4-turbo', 
    name: 'GPT-4 Turbo', 
    provider: 'OpenRouter', 
    description: 'Fast and capable GPT-4 variant with 128k context',
    pricing: { input: 0.01, output: 0.03 },
    capabilities: { text: true, image: true, audio: false, video: false },
    maxTokens: 4096, contextLength: 128000
  },
  { 
    id: 'claude-3.5-sonnet', 
    name: 'Claude 3.5 Sonnet', 
    provider: 'OpenRouter', 
    description: 'Anthropic\'s most intelligent model with vision',
    pricing: { input: 0.003, output: 0.015, image: 0.0048 },
    capabilities: { text: true, image: true, audio: false, video: false },
    maxTokens: 8192, contextLength: 200000
  },
  { 
    id: 'claude-3-haiku', 
    name: 'Claude 3 Haiku', 
    provider: 'OpenRouter', 
    description: 'Fast and affordable Claude model',
    pricing: { input: 0.00025, output: 0.00125 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 200000
  },
  { 
    id: 'llama-3.1-405b', 
    name: 'Llama 3.1 405B', 
    provider: 'OpenRouter', 
    description: 'Meta\'s largest open-source model',
    pricing: { input: 0.003, output: 0.003 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 131072
  },
  { 
    id: 'llama-3.1-70b', 
    name: 'Llama 3.1 70B', 
    provider: 'OpenRouter', 
    description: 'High-performance open-source model',
    pricing: { input: 0.0004, output: 0.0004 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 131072
  },
  { 
    id: 'llama-3.2-90b-vision', 
    name: 'Llama 3.2 90B Vision', 
    provider: 'OpenRouter', 
    description: 'Open-source multimodal model with vision',
    pricing: { input: 0.0005, output: 0.0005, image: 0.001 },
    capabilities: { text: true, image: true, audio: false, video: false },
    maxTokens: 4096, contextLength: 128000
  },
  { 
    id: 'gemini-pro', 
    name: 'Gemini Pro', 
    provider: 'OpenRouter', 
    description: 'Google\'s multimodal AI model',
    pricing: { input: 0.000125, output: 0.000375, image: 0.0025 },
    capabilities: { text: true, image: true, audio: false, video: false },
    maxTokens: 2048, contextLength: 30720
  },
  { 
    id: 'mistral-large', 
    name: 'Mistral Large', 
    provider: 'OpenRouter', 
    description: 'Mistral\'s flagship model with strong performance',
    pricing: { input: 0.002, output: 0.006 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 128000
  },
  { 
    id: 'mixtral-8x7b', 
    name: 'Mixtral 8x7B', 
    provider: 'OpenRouter', 
    description: 'Mixture of experts model with great performance',
    pricing: { input: 0.00024, output: 0.00024 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 32768
  },
  { 
    id: 'codellama-70b', 
    name: 'CodeLlama 70B', 
    provider: 'OpenRouter', 
    description: 'Specialized coding model based on Llama',
    pricing: { input: 0.0007, output: 0.0007 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 4096, contextLength: 4096
  },
  { 
    id: 'whisper-large-v3', 
    name: 'Whisper Large v3', 
    provider: 'OpenRouter', 
    description: 'OpenAI\'s speech-to-text model',
    pricing: { input: 0.006, output: 0.001, audio: 0.006 },
    capabilities: { text: true, image: false, audio: true, video: false },
    maxTokens: 4096, contextLength: 25000
  },
  // Free models
  { 
    id: 'llama-3.1-8b-free', 
    name: 'Llama 3.1 8B (Free)', 
    provider: 'OpenRouter', 
    description: 'Free tier Llama model',
    pricing: { input: 0, output: 0 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 2048, contextLength: 131072
  },
  { 
    id: 'mixtral-8x7b-free', 
    name: 'Mixtral 8x7B (Free)', 
    provider: 'OpenRouter', 
    description: 'Free tier Mixtral model',
    pricing: { input: 0, output: 0 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 2048, contextLength: 32768
  },
  { 
    id: 'gemma-7b-free', 
    name: 'Gemma 7B (Free)', 
    provider: 'OpenRouter', 
    description: 'Free Google Gemma model',
    pricing: { input: 0, output: 0 },
    capabilities: { text: true, image: false, audio: false, video: false },
    maxTokens: 2048, contextLength: 8192
  }
];

// Optimized chat message component for streaming responses
const ChatMessage = ({ message, isUser, streamingResponses, hasActiveResponses }) => {
  const [imageLoaded, setImageLoaded] = useState({});
  
  const handleImageLoad = (fileId) => {
    setImageLoaded(prev => ({ ...prev, [fileId]: true }));
  };

  // Handle streaming AI responses
  if (!isUser && streamingResponses && streamingResponses.length > 0) {
    return (
      <div className="flex justify-start mb-4">
        <div className="max-w-[90%] w-full">
          <OptimizedMultiResponseContainer
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-lg ${
        isUser 
          ? 'bg-purple-600 text-white' 
          : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100'
      }`}>
        {/* Model label for AI responses */}
        {!isUser && message.model && (
          <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                {message.model.name}
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                {message.model.provider}
              </div>
            </div>
          </div>
        )}
        
        <div className="p-3">
          {/* Text content */}
          {message.content && (
            <div className="whitespace-pre-wrap mb-2 last:mb-0">{message.content}</div>
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
  const [modelsLoading, setModelsLoading] = useState(true);
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
  }, [allResponses, currentSessionId, clearResponses]);

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

  // Check authentication and load models when user state changes
  useEffect(() => {
    if (isClient && !authLoading && user) {
      // Only call checkAuthAndLoadModels when user is authenticated
      checkAuthAndLoadModels();
    } else if (isClient && !authLoading && !user) {
      // Clear models and data when user is not authenticated
      setModels([]);
      setError(null);
      console.log('❌ User not authenticated, clearing models');
    }
  }, [user, isClient, authLoading]);

  const checkAuthAndLoadModels = async () => {
    console.log('✅ User authenticated, loading models directly from OpenRouter');
    try {
      await loadModels();
      console.log('✅ Models loaded successfully - ready for live chat');
    } catch (error) {
      console.error('❌ Error in checkAuthAndLoadModels:', error);
      toast.error('Failed to initialize: ' + error.message);
      setError('Failed to initialize: ' + error.message);
    }
  };

  const loadModels = async () => {
    try {
      setModelsLoading(true);
      
      // Load models from backend API instead of direct OpenRouter to avoid redundant calls
      console.log('🔄 Loading models from backend API...');
      
      // Import the fetchModels function from api-client
      const { fetchModels } = await import('../lib/api-client');
      const response = await fetchModels();
      
      // Extract models array from the response
      const models = response.models || [];
      
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
    } catch (error) {
      console.error('❌ Error loading models from backend:', error);
      toast.error('Failed to load AI models: ' + error.message);
      setError('Failed to load AI models: ' + error.message);
    } finally {
      setModelsLoading(false);
    }
  };

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
  }, [isAuthenticated, authLoading]);

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

  // Helper function to update backend status
  const updateBackendStatus = useCallback((isOnline, error = null) => {
    setBackendStatus(prev => ({
      isOnline,
      lastChecked: new Date(),
      errorCount: isOnline ? 0 : prev.errorCount + 1
    }));
    
    if (!isOnline && error) {
      console.warn('Backend connectivity issue:', error);
    }
  }, []);

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

  // Sidebar links intentionally left empty here; the Chat link was removed per request.
  const sidebarLinks = [];

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
      <div className="h-screen flex bg-white dark:bg-neutral-900">
        <Sidebar open={open} setOpen={setOpen} animate={true} locked={locked} setLocked={setLocked}>
          <SidebarBody className="justify-between gap-4 h-full">
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Logo */}
              <div className="flex items-center space-x-3 py-3 flex-shrink-0">
                <div className="text-2xl">🍝</div>
                {(open || locked) && (
                  <div className="font-bold text-xl text-neutral-800 dark:text-neutral-100 whitespace-nowrap overflow-hidden">
                    AI Pasta
                  </div>
                )}
              </div>

              {/* Pin Toggle - Always visible */}
              <div className="flex-shrink-0 mb-2">
                <button
                  onClick={() => {
                    const newLocked = !locked;
                    setLocked(newLocked);
                    if (newLocked) {
                      // When pinning, force sidebar open
                      setOpen(true);
                    }
                  }}
                  className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${
                    locked 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-200'
                  }`}
                  title={locked ? "Unpin sidebar" : "Pin sidebar open"}
                >
                  {locked ? <IconPinned className="h-5 w-5" /> : <IconPin className="h-5 w-5" />}
                  {(open || locked) && (
                    <span className="ml-2 text-sm font-medium whitespace-nowrap">
                      {locked ? "Pinned" : "Pin sidebar"}
                    </span>
                  )}
                </button>
                {/* Sidebar controls */}
              </div>

              {/* New Chat button (top) */}
              <div className="flex-shrink-0 mb-3">
                <button
                  onClick={handleNewChat}
                  className="w-full flex items-center p-2 rounded-md text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <IconBrain className="w-4 h-4" />
                  {(open || locked) && (
                    <span className="ml-3 text-sm font-medium">New Chat</span>
                  )}
                </button>
              </div>

              {/* Backend Status Indicator */}
              <div className="flex-shrink-0 mb-2">
                <div className={`w-full flex items-center justify-center p-2 rounded-lg ${
                  backendStatus.isOnline 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    backendStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  {(open || locked) && (
                    <span className="text-xs font-medium">
                      {backendStatus.isOnline ? 'Backend Online' : 'Offline Mode'}
                    </span>
                  )}
                </div>
              </div>

              {/* Settings - open modal */}
              <div className="flex-shrink-0 mb-4">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-full flex items-center p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors"
                >
                  <IconSettings className="h-5 w-5 flex-shrink-0" />
                  {(open || locked) && (
                    <span className="ml-3 text-sm font-medium whitespace-nowrap">
                      Settings
                    </span>
                  )}
                </button>
              </div>

              {/* Navigation */}
              <div className="flex flex-col gap-1 flex-shrink-0">
                {sidebarLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    className="flex items-center p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors"
                  >
                    {link.icon}
                    {(open || locked) && (
                      <span className="ml-3 text-sm font-medium whitespace-nowrap">
                        {link.label}
                      </span>
                    )}
                  </a>
                ))}
              </div>

              {/* Chat History Section - Only show when open or locked */}
              {(open || locked) && (
                <div className="mt-6 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3 px-2">
                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Recent Chats
                    </div>
                    <button
                      onClick={handleNewChat}
                      className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                    >
                      New Chat
                    </button>
                  </div>
                  
                  {chatSessionsLoading ? (
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      Loading chats...
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      No chat history yet
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto scrollbar-custom">
                      {chatSessions.map((session) => (
                        <div
                          key={session._id}
                          className={`flex items-center group rounded-lg ${
                            currentSessionId === session._id
                              ? 'bg-purple-100 dark:bg-purple-900/30'
                              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <button
                            onClick={() => handleLoadChat(session._id)}
                            className="flex-1 text-left p-2 text-xs transition-colors"
                          >
                            <div className={`font-medium truncate flex items-center gap-1 ${
                              currentSessionId === session._id
                                ? 'text-purple-700 dark:text-purple-300'
                                : 'text-neutral-600 dark:text-neutral-400'
                            }`}>
                              {session.title}
                              {session.isLocal && (
                                <span className="text-orange-500 text-xs" title="Local session">●</span>
                              )}
                            </div>
                            <div className="text-neutral-400 dark:text-neutral-500 mt-1">
                              {new Date(session.createdAt).toLocaleDateString()}
                              {session.isLocal && <span className="ml-1 text-orange-400">(Local)</span>}
                            </div>
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session._id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-500 transition-all mr-2"
                            title="Delete chat"
                          >
                            <IconTrash className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Spacer to push wallet to bottom */}
              <div className="flex-1"></div>

              {/* Wallet moved to Settings modal (see header Settings button) */}

              {/* Logout will be rendered in SidebarFooter to ensure it's always at the bottom */}

            </div>
              {/* Sidebar footer - logout placed here to remain at bottom */}
              <SidebarFooter>
                <div className="w-full">
                  <button
                    onClick={async () => {
                      await logout();
                      // Intentionally do not redirect after logout
                    }}
                    className="w-full flex items-center p-2 rounded-md text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <IconLogout className="w-5 h-5" />
                    {(open || locked) && (
                      <span className="ml-3 text-sm font-medium">Logout</span>
                    )}
                  </button>
                </div>
              </SidebarFooter>
          </SidebarBody>
        </Sidebar>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 p-4">
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
              
              {/* Model Selection Button */}
              <button
                onClick={() => setShowModelModal(true)}
                disabled={modelsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
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
                className="ml-3 px-3 py-2 bg-white/10 hover:bg-white/20 text-neutral-800 dark:text-neutral-200 rounded-lg transition-colors"
                title="Settings"
              >
                <IconSettings className="w-5 h-5" />
              </button>
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
          <div className="flex-1 overflow-y-auto scrollbar-custom p-4 chat-window">
            {messages.length === 0 && (
              <div className="text-center text-neutral-500 dark:text-neutral-400 mt-8">
                <IconBrain className="w-16 h-16 mx-auto mb-6 opacity-50" />
                {selectedModels.length === 0 ? (
                  <>
                    <h2 className="text-xl font-medium mb-2">Welcome to AI Pasta</h2>
                    <p>Click &quot;Select Models&quot; above to choose AI models and start chatting</p>
                  </>
                ) : selectedModels.length === 1 ? (
                  <>
                    <h2 className="text-xl font-medium mb-2">Chat with {selectedModels[0].name}</h2>
                    <p>Start a conversation by typing your message below</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-medium mb-2">Multi-Model Chat Ready</h2>
                    <p>Your message will be sent to {selectedModels.length} AI models simultaneously</p>
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {selectedModels.map(model => (
                        <span
                          key={model.id}
                          className="inline-flex items-center px-3 py-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-sm rounded-full"
                        >
                          {model.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
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
                    <OptimizedMultiResponseContainer
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
              <div className="mb-6">
                <div className="bg-neutral-100 dark:bg-neutral-700 rounded-xl p-4 max-w-xs">
                  <div className="flex items-center space-x-3 text-neutral-600 dark:text-neutral-400">
                    <div className="animate-spin w-4 h-4 border-2 border-neutral-400 border-t-neutral-600 rounded-full"></div>
                    <span className="text-sm">Preparing responses...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Fixed at Bottom */}
          <div className="bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 p-4">
            {/* Token Estimation UI removed per user request */}

            {/* Low Credits Warning */}
            {isAuthenticated && isClient && credits <= 0 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-3">
                <IconAlertTriangle className="w-5 h-5 text-red-600" />
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
                  <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg mb-3">
                    <IconAlertTriangle className="w-5 h-5 text-orange-600" />
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      Insufficient tokens: have {credits}, need {tokensNeeded} tokens
                    </div>
                  </div>
                ) : null;
              })()
            )}

            {/* Input Box */}
            <div className="bg-neutral-100 dark:bg-neutral-700 rounded-2xl p-3">
              <div className="flex items-end gap-3">
                {/* Upload Button */}
                <SimpleUploadButton
                  attachedFiles={attachedFiles}
                  onFilesChange={setAttachedFiles}
                  selectedModels={selectedModels}
                  disabled={isSubmitting}
                />

                {/* Text Input */}
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      selectedModels.length === 0 
                        ? "Select models to start chatting..." 
                        : selectedModels.length === 1 
                          ? `Message ${selectedModels[0].name}...`
                          : `Message ${selectedModels.length} AI models...`
                    }
                    className="w-full resize-none bg-transparent border-none focus:outline-none dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400"
                    rows="1"
                    style={{ minHeight: '24px', maxHeight: '120px' }}
                    disabled={isSubmitting}
                    spellCheck="false"
                    suppressHydrationWarning={true}
                  />
                </div>
                
                {/* Send Button */}
                <button
                  onClick={sendMessage}
                  disabled={(!inputValue.trim() && attachedFiles.length === 0) || isSubmitting || selectedModels.length === 0 || (isClient && credits <= 0)}
                  className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting || hasActiveResponses ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <IconSend className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {/* Help Text */}
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  Press Enter to send, Shift+Enter for new line
                </span>
                {selectedModels.length > 1 && (
                  <span className="text-xs text-purple-600 dark:text-purple-400">
                    Sending to {selectedModels.length} models
                  </span>
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
  }, [user, authLoading]); // Remove toast from dependencies

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