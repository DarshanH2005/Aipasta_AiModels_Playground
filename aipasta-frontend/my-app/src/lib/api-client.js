// Frontend API utilities for communicating with the backend
import { logAPIError, startTimer, endTimer } from './error-logger.js';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Debug API base URL
console.log('API_BASE URL:', API_BASE || 'Using relative URLs');

// Helper to build API URLs safely using API_BASE or fallback to window.location.origin
export function buildApiUrl(path) {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE) {
    try {
      return new URL(safePath, API_BASE).toString();
    } catch (err) {
      console.warn('buildApiUrl: API_BASE invalid, falling back to origin', API_BASE, err?.message);
    }
  }

  const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
  return new URL(safePath, origin).toString();
}

// Check if backend is running
const checkBackendHealth = async () => {
  try {
    const healthUrl = buildApiUrl('/health');
    const response = await fetch(healthUrl, { method: 'GET', timeout: 5000 });
    console.log('Backend health check:', response.status === 200 ? 'OK' : `Failed (${response.status})`);
    return response.status === 200;
  } catch (error) {
    console.warn('Backend not available:', error?.message || error);
    return false;
  }
};

// Retry backend connection with exponential backoff
const retryBackendConnection = async (maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Attempting to reconnect to backend (${attempt}/${maxRetries})...`);
    
    const isHealthy = await checkBackendHealth();
    if (isHealthy) {
      console.log('✅ Backend reconnected successfully!');
      return true;
    }
    
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`⏳ Backend still offline, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('❌ Failed to reconnect to backend after all attempts');
  return false;
};

// Run health check on load
checkBackendHealth();

// Helper: safely parse a Response as JSON or fallback to text; detect HTML pages
async function safeParseResponse(response) {
  // Read body as text first to avoid double-reading
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  // If content type explicitly JSON, try parse
  if (contentType.toLowerCase().includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch (err) {
      // Invalid JSON despite content-type
      return { __nonJson: true, text, status: response.status, contentType };
    }
  }

  const trimmed = (text || '').trim();
  // Heuristics for HTML pages (Dev overlay / error pages)
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.toLowerCase().startsWith('<html') || trimmed.startsWith('<div') || trimmed.startsWith('<!doctype')) {
    return { __nonJson: true, html: true, text, status: response.status, contentType };
  }

  // Try parsing as JSON anyway
  try {
    return JSON.parse(text);
  } catch (err) {
    return { __nonJson: true, text, status: response.status, contentType };
  }
}

const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }
  return null;
};

const getAuthHeaders = () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Add authentication token if available
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add client fingerprint for Razorpay if available
  if (typeof window !== 'undefined' && window.navigator) {
    headers['x-client-info'] = window.navigator.userAgent.slice(0, 100);
  }
  
  return headers;
};

export async function fetchModels(options = {}) {
  try {
    // Build the URL robustly. If API_BASE is set and absolute, use it as the base.
    // Otherwise fall back to the current origin so `new URL` always succeeds in the browser.
    let url;
    const path = '/api/models';
    if (API_BASE) {
      try {
        url = new URL(path, API_BASE);
      } catch (uErr) {
        // If API_BASE is malformed, fall back to relative origin
        console.warn('API_BASE seems invalid, falling back to window.location.origin', API_BASE, uErr?.message);
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
        url = new URL(path, origin);
      }
    } else {
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'http://localhost:3000';
      url = new URL(path, origin);
    }

    // Add query params to fetch models
    if (options.provider) url.searchParams.append('provider', String(options.provider));
    if (options.search) url.searchParams.append('search', String(options.search));
    if (options.maxPrice !== undefined) url.searchParams.append('maxPrice', String(options.maxPrice));
    if (options.minPrice !== undefined) url.searchParams.append('minPrice', String(options.minPrice));
    if (options.limit !== undefined) url.searchParams.append('limit', String(options.limit));
    if (options.sort) url.searchParams.append('sort', String(options.sort));
    if (Array.isArray(options.capabilities) && options.capabilities.length) url.searchParams.append('capabilities', options.capabilities.join(','));

    console.log('Fetching models from:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    console.log('Models response status:', response.status);
    
    if (!response.ok) {
      // Handle different error cases
      const parsed = await safeParseResponse(response);
      const errorText = parsed.__nonJson ? parsed.text : JSON.stringify(parsed);
      console.error('Models API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url.toString()
      });

      // If the backend included an updated user object in the error response, dispatch an event
      // so the AuthContext can update token/credit display immediately.
      try {
        const returnedUser = parsed?.data?.user || parsed?.user;
        if (returnedUser && typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('aiPasta:userUpdated', { detail: returnedUser }));
          } catch (evErr) {
            // ignore
          }
        }
      } catch (evErr) {
        // non-fatal
      }
      
      // Require authentication for all model access
      if (response.status === 401) {
        throw new Error('Authentication required to access models. Please log in.');
      }
      
      // For 400 errors, provide more context
      if (response.status === 400) {
        try {
          const errorData = parsed.__nonJson ? { message: parsed.text } : parsed;
          throw new Error(errorData.message || `Bad request: ${errorText}`);
        } catch (jsonErr) {
          throw new Error(`Bad request: ${errorText || 'Invalid request format'}`);
        }
      }
      
      throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
    }
    
    const data = await safeParseResponse(response);
    console.log('Models data:', data);
    
    // Return the models data
    const models = data.models || data.data?.models || data.data || [];
    
    return {
      models,
      stats: data.stats,
      cached: data.cached,
      lastUpdated: data.lastUpdated
    };
  } catch (error) {
    console.error('Error fetching models:', {
      message: error?.message || error,
      stack: error?.stack,
      url: typeof url !== 'undefined' ? url.toString() : undefined,
      headers: getAuthHeaders()
    });
    
    // Re-throw the error for proper handling
    throw new Error(error?.message || 'Failed to fetch models');
  }
}

export async function createChatSession(userId = null, title = null, modelId = null) {
  try {
    const response = await fetch(`${API_BASE}/api/chat/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title,
        modelId // Send only title and modelId, userId comes from auth token
      })
    });
    
    if (!response.ok) {
      const parsed = await safeParseResponse(response);
      const errorText = parsed.__nonJson ? parsed.text : JSON.stringify(parsed);
      console.error('Create Chat Session Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      
      // Handle auth errors - require login
      if (response.status === 401) {
        console.warn('Authentication required for chat session creation');
        return {
          success: false,
          error: 'Please log in to create chat sessions',
          requiresAuth: true
        };
      }
      
      // Handle all other errors gracefully by returning local fallback
      console.warn(`Backend error (${response.status}) - creating local session fallback:`, errorText);
      return {
        success: true,
        session: {
          id: `local_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: title || 'New Chat',
          modelId,
          createdAt: new Date(),
          isLocal: true
        }
      };
    }

  const data = await safeParseResponse(response);
    console.log('Session creation response:', data);
    
    // Backend returns { status: 'success', data: { session: {...} } }
    if (data.status === 'success' && data.data?.session) {
      return {
        success: true,
        session: {
          ...data.data.session,
          id: data.data.session._id // Add id field for frontend compatibility
        }
      };
    }
    
    // Fallback for other response formats
    return data.data?.session || data.session || data;
  } catch (error) {
    console.error('Error creating chat session:', error);
    // Return a local session ID as fallback
    return {
      success: true,
      session: {
        id: `local_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title || 'New Chat',
        modelId,
        createdAt: new Date(),
        isLocal: true
      }
    };
  }
}

// Cache for getChatSessions to prevent rapid successive calls
let chatSessionsApiCache = { data: null, timestamp: 0, promise: null };
const CHAT_SESSIONS_CACHE_DURATION = 10000; // 10 seconds

// Function to clear chat sessions cache (useful after creating/deleting sessions)
export function clearChatSessionsCache() {
  chatSessionsApiCache = { data: null, timestamp: 0, promise: null };
  console.log('🗑️ Cleared chat sessions cache');
}

export async function getChatSessions() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (chatSessionsApiCache.data && 
      now - chatSessionsApiCache.timestamp < CHAT_SESSIONS_CACHE_DURATION) {
    console.log('🚀 Returning cached chat sessions from API client');
    return chatSessionsApiCache.data;
  }
  
  // If there's already a pending request, wait for it
  if (chatSessionsApiCache.promise) {
    console.log('⏳ Waiting for existing chat sessions request...');
    return await chatSessionsApiCache.promise;
  }
  
  try {
    const url = `${API_BASE}/api/chat/sessions`;
    console.log('Fetching chat sessions from:', url);
    
    // Store the promise to prevent concurrent requests
    chatSessionsApiCache.promise = fetch(url, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    const response = await chatSessionsApiCache.promise;

    console.log('Chat sessions response status:', response.status);

    if (!response.ok) {
      const parsed = await safeParseResponse(response);
      const errorText = parsed.__nonJson ? parsed.text : JSON.stringify(parsed);
      console.error('Chat Sessions API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url: url
      });
      
      // Require authentication for all chat sessions
      if (response.status === 401) {
        throw new Error('Please log in to access your chat sessions');
      }
      
      if (response.status === 404) {
        throw new Error('Chat sessions API not found');
      }
      
      throw new Error(`Failed to load chat sessions: ${response.status} ${response.statusText}`);
    }

    const data = await safeParseResponse(response);
    console.log('Chat sessions data:', data);
    
    const sessions = data.data?.sessions || data.sessions || data || [];
    
    // Cache the successful result
    chatSessionsApiCache = {
      data: sessions,
      timestamp: now,
      promise: null
    };
    
    return sessions;
  } catch (error) {
    // Clear the promise on error
    chatSessionsApiCache.promise = null;
    console.error('Error fetching chat sessions:', error);
    throw error;
  }
}

export async function getChatSession(sessionId, page = 1, limit = 50) {
  try {
    const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      // Handle different types of errors gracefully
      if (response.status === 404) {
        console.log('Chat session not found:', sessionId);
        return {
          error: 'SESSION_NOT_FOUND',
          message: 'Chat session not found',
          session: null,
          messages: [],
          pagination: null
        };
      } else if (response.status === 401) {
        console.log('Authentication required for session:', sessionId);
        return {
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to access this session',
          session: null,
          messages: [],
          pagination: null
        };
      } else {
        console.log(`Failed to fetch chat session (${response.status}):`, sessionId);
        return {
          error: 'FETCH_ERROR',
          message: `Failed to fetch chat session: ${response.status}`,
          session: null,
          messages: [],
          pagination: null
        };
      }
    }

    const data = await safeParseResponse(response);
    return {
      session: data.data.session,
      messages: data.data.messages,
      pagination: data.data.pagination
    };
  } catch (error) {
    console.error('Error fetching chat session:', error);
    return {
      error: 'NETWORK_ERROR',
      message: error.message || 'Network error occurred',
      session: null,
      messages: [],
      pagination: null
    };
  }
}

export async function sendChatMessage(messageOrOptions, modelId, sessionId) {
  startTimer('sendChatMessage');
  
  // Handle both object parameter and individual parameters for backward compatibility
  let message, finalModelId, finalSessionId, options = {};
  
  if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
    // Called with object parameter: sendChatMessage({message, modelId, sessionId, options})
    message = messageOrOptions.message;
    finalModelId = messageOrOptions.modelId;
    finalSessionId = messageOrOptions.sessionId || null;
    options = messageOrOptions.options || {};
  } else {
    // Called with individual parameters: sendChatMessage(message, modelId, sessionId)
    message = messageOrOptions;
    finalModelId = modelId;
    finalSessionId = sessionId;
  }

  // Validate required parameters
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required and must be a string');
  }
  
  if (!finalModelId) {
    throw new Error('Model ID is required');
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        modelId: finalModelId,
        sessionId: finalSessionId,
        options
      })
    });

    if (!response.ok) {
      const parsed = await safeParseResponse(response);
      const errorData = parsed.__nonJson ? { message: parsed.text } : parsed;

      // If backend included updated user info (even in error responses like 402), dispatch global event
      try {
        const returnedUser = parsed?.data?.user || parsed?.user;
        if (returnedUser && typeof window !== 'undefined') {
          try { window.dispatchEvent(new CustomEvent('aiPasta:userUpdated', { detail: returnedUser })); } catch (e) {}
        }
      } catch (e) {
        // non-fatal
      }

      // Log API error for monitoring - safe substring call
      await logAPIError('/api/chat', new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`), {
        message: typeof message === 'string' ? message.substring(0, 100) : String(message).substring(0, 100), // Log first 100 chars of message
        modelId: finalModelId,
        sessionId,
        status: response.status
      });

      console.error('Send Chat Message Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData
      });
      
      // Handle different error types with user-friendly messages
      switch (response.status) {
        case 400:
          return { 
            success: false, 
            error: errorData.message || 'Invalid request. Please check your input.',
            type: 'VALIDATION_ERROR'
          };
        case 401:
          return { 
            success: false, 
            error: 'Please log in to continue.',
            type: 'AUTHENTICATION_REQUIRED'
          };
        case 402:
          return { 
            success: false, 
            error: errorData.message || 'Insufficient tokens for this request.',
            type: 'INSUFFICIENT_TOKENS'
          };
        case 403:
          // Backend may provide structured PAYWALL info
          if (errorData && errorData.code === 'PAYWALL') {
            return {
              success: false,
              error: errorData.message || 'Access denied - model requires a paid plan.',
              type: 'PAYWALL',
              requiredPlan: errorData.requiredPlan || 'pro'
            };
          }
          return { 
            success: false, 
            error: errorData.message || 'Insufficient credits or access denied.',
            type: 'INSUFFICIENT_CREDITS'
          };
        case 404:
          return { 
            success: false, 
            error: 'AI model not found. Please select a different model.',
            type: 'MODEL_NOT_FOUND'
          };
        case 429:
          return { 
            success: false, 
            error: 'Rate limit exceeded. Please wait a moment and try again.',
            type: 'RATE_LIMIT_EXCEEDED'
          };
        case 500:
          return { 
            success: false, 
            error: errorData.message || 'An unexpected server error occurred. Please try again.',
            type: 'SERVER_ERROR'
          };
        case 502:
        case 503:
          // Backend may include structured provider errors
          if (errorData && errorData.code === 'PROVIDER_ERROR') {
            return {
              success: false,
              error: errorData.message || 'AI provider temporarily unavailable',
              type: 'PROVIDER_ERROR',
              provider: errorData.provider || null
            };
          }
          return { 
            success: false, 
            error: 'Server is temporarily unavailable. Please try again in a moment.',
            type: 'SERVER_ERROR'
          };
        default:
          return { 
            success: false, 
            error: errorData.message || `Request failed: ${response.status} ${response.statusText}`,
            type: 'UNKNOWN_ERROR'
          };
      }
    }

  const data = await safeParseResponse(response);
    endTimer('sendChatMessage');
    // If backend returned an updated user object (credits/tokens), notify the app so AuthProvider can refresh
    try {
      const returnedUser = data?.data?.user || data?.user;
      if (returnedUser && typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('aiPasta:userUpdated', { detail: returnedUser }));
        } catch (evErr) {
          // Ignore if CustomEvent isn't available
        }
      }
    } catch (e) {
      // Non-fatal
    }
    return { success: true, data: data.data || data };
  } catch (error) {
    endTimer('sendChatMessage');
    
    // Log unexpected errors - safe substring call
    await logAPIError('/api/chat', error, {
      message: typeof message === 'string' ? message.substring(0, 100) : String(message).substring(0, 100),
      modelId: finalModelId,
      sessionId: finalSessionId,
      errorName: error.name
    });
    
    console.error('Error sending chat message:', error);
    
    // Network connectivity issues
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { 
        success: false, 
        error: 'Network error. Please check your internet connection and try again.',
        type: 'NETWORK_ERROR'
      };
    }
    
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please try again.',
      type: 'UNKNOWN_ERROR'
    };
  }
}

export const authAPI = {
  isLoggedIn: () => !!getAuthToken()
};

// Enhanced chat management functions
export async function updateChatSession(sessionId, updates) {
  try {
    const response = await fetch(`${API_BASE}/api/chat/sessions`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sessionId,
        ...updates
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update chat session: ${response.statusText}`);
    }
    
  return await safeParseResponse(response);
  } catch (error) {
    console.error('Error updating chat session:', error);
    return { success: false, error: error.message };
  }
}

export async function getChatMessages(sessionId, limit = 50) {
  try {
    const params = new URLSearchParams();
    params.append('sessionId', sessionId);
    params.append('limit', limit.toString());
    
    const response = await fetch(`${API_BASE}/api/chat/messages?${params}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch chat messages: ${response.statusText}`);
      return {
        success: true,
        sessionId,
        conversationTurns: [],
        totalMessages: 0
      };
    }
    
  return await safeParseResponse(response);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return {
      success: true,
      sessionId,
      conversationTurns: [],
      totalMessages: 0
    };
  }
}

export async function sendChatMessageNew(sessionId, content, models, userId = null, attachments = []) {
  try {
    const response = await fetch(`${API_BASE}/api/chat/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sessionId,
        userId,
        content,
        models,
        attachments
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send chat message: ${response.statusText}`);
    }
    
  return await safeParseResponse(response);
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

export async function deleteChatSession(sessionId) {
  try {
    const response = await fetch(`${API_BASE}/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete chat session: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
}

// Export backend health and connectivity functions
export { checkBackendHealth, retryBackendConnection };