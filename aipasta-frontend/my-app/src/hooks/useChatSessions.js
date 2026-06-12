import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  getChatSessions, 
  deleteChatSession, 
  clearChatSessionsCache 
} from '../lib/api-client';

export const useChatSessions = (isAuthenticated, authLoading, updateBackendStatus, toast) => {
  const [chatSessions, setChatSessions] = useState([]);
  const [chatSessionsLoading, setChatSessionsLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Cache for chat sessions
  const chatSessionsCache = useRef({
    data: null,
    timestamp: 0,
    loading: false,
  });
  const CACHE_DURATION = 30000;
  const lastLoadTime = useRef(0);
  const MIN_LOAD_INTERVAL = 5000;

  const loadChatSessions = useCallback(async () => {
    if (!isAuthenticated || authLoading) {
      setChatSessionsLoading(false);
      return;
    }

    const now = Date.now();

    if (now - lastLoadTime.current < MIN_LOAD_INTERVAL) return;

    if (
      chatSessionsCache.current.data &&
      now - chatSessionsCache.current.timestamp < CACHE_DURATION
    ) {
      setChatSessions(chatSessionsCache.current.data);
      setChatSessionsLoading(false);
      return;
    }

    if (chatSessionsCache.current.loading) return;

    try {
      setChatSessionsLoading(true);
      chatSessionsCache.current.loading = true;
      lastLoadTime.current = now;

      const sessions = await getChatSessions();
      const sessionData = sessions || [];

      chatSessionsCache.current = {
        data: sessionData,
        timestamp: now,
        loading: false,
      };

      setChatSessions(sessionData);
      if (updateBackendStatus) updateBackendStatus(true);
    } catch (error) {
      console.error("? Failed to fetch chat sessions:", error);
      chatSessionsCache.current.loading = false;
      if (updateBackendStatus) updateBackendStatus(false, error);

      if (error.message?.includes("429")) {
        toast.warning("Too many requests - please wait a moment before refreshing");
      } else if (error.status === 500) {
        toast.error("Backend server error - working in offline mode");
      } else if (!error.status) {
        toast.error("Backend unavailable - working in offline mode");
      }
      setChatSessions([]);
    } finally {
      setChatSessionsLoading(false);
      chatSessionsCache.current.loading = false;
    }
  }, [isAuthenticated, authLoading, updateBackendStatus, toast]);

  useEffect(() => {
    loadChatSessions();
  }, [loadChatSessions]);

  const handleDeleteSession = async (sessionId, onSuccess) => {
    if (!window.confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await deleteChatSession(sessionId);
      clearChatSessionsCache();
      chatSessionsCache.current = { data: null, timestamp: 0, loading: false };
      
      setChatSessions((prev) => prev.filter((session) => session._id !== sessionId));

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        if (onSuccess) onSuccess(); // Callback to clear messages
      }

      toast.success("Chat deleted successfully");
    } catch (error) {
      console.error("Failed to delete chat session:", error);
      toast.error("Failed to delete chat. Please try again.");
    }
  };

  const handleNewChat = (onSuccess) => {
    setCurrentSessionId(null);
    if (onSuccess) onSuccess(); // Callback to clear messages/inputs
  };

  const refreshSessions = useCallback(() => {
     chatSessionsCache.current = { data: null, timestamp: 0, loading: false };
     clearChatSessionsCache();
     loadChatSessions();
  }, [loadChatSessions]);

  return {
    chatSessions,
    setChatSessions,
    chatSessionsLoading,
    currentSessionId,
    setCurrentSessionId,
    handleDeleteSession,
    handleNewChat,
    refreshSessions
  };
};
