import React, { useState, useEffect, useRef } from 'react';
import { IconEye, IconEyeOff, IconUser, IconMail, IconLock, IconX } from '@tabler/icons-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/toast-notifications';

const AuthModal = ({ isOpen, onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login', 'register'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorShown, setErrorShown] = useState(false); // Prevent duplicate error toasts

  const { login, register, loginWithToken } = useAuth();
  const toast = useToast();
  const [gsiReady, setGsiReady] = useState(null); // null=unknown, true=rendered, false=failed
  
 

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateInput = () => {
    // Basic email regex for better validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (mode === 'login') {
      if (!formData.email.trim()) {
        toast.error('Email is required');
        return false;
      }
      if (!emailRegex.test(formData.email.trim())) {
        toast.error('Please enter a valid email address');
        return false;
      }
      if (!formData.password.trim()) {
        toast.error('Password is required');
        return false;
      }
      if (formData.password.trim().length < 3) {
        toast.error('Password seems too short');
        return false;
      }
    } else if (mode === 'register') {
      if (!formData.name.trim()) {
        toast.error('Name is required');
        return false;
      }
      if (formData.name.trim().length < 2) {
        toast.error('Name must be at least 2 characters long');
        return false;
      }
      if (!formData.email.trim()) {
        toast.error('Email is required');
        return false;
      }
      if (!emailRegex.test(formData.email.trim())) {
        toast.error('Please enter a valid email address');
        return false;
      }
      if (!formData.password.trim()) {
        toast.error('Password is required');
        return false;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorShown(false); // Reset error state

    // Validate input first
    if (!validateInput()) {
      setLoading(false);
      return;
    }

    try {
      let result;

      if (mode === 'login') {
        result = await login(formData.email, formData.password);
      } else if (mode === 'register') {
        result = await register(formData.name, formData.email, formData.password);
      }

      if (result.success) {
        toast.success(
          mode === 'login' 
            ? 'Login successful!' 
            : 'Account created successfully!'
        );
        onClose();
        // Reset form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          username: ''
        });
      } else {
        // Handle specific error types with user-friendly messages
        const errorMessage = result.error || 'Authentication failed';
        
        // Prevent duplicate error toasts
        if (!errorShown) {
          setErrorShown(true);
          
          // Handle different error conditions
          if (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('exists')) {
            toast.error('An account with this email already exists. Try logging in instead!');
            setMode('login'); // Switch to login mode
          } else if (errorMessage.toLowerCase().includes('user') && errorMessage.toLowerCase().includes('exists')) {
            toast.error('This email is already registered. Please use the login form.');
            setMode('login'); // Switch to login mode
          } else if (errorMessage.toLowerCase().includes('user not found') || errorMessage.toLowerCase().includes('not found')) {
            toast.error('No account found with this email. Please register first.');
            setMode('register'); // Switch to register mode
          } else if (errorMessage.toLowerCase().includes('password') && errorMessage.toLowerCase().includes('incorrect')) {
            toast.error('Incorrect password. Please try again.');
          } else if (errorMessage.toLowerCase().includes('invalid password') || errorMessage.toLowerCase().includes('wrong password')) {
            toast.error('Incorrect password. Please check your credentials.');
          } else if (errorMessage.toLowerCase().includes('invalid credentials')) {
            toast.error('Invalid email or password. Please check your credentials.');
          } else if (errorMessage.toLowerCase().includes('validation')) {
            toast.error('Please check your input and try again.');
          } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
            toast.error('Network error. Please check your connection and try again.');
          } else {
            // Generic error message
            toast.error(errorMessage || 'Authentication failed. Please try again.');
          }
        }
        
        // Clear sensitive fields on error but keep email for convenience
        setFormData(prev => ({
          ...prev,
          password: '',
          confirmPassword: ''
        }));
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      // Handle different types of errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error('Unable to connect to server. Please check your internet connection.');
      } else if (error.message.includes('Network')) {
        toast.error('Network error. Please check your internet connection and try again.');
      } else if (error.message.includes('timeout')) {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
      
      // Clear sensitive fields on error
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Services integration
  const googleButtonRef = useRef(null);
  useEffect(() => {
    // Initialize Google Identity Services when the modal opens.
    if (!isOpen) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.debug('GSI: no NEXT_PUBLIC_GOOGLE_CLIENT_ID configured');
      return;
    }

    const loadScript = () => {
      return new Promise((resolve, reject) => {
        if (document.getElementById('gsi-client')) return resolve();
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.id = 'gsi-client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity script'));
        document.head.appendChild(script);
      });
    };

    const waitForPlaceholder = (timeout = 1200) => {
      const start = Date.now();
      return new Promise((resolve) => {
        const check = () => {
          if (googleButtonRef.current && document.contains(googleButtonRef.current)) return resolve(true);
          if (Date.now() - start > timeout) return resolve(false);
          setTimeout(check, 50);
        };
        check();
      });
    };

    let cancelled = false;

    loadScript().then(async () => {
      if (cancelled) return;

      // Sometimes the script tag loads but the global is not yet available.
      const pollForGsi = (timeout = 1200) => {
        const start = Date.now();
        return new Promise((resolve) => {
          const check = () => {
            if (window.google && window.google.accounts && window.google.accounts.id) return resolve(true);
            if (Date.now() - start > timeout) return resolve(false);
            setTimeout(check, 50);
          };
          check();
        });
      };

      const gsiPresent = await pollForGsi(1200);
      if (!gsiPresent) {
        console.warn('GSI: window.google.accounts.id is not present after loading the script (poll timeout)');
        if (googleButtonRef.current) googleButtonRef.current.innerText = 'Continue with Google';
        setGsiReady(false);
        return;
      }

      try {
        // Initialize only once (avoid re-init during HMR)
        if (!window.google.__aipasta_gsi_initialized) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              const idToken = response?.credential;
              if (!idToken) {
                toast.error('Google authentication failed');
                return;
              }

              try {
                const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                const resp = await fetch(`${apiBase}/api/auth/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idToken })
                });

                const data = await resp.json();
                if (!resp.ok) {
                  toast.error(data.message || 'Google login failed');
                  return;
                }

                await loginWithToken(data.token, data.data?.user);
                toast.success('Logged in with Google');
                onClose();
              } catch (err) {
                console.error('Google sign-in error:', err);
                toast.error('Google sign-in failed');
              }
            }
          });
          window.google.__aipasta_gsi_initialized = true;
        }

        // Ensure placeholder exists before rendering
        await waitForPlaceholder(1200);

        const tryRender = (attemptsLeft = 5) => {
          try {
            if (!googleButtonRef.current) throw new Error('placeholder not mounted');
            window.google.accounts.id.renderButton(
              googleButtonRef.current,
              { theme: 'outline', size: 'large' }
            );
            setGsiReady(true);
          } catch (err) {
            if (attemptsLeft > 0) {
              setTimeout(() => tryRender(attemptsLeft - 1), 250);
            } else {
              console.warn('GSI: renderButton failed after retries:', err);
              if (googleButtonRef.current) googleButtonRef.current.innerText = 'Continue with Google';
              setGsiReady(false);
            }
          }
        };

        tryRender();
      } catch (err) {
        console.error('Failed to initialize Google Identity:', err);
      }
    }).catch(err => {
      console.error('Failed to load GSI:', err);
      if (googleButtonRef.current) googleButtonRef.current.innerText = 'Continue with Google';
      setGsiReady(false);
    });

    return () => { cancelled = true; };
  }, [isOpen]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      username: ''
    });
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl max-w-md w-full p-6 relative shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <IconX size={20} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            {mode === 'login' && 'Welcome back'}
            {mode === 'register' && 'Create account'}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Join AI Pasta and get 10,000 free tokens to start'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-white/30 dark:bg-white/10 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === 'login'
                ? 'bg-white/80 dark:bg-white/20 text-neutral-900 dark:text-white shadow-lg backdrop-blur-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === 'register'
                ? 'bg-white/80 dark:bg-white/20 text-neutral-900 dark:text-white shadow-lg backdrop-blur-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <IconUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-white/30 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 dark:bg-white/10 backdrop-blur-sm text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="relative">
              <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full pl-10 pr-4 py-3 border border-white/30 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 dark:bg-white/10 backdrop-blur-sm text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3 border border-white/30 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 dark:bg-white/10 backdrop-blur-sm text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </button>
            </div>
          )}

          {mode === 'register' && (
            <div className="relative">
              <IconLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-3 border border-white/30 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/50 dark:bg-white/10 backdrop-blur-sm text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400"
              />
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-400 disabled:to-purple-500 text-white py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl backdrop-blur-sm"
          >
            {loading && (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
            )}
            <span>
              {loading ? 'Processing...' : 
               mode === 'login' ? 'Sign In' :
               'Create Account'
              }
            </span>
          </button>
        </form>

        {/* Divider and Google Sign-In */}
        {(mode === 'login' || mode === 'register') && (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px bg-neutral-200 flex-1"></div>
              <div className="text-xs text-neutral-400">OR</div>
              <div className="h-px bg-neutral-200 flex-1"></div>
            </div>
            <div className="w-full flex justify-center">
              <div ref={googleButtonRef} className="min-h-[44px] flex items-center justify-center"></div>
              {gsiReady === false && (
                <button
                  type="button"
                  onClick={() => toast.info('Google Sign-In unavailable. Try email/password or check console for errors.')}
                  className="ml-2 inline-flex items-center justify-center px-4 py-2 border rounded-lg bg-white text-neutral-700 hover:bg-neutral-50"
                >
                  Continue with Google
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {mode === 'login' && (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Sign up
              </button>
            </p>
          )}
          {mode === 'register' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;