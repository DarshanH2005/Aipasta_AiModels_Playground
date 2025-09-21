import { useState, useEffect, useRef } from 'react';
import { getChatMessages } from '../lib/api-client';

export function useChatPolling(sessionId, enabled = true, interval = 2000) {
  const [conversationTurns, setConversationTurns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const lastFetchRef = useRef(null);

  const fetchMessages = async () => {
    if (!sessionId || !enabled) return;

    try {
      setError(null);
      const response = await getChatMessages(sessionId);
      const newTurns = response.conversationTurns || [];
      
      // Only update if data has changed
      const newDataString = JSON.stringify(newTurns);
      if (lastFetchRef.current !== newDataString) {
        setConversationTurns(newTurns);
        lastFetchRef.current = newDataString;
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
      setError(err);
    }
  };

  // Initial load
  useEffect(() => {
    if (sessionId) {
      setIsLoading(true);
      fetchMessages().finally(() => setIsLoading(false));
    }
  }, [sessionId]);

  // Polling
  useEffect(() => {
    if (!enabled || !sessionId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(fetchMessages, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId, enabled, interval]);

  const updateTurn = (turnId, updatedTurn) => {
    setConversationTurns(prev => 
      prev.map(turn => turn.id === turnId ? updatedTurn : turn)
    );
  };

  const addTurn = (newTurn) => {
    setConversationTurns(prev => [...prev, newTurn]);
  };

  return {
    conversationTurns,
    isLoading,
    error,
    updateTurn,
    addTurn,
    refresh: fetchMessages
  };
}