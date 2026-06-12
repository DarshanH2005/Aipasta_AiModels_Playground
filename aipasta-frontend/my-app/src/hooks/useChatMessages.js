import { useState, useMemo, useCallback, useEffect } from 'react';

export const useChatMessages = (allResponses, clearResponses, hasActiveResponses, loadingStates) => {
  const [messages, setMessages] = useState([]);

  const saveCompletedResponses = useCallback(() => {
    const completedResponses = allResponses.filter((r) => r.isComplete);
    if (completedResponses.length === 0) return;

    const responseMessages = completedResponses.map((response) => ({
      id: "ai_" + response.id,
      content: response.content,
      isUser: false,
      timestamp: response.timestamp || new Date().toISOString(),
      model: {
        name: response.model,
        provider: response.provider,
      },
      cost: response.cost,
      error: response.error,
    }));

    clearResponses();

    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const filtered = prev.filter(
        (msg) => !responseMessages.some((rm) => rm.id && rm.id === msg.id)
      );

      const toAdd = responseMessages.filter((rm) => !existingIds.has(rm.id));
      return [...filtered, ...toAdd].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    });
  }, [allResponses, clearResponses]);

  useEffect(() => {
    if (allResponses.length > 0 && !hasActiveResponses) {
      const timer = setTimeout(() => {
        saveCompletedResponses();
      }, 500); // Wait for final UI updates
      return () => clearTimeout(timer);
    }
  }, [allResponses, hasActiveResponses, saveCompletedResponses]);

  const conversationFlow = useMemo(() => {
    const flow = [];
    const conversationTurns = [];
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const userMessages = sortedMessages.filter((msg) => msg.isUser);
    const aiMessages = sortedMessages.filter((msg) => !msg.isUser);

    userMessages.forEach((userMsg, index) => {
      const userTimestamp = new Date(userMsg.timestamp).getTime();
      const nextUserTimestamp = userMessages[index + 1]
        ? new Date(userMessages[index + 1].timestamp).getTime()
        : Date.now();

      const relatedAiResponses = aiMessages.filter((aiMsg) => {
        const aiTimestamp = new Date(aiMsg.timestamp).getTime();
        return aiTimestamp > userTimestamp && aiTimestamp < nextUserTimestamp;
      });

      conversationTurns.push({
        userMessage: userMsg,
        aiResponses: relatedAiResponses,
        timestamp: userTimestamp,
      });
    });

    conversationTurns.forEach((turn) => {
      flow.push({
        type: "message",
        data: turn.userMessage,
        timestamp: turn.timestamp,
      });

      if (turn.aiResponses.length > 0) {
        if (turn.aiResponses.length > 1) {
          flow.push({
            type: "responses",
            data: {
              responses: turn.aiResponses.map((msg) => ({
                id: msg.id,
                content: msg.content,
                model: msg.model
                  ? `${msg.model.provider && msg.model.provider !== 'Direct API' ? msg.model.provider : 'OpenRouter'}/${msg.model.name && msg.model.name !== 'Unknown Model' ? msg.model.name : (msg.model.id ? msg.model.id.split('/').pop() : 'AI Assistant')}`
                  : "Unknown",
                provider: msg.model?.provider && msg.model.provider !== 'Direct API' ? msg.model.provider : "OpenRouter",
                timestamp: msg.timestamp,
                isComplete: true,
                cost: msg.cost,
                error: msg.error,
              })),
              timestamp: turn.aiResponses[0].timestamp,
              hasActiveResponses: false,
              loadingStates: new Map(),
            },
            timestamp: turn.timestamp + 1,
          });
        } else {
          flow.push({
            type: "message",
            data: turn.aiResponses[0],
            timestamp: turn.timestamp + 1,
          });
        }
      }
    });

    if (allResponses.length > 0) {
      const lastUserMessage = messages.filter((m) => m.isUser).pop();
      const baseTimestamp = lastUserMessage
        ? new Date(lastUserMessage.timestamp).getTime() + 1
        : Date.now();

      flow.push({
        type: "responses",
        data: {
          responses: allResponses,
          timestamp: new Date(baseTimestamp).toISOString(),
          hasActiveResponses,
          loadingStates,
        },
        timestamp: baseTimestamp,
      });
    }

    return flow.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, allResponses, hasActiveResponses, loadingStates]);

  return {
    messages,
    setMessages,
    conversationFlow,
    saveCompletedResponses
  };
};
