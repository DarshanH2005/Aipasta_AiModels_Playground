import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { ToastProvider, useToast, Sidebar, SidebarBody, SidebarProvider, SidebarFooter } from '../shared';
import ThemeToggle from '../components/ui/working-theme-toggle';
import { AuthModal, ModelSelectionModal } from '../features';
import { IconSettings, IconLogout, IconMenu2, IconPinned, IconPin, IconTrash } from '@tabler/icons-react';

import { useStreamingResponses, streamModelResponse } from '../hooks/useStreamingResponses';
import { getChatSession, createChatSession, checkBackendHealth, retryBackendConnection } from '../lib/api-client';
import { AI_CHAT_PLACEHOLDERS } from '../constants/models';

import { useChatSessions } from '../hooks/useChatSessions';
import { useChatModels } from '../hooks/useChatModels';
import { useChatMessages } from '../hooks/useChatMessages';

import ChatHeader from '../features/chat/components/ChatHeader';
import ChatArea from '../features/chat/components/ChatArea';
import ChatInputBar from '../features/chat/components/ChatInputBar';

const SettingsModal = lazy(() => import('../shared/components/SettingsModal'));
const PlansModal = lazy(() => import('../shared/components/PlansModal'));

function ChatPageContent({
  open, setOpen, locked, setLocked, hasFirstMessageSent, setHasFirstMessageSent,
  showPlansModal, setShowPlansModal
}) {
  const toast = useToast();
  const { user, credits, isAuthenticated, loading: authLoading, logout } = useAuth();
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  const [backendOnline, setBackendOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [backendStatus, setBackendStatus] = useState({ isOnline: true, lastChecked: null, errorCount: 0 });
  const [error, setError] = useState(null);

  const updateBackendStatus = useCallback((isOnline, err = null) => {
    setBackendStatus(prev => ({
      isOnline,
      lastChecked: new Date(),
      errorCount: isOnline ? 0 : (prev.isOnline === isOnline ? prev.errorCount : prev.errorCount + 1),
    }));
  }, []);

  const {
    chatSessions, setChatSessions, chatSessionsLoading, currentSessionId, setCurrentSessionId,
    handleDeleteSession, handleNewChat, refreshSessions
  } = useChatSessions(isAuthenticated, authLoading, updateBackendStatus, toast);

  const {
    models, modelsLoading, selectedModels, setSelectedModels
  } = useChatModels(user, isClient, authLoading, toast, setError);

  const {
    allResponses, loadingStates, initializeResponse, updateResponse, setResponseError, clearResponses, hasActiveResponses
  } = useStreamingResponses();

  const {
    messages, setMessages, conversationFlow
  } = useChatMessages(allResponses, clearResponses, hasActiveResponses, loadingStates);

  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Backend Health check
  useEffect(() => {
    let interval = null;
    let isActive = true;
    const checkHealth = async () => {
      if (!isActive) return;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
        const healthUrl = API_BASE ? `${API_BASE}/health` : "/api/health";
        const response = await fetch(healthUrl, { method: "GET", signal: controller.signal });
        clearTimeout(timeoutId);
        if (isActive) updateBackendStatus(response.ok, response.ok ? null : `Returned ${response.status}`);
      } catch (err) {
        if (isActive) updateBackendStatus(false, err.name === 'AbortError' ? "Timeout" : err.message);
      }
    };
    checkHealth();
    interval = setInterval(checkHealth, 30000);
    return () => { isActive = false; clearInterval(interval); };
  }, [updateBackendStatus]);

  const handleBackendOffline = async () => {
    setBackendOnline(false);
    setIsReconnecting(true);
    toast.error("?? Backend is currently offline", { description: "Attempting to reconnect...", duration: 5000 });
    try {
      const reconnected = await retryBackendConnection(3, 1000);
      if (reconnected) {
        setBackendOnline(true);
        toast.success("? Backend reconnected successfully!");
      } else {
        toast.error("? Failed to reconnect to backend", { description: "Please check if backend server is running" });
      }
    } catch (err) {
      toast.error("? Connection failed");
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleLoadChat = async (sessionId) => {
    if (!sessionId) return;
    setCurrentSessionId(sessionId);
    setMessages([]);
    clearResponses();
    setError(null);

    try {
      const sessionData = await getChatSession(sessionId);
      if (sessionData?.session && sessionData?.messages) {
        const formattedMessages = sessionData.messages.map((msg) => ({
          id: msg._id || msg.id,
          content: msg.content,
          isUser: msg.role === "user",
          timestamp: msg.createdAt || msg.timestamp,
          model: msg.role !== "user" && msg.model ? {
            name: msg.model.name, id: msg.model.id, provider: msg.model.provider || "OpenRouter"
          } : undefined,
          status: msg.status,
          error: msg.error,
        }));
        setMessages(formattedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
      }
    } catch (err) {
      toast.error("Failed to load chat session: " + err.message);
    }
  };

  const getModelTokenCost = (model) => {
    if (!model) return 10;
    const pricing = model.pricing || {};
    const hasPricing = typeof pricing.input !== "undefined" || typeof pricing.output !== "undefined" || typeof pricing.image !== "undefined";
    if (hasPricing) {
      const input = typeof pricing.input === "number" ? pricing.input : 0;
      const output = typeof pricing.output === "number" ? pricing.output : 0;
      if (input === 0 && output === 0) return 1;
      return 10;
    }
    if (model.isPaid || model.paid) return 10;
    if (model.free) return 1;
    return 10;
  };

  const sendMessage = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || selectedModels.length === 0 || isSubmitting) return;

    if (!backendOnline || isReconnecting) {
      if (!isReconnecting) handleBackendOffline();
      return;
    }

    const tokensNeeded = selectedModels.reduce((total, model) => total + getModelTokenCost(model), 0);
    if (tokensNeeded > credits) {
      toast.error(`Not enough credits. Need ${tokensNeeded} credits, but you only have ${credits}.`);
      return;
    }

    try {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) { setBackendOnline(false); handleBackendOffline(); return; }
    } catch { setBackendOnline(false); handleBackendOffline(); return; }

    setIsSubmitting(true);

    let sessionId = currentSessionId;
    if (!sessionId) {
      const trimmedMessage = inputValue.trim();
      const title = trimmedMessage.length > 50 ? trimmedMessage.substring(0, 50).trim() + "..." : trimmedMessage;
      try {
        const sessionResult = await createChatSession(null, title, selectedModels[0]?.id);
        if (sessionResult?.success && sessionResult.session) {
          sessionId = sessionResult.session.id || sessionResult.session._id;
          setCurrentSessionId(sessionId);
          refreshSessions();
        }
      } catch (err) {
        if (err?.message?.includes("Failed to fetch") || err?.code === "BACKEND_OFFLINE") {
          setBackendOnline(false);
          handleBackendOffline();
          setIsSubmitting(false);
          return;
        }
        toast.warning("Session creation failed, messages may not be saved");
      }
    }

    const currentInput = inputValue;
    const currentFiles = attachedFiles;
    const userMessage = { id: `msg-${Date.now()}`, content: currentInput, isUser: true, timestamp: new Date().toISOString(), files: currentFiles };

    setMessages((prev) => {
      const recentDup = prev.find(msg => msg.isUser && msg.content === currentInput && Date.now() - new Date(msg.timestamp).getTime() < 5000);
      if (recentDup) return prev;
      return [...prev, userMessage];
    });
    setInputValue("");
    setAttachedFiles([]);

    const streamPromises = selectedModels.map(async (model, index) => {
      const responseId = `response-${Date.now()}-${index}`;
      try {
        if (index > 0) await new Promise((res) => setTimeout(res, 200 * index));
        initializeResponse(responseId, { model: `${model.provider}/${model.name}`, provider: model.provider, tokens: getModelTokenCost(model) });

        await streamModelResponse(
          model, currentInput, currentFiles,
          (chunk, isComplete) => updateResponse(responseId, chunk, isComplete),
          () => toast.success(`? ${model.name} completed`),
          (err) => {
            setResponseError(responseId, err);
            if (err?.code === "BACKEND_OFFLINE") handleBackendOffline();
            else if (!err?.message?.includes("Rate limit")) toast.error(`${model.name}: ${err.message || err}`);
          },
          sessionId, false
        );
      } catch (outerError) {
        updateResponse(responseId, `Error: ${outerError.message}`, true, true);
      }
    });

    try {
      await Promise.allSettled(streamPromises);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => clearResponses(), 3000);
    }
  };

  const sidebarLinks = user?.role === "admin" ? [{ label: "Admin Panel", href: "/admin", icon: IconSettings }] : [];

  return (
    <>
      <Head><title>AI Pasta - Chat</title></Head>

      <ModelSelectionModal isOpen={showModelModal} onClose={() => setShowModelModal(false)} models={models} selectedModels={selectedModels} onModelsChange={setSelectedModels} />

      <div className="h-screen flex bg-gray-50 dark:bg-neutral-950 p-2 gap-2">
        {open && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-all duration-300 ease-in-out animate-in fade-in-0" onClick={() => setOpen(false)} />}
        
        <Sidebar open={open} setOpen={setOpen} animate={true} locked={locked} setLocked={setLocked}>
          <SidebarBody className={`flex flex-col gap-2 h-full bg-white dark:bg-neutral-900 shadow-xl border border-gray-200 dark:border-neutral-800 p-4 transition-all duration-300 ease-in-out ${open ? "fixed inset-y-0 left-0 z-50 w-80 lg:relative lg:w-auto rounded-none lg:rounded-xl transform translate-x-0" : "rounded-xl transform -translate-x-full lg:translate-x-0"}`}>
            <div className="flex flex-col space-y-2 flex-shrink-0">
              <div className={`flex items-center ${!(open || locked) ? "justify-center p-2" : "justify-between p-3"} bg-gray-50 dark:bg-neutral-800 rounded-lg shadow-sm`}>
                {!(open || locked) ? <div className="text-2xl">??</div> : (
                  <>
                    <div className="flex items-center space-x-3"><div className="text-2xl">??</div><div className="font-bold text-xl text-neutral-800 dark:text-neutral-100">AI Pasta</div></div>
                    <button onClick={() => { setLocked(!locked); if (!locked) setOpen(true); }} className={`p-2 rounded-lg transition-colors ${locked ? "bg-purple-100 text-purple-600" : "text-neutral-500 hover:bg-neutral-100"}`}>
                      {locked ? <IconPinned className="h-4 w-4" /> : <IconPin className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </div>
              <div className={`bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 ${!(open || locked) ? "p-2" : "p-3"}`}>
                <div className={`w-full flex items-center justify-center ${!(open || locked) ? "p-1" : "p-2"} rounded-lg ${backendStatus.isOnline ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                  <div className={`w-3 h-3 rounded-full ${backendStatus.isOnline ? "bg-green-500" : "bg-red-500"} ${!(open || locked) ? "animate-pulse" : "mr-2"}`} />
                  {(open || locked) && <span className="text-xs font-medium">{backendStatus.isOnline ? "Backend Online" : "Offline Mode"}</span>}
                </div>
              </div>
            </div>

            {(open || locked) && (
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-3 flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3 min-w-0 flex-shrink-0">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider truncate">Recent Chats</div>
                  <button onClick={() => handleNewChat(() => { setMessages([]); setInputValue(""); })} className="text-xs text-purple-600 hover:text-purple-700 font-medium px-2 py-1 rounded-md hover:bg-purple-50 transition-colors">New Chat</button>
                </div>
                <div className="overflow-hidden rounded-lg bg-gray-50 dark:bg-neutral-700 p-2 min-w-0 flex-1 flex flex-col relative">
                  {chatSessionsLoading ? <div className="text-xs text-neutral-400 p-3 text-center">Loading chats...</div> : chatSessions.length === 0 ? <div className="text-xs text-neutral-400 p-3 text-center">No chat history yet</div> : (
                    <div className="space-y-0.5 flex-1 overflow-y-auto scrollbar-custom">
                      {chatSessions.map(session => (
                        <div key={session._id} className={`grid grid-cols-[1fr_auto] items-center group rounded-lg transition-all shadow-sm min-w-0 ${currentSessionId === session._id ? "bg-purple-100 border border-purple-200" : "bg-white hover:bg-neutral-50 border border-transparent"}`}>
                          <button onClick={() => handleLoadChat(session._id)} className="text-left p-3 sm:p-2 text-xs transition-colors min-w-0 w-full touch-target">
                            <div className={`font-medium truncate min-w-0 text-xs ${currentSessionId === session._id ? "text-purple-700" : "text-neutral-600"}`}>{session.title}</div>
                            <div className="text-neutral-400 mt-0.5 truncate text-xs opacity-75">{new Date(session.createdAt).toLocaleDateString()}</div>
                          </button>
                          <button onClick={() => handleDeleteSession(session._id, () => setMessages([]))} className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50"><IconTrash className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(open || locked) && (
              <SidebarFooter className="px-0">
                <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-3 space-y-2">
                  <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors"><ThemeToggle size="sm" /><span className="ml-3 text-sm font-medium">Theme</span></div>
                  <button onClick={logout} className="w-full flex items-center p-2 rounded-lg text-neutral-700 hover:bg-red-50 hover:text-red-600 transition-colors"><IconLogout className="w-5 h-5" /><span className="ml-3 text-sm font-medium">Logout</span></button>
                </div>
              </SidebarFooter>
            )}
          </SidebarBody>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-neutral-900 rounded-none sm:rounded-xl shadow-sm border-0 sm:border border-gray-200 dark:border-neutral-800 relative">
          <ChatHeader open={open} setOpen={setOpen} selectedModels={selectedModels} modelsLoading={modelsLoading} setShowModelModal={setShowModelModal} setIsSettingsOpen={setIsSettingsOpen} logout={logout} />
          
          <ChatArea messages={messages} conversationFlow={conversationFlow} selectedModels={selectedModels} isSubmitting={isSubmitting} hasActiveResponses={hasActiveResponses} messagesEndRef={messagesEndRef} />
          
          <ChatInputBar inputValue={inputValue} setInputValue={setInputValue} attachedFiles={attachedFiles} isSubmitting={isSubmitting} hasActiveResponses={hasActiveResponses} selectedModels={selectedModels} credits={credits} isAuthenticated={isAuthenticated} isClient={isClient} sendMessage={sendMessage} backendOnline={backendOnline} isReconnecting={isReconnecting} AI_CHAT_PLACEHOLDERS={AI_CHAT_PLACEHOLDERS} />
        </div>
      </div>

      <Suspense fallback={<div className="fixed inset-0 bg-black/20 flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" /></div>}>
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onUpgradeClick={() => setShowPlansModal(true)} />
      </Suspense>
    </>
  );
}

export default function ChatPage() {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hasFirstMessageSent, setHasFirstMessageSent] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  
  useEffect(() => {
    if (!authLoading && !user) setShowAuthModal(true);
    else setShowAuthModal(false);
  }, [user, authLoading]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" /></div>;

  return (
    <ToastProvider>
      <SidebarProvider open={open} setOpen={setOpen} locked={locked} setLocked={setLocked}>
        <AuthModal isOpen={showAuthModal} onClose={() => { if(user) setShowAuthModal(false); }} initialMode="login" />
        <ChatPageContent open={open} setOpen={setOpen} locked={locked} setLocked={setLocked} hasFirstMessageSent={hasFirstMessageSent} setHasFirstMessageSent={setHasFirstMessageSent} showPlansModal={showPlansModal} setShowPlansModal={setShowPlansModal} />
        <Suspense fallback={<div className="fixed inset-0 bg-black/20 flex items-center justify-center" />}>
          <PlansModal isOpen={showPlansModal} onClose={() => setShowPlansModal(false)} />
        </Suspense>
      </SidebarProvider>
    </ToastProvider>
  );
}
