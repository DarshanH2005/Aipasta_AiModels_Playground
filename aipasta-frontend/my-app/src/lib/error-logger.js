// Error logging and monitoring utilities
class ErrorLogger {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  }

  // Log errors to console in development, send to monitoring service in production
  async logError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      context
    };

    // Always log to console
    console.error('Error logged:', errorData);

    // In production, send to error monitoring service
    if (this.isProduction) {
      try {
        await this.sendToMonitoringService(errorData);
      } catch (sendError) {
        console.error('Failed to send error to monitoring service:', sendError);
      }
    }
  }

  // Log user actions for debugging
  logUserAction(action, data = {}) {
    if (!this.isProduction) {
      console.log('User Action:', { action, data, timestamp: new Date().toISOString() });
    }
  }

  // Log API errors with more context
  async logAPIError(endpoint, error, requestData = {}) {
    const context = {
      type: 'API_ERROR',
      endpoint,
      requestData,
      errorType: error.name || 'Unknown'
    };

    await this.logError(error, context);
  }

  // Log authentication errors
  async logAuthError(action, error, userData = {}) {
    const context = {
      type: 'AUTH_ERROR',
      action, // login, register, logout, etc.
      userData: {
        ...userData,
        // Never log sensitive data
        password: undefined,
        token: undefined
      }
    };

    await this.logError(error, context);
  }

  // Send error data to monitoring service (implement based on your service)
  async sendToMonitoringService(errorData) {
    // Example implementations:
    
    // 1. Send to your own backend endpoint
    try {
      await fetch(`${this.apiBase}/api/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorData)
      });
    } catch {
      // Silently fail if error logging fails
    }

    // 2. Send to external service like Sentry, LogRocket, etc.
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { contexts: { errorData } });
    // }

    // 3. Send to analytics service
    // if (window.gtag) {
    //   window.gtag('event', 'exception', {
    //     description: errorData.message,
    //     fatal: false
    //   });
    // }
  }

  // Performance monitoring
  startPerformanceTimer(label) {
    if (!this.isProduction && typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${label}-start`);
    }
  }

  endPerformanceTimer(label) {
    if (!this.isProduction && typeof window !== 'undefined' && window.performance) {
      try {
        window.performance.mark(`${label}-end`);
        window.performance.measure(label, `${label}-start`, `${label}-end`);
        
        const measures = window.performance.getEntriesByName(label);
        if (measures.length > 0) {
          console.log(`Performance: ${label} took ${measures[0].duration.toFixed(2)}ms`);
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

// Convenience functions
export const logError = (error, context) => errorLogger.logError(error, context);
export const logUserAction = (action, data) => errorLogger.logUserAction(action, data);
export const logAPIError = (endpoint, error, requestData) => errorLogger.logAPIError(endpoint, error, requestData);
export const logAuthError = (action, error, userData) => errorLogger.logAuthError(action, error, userData);
export const startTimer = (label) => errorLogger.startPerformanceTimer(label);
export const endTimer = (label) => errorLogger.endPerformanceTimer(label);

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logError(new Error(event.reason), { type: 'UNHANDLED_PROMISE_REJECTION' });
  });

  // Global error handler for uncaught errors
  window.addEventListener('error', (event) => {
    logError(event.error || new Error(event.message), { 
      type: 'UNCAUGHT_ERROR',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
}

export default errorLogger;