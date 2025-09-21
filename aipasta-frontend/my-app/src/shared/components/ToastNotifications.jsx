import React, { useState, useCallback, useMemo } from 'react';
import { IconX, IconCheck, IconExclamationCircle, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-react';

// Toast context and provider
const ToastContext = React.createContext();

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type, // success, error, warning, info
      duration,
      timestamp: Date.now()
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove toast after duration
    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id);
      }, duration);
      
      // Store timeout ID to prevent memory leaks
      return () => clearTimeout(timeoutId);
    }

    return id;
  }, [removeToast]);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    toasts, 
    addToast, 
    removeToast, 
    clearAllToasts,
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  }), [toasts, addToast, removeToast, clearAllToasts]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Individual toast component
const Toast = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <IconCheck className="w-5 h-5 text-green-500 flex-shrink-0" />;
      case 'error':
        return <IconExclamationCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <IconAlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
      default:
        return <IconInfoCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div className={`
      ${getStyles()}
      border rounded-lg p-4 shadow-lg backdrop-blur-sm
      animate-in slide-in-from-right duration-300 ease-out
      max-w-sm w-full mx-auto
    `}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed">
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <IconX className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Toast container component
const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
};

export default ToastProvider;