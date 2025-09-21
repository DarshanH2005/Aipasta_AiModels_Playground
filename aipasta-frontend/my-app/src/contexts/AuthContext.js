import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logAuthError } from '../lib/error-logger';

const AuthContext = createContext();

// Local safe parse helper for client-side fetch responses
async function safeParseResponse(response) {
  try {
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('application/json')) {
      try { return JSON.parse(text); } catch (e) { return { __nonJson: true, text }; }
    }
    const trimmed = (text || '').trim();
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.toLowerCase().startsWith('<html') || trimmed.startsWith('<div')) {
      return { __nonJson: true, html: true, text };
    }
    try { return JSON.parse(text); } catch (e) { return { __nonJson: true, text }; }
  } catch (err) {
    return { __nonJson: true, text: String(err) };
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Get auth headers with token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Login function
  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

  const data = await safeParseResponse(response);

      if (!response.ok) {
        // Don't throw error, just return error response
        console.error('Login failed:', data.message || 'Login failed');
        return { success: false, error: data.message || 'Login failed' };
      }

      // Store token
      localStorage.setItem('authToken', data.token);
      setUser(data.data.user);
      setCredits(data.data.user.credits || 0);

      return { success: true, user: data.data.user };
    } catch (error) {
      await logAuthError('login', error, { email });
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Network error occurred' };
    }
  };

  // Accept a JWT token and user object from external providers (e.g., Google)
  const loginWithToken = async (token, userObj) => {
    try {
      if (!token) return { success: false, error: 'No token provided' };
      localStorage.setItem('authToken', token);
      if (userObj) {
        setUser(userObj);
        setCredits(userObj.credits || userObj.tokens?.balance || 0);
      } else {
        // If no user object provided, attempt to fetch current user
        await getCurrentUser();
      }
      return { success: true };
    } catch (err) {
      console.error('loginWithToken error:', err);
      return { success: false, error: err.message || 'Failed to set token' };
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

  const data = await safeParseResponse(response);

      if (!response.ok) {
        // Don't throw error, just return error response
        console.error('Registration failed:', data.message || 'Registration failed');
        return { success: false, error: data.message || 'Registration failed' };
      }

      // Store token
      localStorage.setItem('authToken', data.token);
      setUser(data.data.user);
      setCredits(data.data.user.credits || 0);

      return { success: true, user: data.data.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message || 'Network error occurred' };
    }
  };



  // Logout function
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setCredits(0);
    }
  };

  // Get current user
  const getCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await safeParseResponse(response);
        setUser(data.data.user);
        setCredits(data.data.user.credits || 0);
      } else {
        // Token might be invalid
        localStorage.removeItem('authToken');
        setUser(null);
        setCredits(0);
      }
    } catch (error) {
      console.error('Get current user error:', error);
      localStorage.removeItem('authToken');
      setUser(null);
      setCredits(0);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Deduct credits
  const deductCredits = async (amount) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/deduct-credits`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount })
      });

  const data = await safeParseResponse(response);

      if (!response.ok) {
        // Handle different types of errors more gracefully
        if (response.status === 403 && data.message?.includes('Insufficient credits')) {
          console.log('Insufficient credits for deduction:', data.message);
          return { success: false, error: 'Insufficient credits', type: 'INSUFFICIENT_CREDITS' };
        }
        return { success: false, error: data.message || 'Failed to deduct credits' };
      }

      setCredits(data.data.creditsRemaining);
      return { success: true, creditsRemaining: data.data.creditsRemaining };
    } catch (error) {
      console.error('Deduct credits error:', error);
      return { success: false, error: error.message };
    }
  };

  // Get credits
  const getCredits = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/credits`, {
        method: 'GET',
        headers: getAuthHeaders()
      });

  const data = await safeParseResponse(response);

      if (response.ok) {
        setCredits(data.data.credits);
        return data.data.credits;
      }
    } catch (error) {
      console.error('Get credits error:', error);
    }
    return credits;
  };

  // Update credits (for when we get updated credits from API responses)
  const updateCredits = (newCredits) => {
    setCredits(newCredits);
  };

  // Load user on app start
  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  // Listen for global user updates from API calls (e.g., after chat responses)
  useEffect(() => {
    const handler = (e) => {
      // Accept multiple payload shapes for robustness:
      // - detail is the user object
      // - detail = { user }
      // - detail = { data: { user } }
      // If none match, attempt a full refresh from server.
      const detail = e?.detail;
      let updatedUser = null;

      if (!detail) {
        updatedUser = null;
      } else if (detail && typeof detail === 'object' && ('_id' in detail || 'email' in detail)) {
        // Likely the user object itself
        updatedUser = detail;
      } else if (detail && typeof detail === 'object' && (detail.tokens || detail.credits)) {
        // Minimal snapshot from server (tokens or credits only)
        updatedUser = detail;
      } else if (detail && typeof detail === 'object' && detail.user) {
        updatedUser = detail.user;
      } else if (detail && typeof detail === 'object' && detail.data && detail.data.user) {
        updatedUser = detail.data.user;
      }

      if (updatedUser) {
        try {
          setUser(prev => ({ ...prev, ...updatedUser }));
          setCredits(updatedUser.credits ?? updatedUser.tokens?.balance ?? credits);
        } catch (err) {
          console.warn('Failed to apply global user update:', err);
        }
      } else {
        // As a last resort try to refresh the current user from the server
        try {
          getCurrentUser();
        } catch (err) {
          console.warn('Failed to refresh user after userUpdated event:', err);
        }
      }
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('aiPasta:userUpdated', handler);
    }

    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('aiPasta:userUpdated', handler);
      }
    };
  }, [credits, getCurrentUser]);

  const value = {
    user,
    credits,
    loading,
    login,
    register,
    loginWithToken,
    logout,
    deductCredits,
    getCredits,
    updateCredits,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;