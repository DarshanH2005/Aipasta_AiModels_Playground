import { useState, useCallback, useMemo } from 'react';

/**
 * Hook to manage streaming responses from multiple AI models
 * Handles incremental updates, prevents page freezing, and optimizes performance
 */
export const useStreamingResponses = () => {
  const [activeResponses, setActiveResponses] = useState(new Map());
  const [completedResponses, setCompletedResponses] = useState(new Map());
  const [loadingStates, setLoadingStates] = useState(new Map());

  // Add a new streaming response
  const initializeResponse = useCallback((responseId, modelInfo) => {
    setActiveResponses(prev => new Map(prev.set(responseId, {
      id: responseId,
      model: modelInfo.model,
      provider: modelInfo.provider,
      content: '',
      cost: modelInfo.cost,
      error: null,
      isComplete: false,
      timestamp: new Date().toISOString(),
      chunks: []
    })));
    
    setLoadingStates(prev => new Map(prev.set(responseId, true)));
  }, []);

  // Update response content incrementally
  const updateResponse = useCallback((responseId, chunk, isComplete = false) => {
    setActiveResponses(prev => {
      const current = prev.get(responseId);
      if (!current) return prev;
      
      const updated = {
        ...current,
        content: current.content + chunk,
        chunks: [...current.chunks, { text: chunk, timestamp: Date.now() }],
        isComplete
      };
      
      return new Map(prev.set(responseId, updated));
    });

    if (isComplete) {
      setLoadingStates(prev => {
        const updated = new Map(prev);
        updated.delete(responseId);
        return updated;
      });
      
      // Move to completed responses
      setActiveResponses(prev => {
        const response = prev.get(responseId);
        if (response) {
          setCompletedResponses(completed => 
            new Map(completed.set(responseId, { ...response, isComplete: true }))
          );
        }
        const updated = new Map(prev);
        updated.delete(responseId);
        return updated;
      });
    }
  }, []);

  // Handle response errors
  const setResponseError = useCallback((responseId, error) => {
    setActiveResponses(prev => {
      const current = prev.get(responseId);
      if (!current) return prev;
      
      const updated = {
        ...current,
        error: error.message || 'An error occurred',
        isComplete: true
      };
      
      return new Map(prev.set(responseId, updated));
    });
    
    setLoadingStates(prev => {
      const updated = new Map(prev);
      updated.delete(responseId);
      return updated;
    });
  }, []);

  // Get all responses (active + completed) for rendering
  const allResponses = useMemo(() => {
    const combined = new Map([...completedResponses, ...activeResponses]);
    return Array.from(combined.values()).sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }, [activeResponses, completedResponses]);

  // Clear all responses
  const clearResponses = useCallback(() => {
    setActiveResponses(new Map());
    setCompletedResponses(new Map());
    setLoadingStates(new Map());
  }, []);

  return {
    activeResponses: Array.from(activeResponses.values()),
    completedResponses: Array.from(completedResponses.values()),
    allResponses,
    loadingStates: Array.from(loadingStates.keys()),
    initializeResponse,
    updateResponse,
    setResponseError,
    clearResponses,
    hasActiveResponses: activeResponses.size > 0,
    totalResponses: activeResponses.size + completedResponses.size
  };
};

/**
 * Simulates streaming API call to AI model
 * In production, this would connect to actual streaming endpoints
 */
export const streamModelResponse = async (model, userInput, files, onChunk, onComplete, onError, sessionId = null, isLocalSession = true) => {
  try {
    // Validate model ID before proceeding
    const modelId = model.modelId || model.id;
    if (!modelId || typeof modelId !== 'string' || modelId.length < 3) {
      const error = new Error(`Invalid model ID: "${modelId}". Model must have a valid ID.`);
      console.error('Invalid model detected in streamModelResponse:', { model, modelId });
      if (onError) onError(error);
      return;
    }

    // Always use backend API to avoid redundant calls and ensure proper session management
    try {
      console.log('Using backend API call with sessionId:', sessionId);
      const { sendChatMessage } = await import('../lib/api-client');
      
      const response = await sendChatMessage({
        message: userInput,
        modelId: modelId,
        sessionId: sessionId || 'local_fallback',
        options: {
          temperature: 0.7,
          max_tokens: 1000
        }
      });

      if (response.error) {
        // Backend may return structured errors with a 'type' or 'code' field
        const code = response.type || response.code || null;
        const errMsg = typeof response.error === 'string' ? response.error : (response.message || JSON.stringify(response.error || 'Unknown error'));

        // Handle structured error types from API client
        if (code === 'INSUFFICIENT_TOKENS' || (errMsg && errMsg.includes && errMsg.includes('Insufficient tokens'))) {
          // Prefer dispatching a lightweight error object and emit a global user update
          // to prevent Next's dev overlay from showing raw Error stacks and to ensure
          // the AuthContext can update balances from the backend-provided user snapshot.
          const message = `💰 ${errMsg}\n\nTip: Your account has been upgraded to 5,000 tokens. Please refresh the page or try again.`;

          // If backend included a user snapshot in the response, dispatch it so
          // AuthContext (and any listeners) can update immediately.
          try {
            const user = response.user || response.data?.user || response.userSummary || null;
            if (user) {
              // Dispatch the raw user object in detail for AuthContext compatibility
              window.dispatchEvent(new CustomEvent('aiPasta:userUpdated', { detail: user }));
            }
          } catch (dispatchErr) {
            // best-effort only
            console.warn('Failed to dispatch user update for insufficient tokens:', dispatchErr);
          }

          // Call onError with a plain object (not a real Error) to avoid Next's overlay
          // swallowing the app and to allow UI code to treat it as a handled domain error.
          if (onError) onError({ code: 'INSUFFICIENT_TOKENS', message, raw: response });
          return;
        }

        if (code === 'PAYWALL' || (errMsg && errMsg.includes && errMsg.includes('Access denied'))) {
          // Surface a clear paywall error as a plain object so callers can
          // present upgrade UI without triggering the dev overlay.
          const message = `🔒 ${errMsg}\n\nTip: Try selecting a free model instead.`;
          try {
            const user = response.user || response.data?.user || response.userSummary || null;
            if (user) window.dispatchEvent(new CustomEvent('aiPasta:userUpdated', { detail: user }));
          } catch (dispatchErr) {
            console.warn('Failed to dispatch user update for paywall error:', dispatchErr);
          }
          if (onError) onError({ code: 'PAYWALL', message, requiredPlan: response.requiredPlan || response.required_plan || null, raw: response });
          return;
        }

  if (code === 'PROVIDER_ERROR' || (errMsg && errMsg.includes && (errMsg.includes('temporarily unavailable') || errMsg.includes('provider')))) {
          // Normalize provider-related errors as plain objects and dispatch user update if provided
          const providerName = response.provider || response.providerName || null;
          const defaultMsg = providerName ? `AI provider ${providerName} temporarily unavailable. Please try again.` : 'AI provider temporarily unavailable. Please try again.';
          const providerIssueRegex = /provider is not defined|provider not defined|cannot read property 'provider'/i;
          const friendlyMsg = (typeof errMsg === 'string' && providerIssueRegex.test(errMsg)) ? defaultMsg : errMsg;
          try {
            const user = response.user || response.data?.user || response.userSummary || null;
            if (user) window.dispatchEvent(new CustomEvent('aiPasta:userUpdated', { detail: user }));
          } catch (dispatchErr) {
            console.warn('Failed to dispatch user update for provider error:', dispatchErr);
          }
          if (onError) onError({ code: 'PROVIDER_ERROR', message: `⏳ ${friendlyMsg}`, provider: providerName, raw: response });
          return;
        }

        if (errMsg && errMsg.toLowerCase && (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('rate_limit'))) {
          const message = `⏱️ ${errMsg}\n\nTip: Please wait a moment before trying again.`;
          try {
            const user = response.user || response.data?.user || response.userSummary || null;
            if (user) window.dispatchEvent(new CustomEvent('aiPasta:userUpdated', { detail: user }));
          } catch (dispatchErr) {
            console.warn('Failed to dispatch user update for rate-limit error:', dispatchErr);
          }
          if (onError) onError({ code: 'RATE_LIMIT', message, raw: response });
          return;
        }

        // Fallback: report generic error through callback
        const e = new Error(errMsg);
        if (onError) onError(e);
        return;
      }

      // Send the full response at once (can be enhanced later for actual streaming)
      const aiResponse = response.data?.aiMessage?.content || 'No response generated';
      console.log('Backend API response received, content length:', aiResponse.length);
      
      // Simulate streaming by breaking response into chunks
      const words = aiResponse.split(' ');
      const chunkSize = Math.max(1, Math.floor(words.length / 10));
      
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        const isLastChunk = i + chunkSize >= words.length;
        const finalChunk = isLastChunk ? chunk : chunk + ' ';
        
        onChunk(finalChunk, isLastChunk);
        
        if (!isLastChunk) {
          await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
        }
      }
      
      onComplete(response);
      return;
    } catch (backendError) {
      console.error('Backend API failed:', backendError);

      // Map certain backend messages to friendly codes/messages but keep
      // the payload as a plain object to avoid triggering dev overlays.
      let code = 'BACKEND_ERROR';
      let message = backendError.message || 'Backend request failed';

      try {
        if (backendError.message && backendError.message.includes('Insufficient tokens')) {
          code = 'INSUFFICIENT_TOKENS';
          message = `💰 Token limit reached! ${backendError.message}`;
        } else if (backendError.message && backendError.message.includes('Access denied')) {
          code = 'PAYWALL';
          message = `🔒 ${backendError.message}`;
        } else if (backendError.message && (backendError.message.includes('Network Error') || backendError.message.includes('fetch'))) {
          code = 'NETWORK_ERROR';
          message = '🌐 Connection error. Please check your internet and try again.';
        } else if (backendError.message && (backendError.message.includes('500') || backendError.message.includes('Internal Server Error'))) {
          code = 'SERVER_ERROR';
          message = '⚠️ Server error. Please try again in a moment.';
        } else if (backendError.message && backendError.message.includes('temporarily unavailable')) {
          code = 'PROVIDER_ERROR';
          message = '⏳ Service temporarily unavailable. Please try again in a few moments.';
        }
      } catch (mapErr) {
        console.warn('Failed to normalize backend error:', mapErr);
      }

      // Best-effort: dispatch any included user snapshot to update balances
      try {
        const maybeUser = backendError.response?.data?.user || backendError.user || null;
  if (maybeUser) window.dispatchEvent(new CustomEvent('aiPasta:userUpdated', { detail: maybeUser }));
      } catch (dispatchErr) {
        console.warn('Failed to dispatch user update from backend error:', dispatchErr);
      }

      if (onError) onError({ code, message, raw: backendError });
      return;
    }
    
    // Final fallback: Generate a helpful error response
    console.error('All response methods failed for model:', modelId);
    const errorMessage = `Sorry, I'm unable to generate a response using the ${model.name || modelId} model right now. This could be due to:\n\n• The model may be temporarily unavailable\n• Network connectivity issues\n• Backend service is down\n\nPlease try:\n• Selecting a different model\n• Refreshing the page\n• Checking your internet connection`;
    
    // Stream the error message as if it were a normal response
    const words = errorMessage.split(' ');
    const chunkSize = Math.max(1, Math.floor(words.length / 8));
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      const isLastChunk = i + chunkSize >= words.length;
      const finalChunk = isLastChunk ? chunk : chunk + ' ';
      
      onChunk(finalChunk, isLastChunk);
      
      if (!isLastChunk) {
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
      }
    }
    
    onComplete({ 
      content: errorMessage, 
      model: modelId, 
      error: 'No available response method',
      isErrorResponse: true 
    });
    return;
    
  } catch (error) {
    console.error('Stream response error:', error);
    onError(error);
  }
};