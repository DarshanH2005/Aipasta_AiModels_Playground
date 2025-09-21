import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { 
  IconSend, 
  IconRobot, 
  IconSettings, 
  IconBrain,
  IconPhoto,
  IconFile,
  IconX
} from '@tabler/icons-react';
import ChatHistorySidebar from '../components/ui/chat-history-sidebar';
import ConversationLayout from '../components/ui/conversation-layout';
import ModelSelectionModal from '../components/ui/model-selection-modal';
import SettingsModal from '../components/ui/settings-modal';
import CostEstimation from '../components/ui/cost-estimation';
import SimpleUploadButton from '../components/ui/simple-upload-button';
import { useAuth } from '../contexts/AuthContext';
import { 
  getChatSessions, 
  createChatSession, 
  getChatMessages, 
  sendChatMessageNew,
  updateChatSession,
  deleteChatSession,
  fetchModels
} from '../lib/api-client';
import { calculateTotalRequestCost, hasSufficientBalance, deductCost } from '../lib/wallet';

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  
  // Chat state
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [conversationTurns, setConversationTurns] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // UI state
  const [message, setMessage] = useState('');
  const [selectedModels, setSelectedModels] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);

  // Refs
  const messageInputRef = useRef(null);

  // Load initial data when user is authenticated
  useEffect(() => {
    if (!authLoading && user) {
      loadInitialData();
    }
  }, [user, authLoading]);

  const loadInitialData = async () => {
    if (!user) {
      console.log('User not authenticated, skipping data load');
      return;
    }
    
    try {
      // Load models (requires authentication)
      const modelsResponse = await fetchModels();
      const models = modelsResponse.models || modelsResponse || [];
      setAvailableModels(models);

      // Set default models if none selected
      if (selectedModels.length === 0 && models.length > 0) {
        setSelectedModels([models[0], models[1], models[2]].filter(Boolean));
      }

      // Load chat sessions
      await loadChatSessions();
    } catch (error) {
      console.error('Error loading initial data:', error);
      // Fallback models
      setAvailableModels([
        { 
          id: 'gpt-4o', 
          name: 'GPT-4o', 
          provider: 'OpenRouter',
          pricing: { input: 0.0025, output: 0.01 }
        }
      ]);
    }
  };

  const loadChatSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const response = await getChatSessions();
      const sessionsList = response.sessions || [];
      setSessions(sessionsList);

      // Auto-select first session or create new one
      if (sessionsList.length > 0 && !currentSessionId) {
        setCurrentSessionId(sessionsList[0].id);
        await loadConversation(sessionsList[0].id);
      } else if (sessionsList.length === 0) {
        await handleNewChat();
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      await handleNewChat();
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadConversation = async (sessionId) => {
    if (!sessionId) return;

    setIsLoadingMessages(true);
    try {
      const response = await getChatMessages(sessionId);
      setConversationTurns(response.conversationTurns || []);
    } catch (error) {
      console.error('Error loading conversation:', error);
      setConversationTurns([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const firstModelId = selectedModels.length > 0 ? selectedModels[0].id : null;
      const response = await createChatSession(null, null, firstModelId);
      const newSession = response.session;
      
      setCurrentSessionId(newSession.id);
      setConversationTurns([]);
      
      // Add to sessions list
      setSessions(prev => [
        {
          id: newSession.id,
          title: newSession.title,
          preview: 'New conversation',
          lastActivity: newSession.createdAt,
          messageCount: 0,
          models: selectedModels
        },
        ...prev
      ]);
    } catch (error) {
      console.error('Error creating new chat:', error);
      // Fallback to local session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentSessionId(sessionId);
      setConversationTurns([]);
    }
  };

  const handleSessionSelect = async (sessionId) => {
    if (sessionId === currentSessionId) return;
    
    setCurrentSessionId(sessionId);
    await loadConversation(sessionId);
  };

  const handleRenameSession = async (sessionId, newTitle) => {
    try {
      await updateChatSession(sessionId, { title: newTitle });
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, title: newTitle }
          : session
      ));
    } catch (error) {
      console.error('Error renaming session:', error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await deleteChatSession(sessionId);
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // If deleted session was current, select another or create new
      if (sessionId === currentSessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id);
          await loadConversation(remainingSessions[0].id);
        } else {
          await handleNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || selectedModels.length === 0 || isSendingMessage) return;
    if (!currentSessionId) await handleNewChat();

    const messageContent = message.trim();
    const messageAttachments = [...attachments];
    
    // Clear input
    setMessage('');
    setAttachments([]);
    
    setIsSendingMessage(true);

    try {
      // Check wallet balance (calculateTotalRequestCost returns { totalCostUsd, totalCostTokens })
      const estimatedCostObj = calculateTotalRequestCost(messageContent, selectedModels);
      const estimatedTokens = (estimatedCostObj && (estimatedCostObj.totalCostTokens || estimatedCostObj.totalTokens)) || 0;
      if (!hasSufficientBalance(estimatedTokens)) {
        alert('Insufficient wallet balance for this request');
        return;
      }

      // Send message via API
      const response = await sendChatMessageNew(
        currentSessionId,
        messageContent,
        selectedModels,
        null, // userId
        messageAttachments
      );

      // Add optimistic update for user message
      const newTurn = {
        id: `turn_${Date.now()}`,
        userMessage: response.userMessage,
        modelResponses: response.modelResponses,
        timestamp: new Date()
      };

      setConversationTurns(prev => [...prev, newTurn]);

  // Deduct estimated token cost
  deductCost(estimatedTokens);

      // Update session in sidebar
      setSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              preview: messageContent,
              lastActivity: new Date(),
              messageCount: session.messageCount + 1
            }
          : session
      ));

      // Poll for AI responses (in a real app, you'd use WebSocket or SSE)
      startPollingForResponses(currentSessionId, newTurn.id);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Poll for AI responses (simplified - in production use WebSocket/SSE)
  const startPollingForResponses = async (sessionId, turnId) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds

    const poll = async () => {
      try {
        const response = await getChatMessages(sessionId);
        const turns = response.conversationTurns || [];
        const updatedTurn = turns.find(turn => turn.id === turnId);
        
        if (updatedTurn) {
          setConversationTurns(prev => prev.map(turn => 
            turn.id === turnId ? updatedTurn : turn
          ));

          // Check if all responses are complete
          const allComplete = updatedTurn.modelResponses.every(
            response => response.isComplete !== false
          );

          if (allComplete || attempts >= maxAttempts) {
            return; // Stop polling
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000); // Poll every second
        }
      } catch (error) {
        console.error('Error polling for responses:', error);
      }
    };

    setTimeout(poll, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAttachmentAdd = (file) => {
    setAttachments(prev => [...prev, file]);
  };

  const handleAttachmentRemove = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Show loading or auth required message
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">Authentication Required</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Please log in to access the AI chat functionality. Create an account to get 10,000 free tokens to start.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>AI Pasta - Chat</title>
        <meta name="description" content="Chat with multiple AI models simultaneously" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex h-screen">
          {/* Chat History Sidebar */}
          {showSidebar && (
            <div className="w-80 flex-shrink-0">
              <ChatHistorySidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSessionSelect={handleSessionSelect}
                onNewChat={handleNewChat}
                onDeleteSession={handleDeleteSession}
                onRenameSession={handleRenameSession}
                isLoading={isLoadingSessions}
              />
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <IconBrain className="w-8 h-8 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      AI Pasta Chat
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedModels.length} model{selectedModels.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setIsModelModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <IconSettings size={16} />
                    <span>Models</span>
                  </button>

                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-3 py-2 bg-white/20 dark:bg-gray-700/40 rounded-lg hover:bg-white/30 transition-colors flex items-center space-x-2"
                  >
                    <span className="text-sm">Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto scrollbar-custom px-6 py-4">
              <ConversationLayout
                conversationTurns={conversationTurns}
                isLoading={isLoadingMessages || isSendingMessage}
                onRetry={(model) => {
                  // Implement retry logic if needed
                  console.log('Retry requested for model:', model);
                }}
              />
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              {/* Cost Estimation */}
              {selectedModels.length > 0 && (
                <div className="mb-4">
                  <CostEstimation
                    message={message}
                    models={selectedModels}
                    attachments={attachments}
                  />
                </div>
              )}

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg"
                      >
                        <IconFile size={16} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {attachment.name}
                        </span>
                        <button
                          onClick={() => handleAttachmentRemove(index)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      selectedModels.length === 0
                        ? "Select AI models to start chatting..."
                        : "Type your message here..."
                    }
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none scrollbar-custom"
                    rows="3"
                    disabled={selectedModels.length === 0 || isSendingMessage}
                  />
                  
                  {/* Upload Button */}
                  <div className="absolute bottom-3 right-3">
                    <SimpleUploadButton
                      onFileSelect={handleAttachmentAdd}
                      acceptedTypes=".jpg,.jpeg,.png,.pdf,.txt,.md"
                      maxSize={10 * 1024 * 1024} // 10MB
                    >
                      <IconPhoto size={20} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </SimpleUploadButton>
                  </div>
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || selectedModels.length === 0 || isSendingMessage}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <IconSend size={20} />
                  <span>{isSendingMessage ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Model Selection Modal */}
        <ModelSelectionModal
          isOpen={isModelModalOpen}
          onClose={() => setIsModelModalOpen(false)}
          models={availableModels}
          selectedModels={selectedModels}
          onSelectionChange={setSelectedModels}
        />

        {/* Settings Modal (glassmorphic) */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onUpgradeClick={() => setShowPlansModal(true)}
        />
      </div>
    </>
  );
}