import React, { useState, useEffect } from 'react';
import { checkBackendHealth } from '../../lib/api-client';

const BackendStatus = ({ showOnlineStatus = false, className = '' }) => {
  const [backendOnline, setBackendOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let interval;
    let isActive = true;

    const checkHealth = async () => {
      if (!isActive) return;
      
      setIsChecking(true);
      try {
        const isHealthy = await checkBackendHealth();
        if (isActive) {
          setBackendOnline(isHealthy);
        }
      } catch (error) {
        if (isActive) {
          setBackendOnline(false);
        }
      } finally {
        if (isActive) {
          setIsChecking(false);
        }
      }
    };

    // Check immediately
    checkHealth();
    
    // Then check every 30 seconds
    interval = setInterval(checkHealth, 30000);

    return () => {
      isActive = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Don't show anything if backend is online (unless explicitly requested)
  if (backendOnline && !showOnlineStatus) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {backendOnline ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs text-green-700 dark:text-green-300">Connected</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-700 dark:text-red-300">
            {isChecking ? 'Checking...' : 'Backend offline'}
          </span>
        </>
      )}
    </div>
  );
};

export default BackendStatus;