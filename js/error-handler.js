/**
 * Global Error Handler Module
 * Provides comprehensive error handling and recovery
 */

(function() {
  'use strict';

  /**
   * Error types
   */
  const ErrorType = {
    NETWORK: 'network',
    TIMEOUT: 'timeout',
    NOT_FOUND: 'not_found',
    PARSE: 'parse',
    UNKNOWN: 'unknown'
  };

  /**
   * Error logging
   */
  function logError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('[Error Handler]', errorInfo);

    // TODO: Send to analytics or error tracking service
    // if (window.analytics) {
    //   window.analytics.trackError(errorInfo);
    // }

    return errorInfo;
  }

  /**
   * Determine error type
   */
  function getErrorType(error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return ErrorType.NETWORK;
    }
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    if (error.message.includes('404') || error.message.includes('not found')) {
      return ErrorType.NOT_FOUND;
    }
    if (error.name === 'SyntaxError' || error.message.includes('JSON')) {
      return ErrorType.PARSE;
    }
    return ErrorType.UNKNOWN;
  }

  /**
   * Get user-friendly error message
   */
  function getUserMessage(errorType) {
    const messages = {
      [ErrorType.NETWORK]: 'Unable to connect. Please check your internet connection and try again.',
      [ErrorType.TIMEOUT]: 'The request took too long. Please try again.',
      [ErrorType.NOT_FOUND]: 'The requested content could not be found.',
      [ErrorType.PARSE]: 'There was a problem loading the content. Please refresh the page.',
      [ErrorType.UNKNOWN]: 'Something went wrong. Please try again later.'
    };

    return messages[errorType] || messages[ErrorType.UNKNOWN];
  }

  /**
   * Display error to user
   */
  function displayError(message, container, options = {}) {
    const {
      retry = null,
      dismissible = true,
      type = 'error'
    } = options;

    const errorDiv = document.createElement('div');
    errorDiv.className = `error-message error-${type}`;
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'assertive');

    let html = `
      <div class="error-content">
        <div class="error-icon">
          ${type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : 'ℹ️'}
        </div>
        <div class="error-text">
          <strong>${type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Notice'}</strong>
          <p>${message}</p>
        </div>
      </div>
    `;

    if (retry || dismissible) {
      html += '<div class="error-actions">';
      if (retry) {
        html += `<button class="error-retry-btn" aria-label="Retry">Retry</button>`;
      }
      if (dismissible) {
        html += `<button class="error-dismiss-btn" aria-label="Dismiss">Dismiss</button>`;
      }
      html += '</div>';
    }

    errorDiv.innerHTML = html;

    // Add event listeners
    if (retry) {
      errorDiv.querySelector('.error-retry-btn').addEventListener('click', () => {
        errorDiv.remove();
        retry();
      });
    }

    if (dismissible) {
      errorDiv.querySelector('.error-dismiss-btn').addEventListener('click', () => {
        errorDiv.remove();
      });
    }

    // Replace existing content or append
    if (container) {
      container.innerHTML = '';
      container.appendChild(errorDiv);
    }

    // Auto-dismiss after 10 seconds for non-critical errors
    if (dismissible && type !== 'error') {
      setTimeout(() => {
        if (errorDiv.parentElement) {
          errorDiv.remove();
        }
      }, 10000);
    }

    return errorDiv;
  }

  /**
   * Fetch with retry and timeout
   */
  async function fetchWithRetry(url, options = {}) {
    const {
      retries = 3,
      timeout = 10000,
      backoff = 1000,
      ...fetchOptions
    } = options;

    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        
        // Don't retry on 404 or other client errors
        if (error.message.includes('404') || error.message.includes('4')) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (i < retries - 1) {
          const delay = backoff * Math.pow(2, i);
          console.log(`[Retry] Attempt ${i + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Safe JSON parse
   */
  function safeJSONParse(text, fallback = null) {
    try {
      return JSON.parse(text);
    } catch (error) {
      logError(error, { operation: 'JSON.parse', text: text.substring(0, 100) });
      return fallback;
    }
  }

  /**
   * Wrap async function with error handling
   */
  function withErrorHandling(asyncFn, errorContainer, options = {}) {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        const errorType = getErrorType(error);
        const userMessage = getUserMessage(errorType);
        
        logError(error, {
          function: asyncFn.name,
          args: args,
          errorType: errorType
        });

        if (errorContainer) {
          displayError(userMessage, errorContainer, {
            retry: options.retry ? () => asyncFn(...args) : null,
            dismissible: options.dismissible !== false
          });
        }

        if (options.rethrow) {
          throw error;
        }

        return options.fallback || null;
      }
    };
  }

  /**
   * Global error handlers
   */
  function initGlobalHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      logError(event.reason, { type: 'unhandledRejection' });
      
      // Show user-friendly message
      const message = 'An unexpected error occurred. The page may not work correctly.';
      showGlobalError(message);
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      logError(event.error || new Error(event.message), {
        type: 'globalError',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }

  /**
   * Show global error notification
   */
  function showGlobalError(message) {
    const existing = document.querySelector('.global-error-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'global-error-notification';
    notification.setAttribute('role', 'alert');
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">⚠️</span>
        <span class="notification-text">${message}</span>
        <button class="notification-close" aria-label="Close">×</button>
      </div>
    `;

    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.remove();
    });

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Add error handling styles
   */
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .error-message {
        background: #fef2f2;
        border: 2px solid #ef4444;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .error-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .error-icon {
        font-size: 24px;
        line-height: 1;
      }

      .error-text strong {
        display: block;
        color: #991b1b;
        margin-bottom: 8px;
        font-size: 1.1em;
      }

      .error-text p {
        color: #7f1d1d;
        margin: 0;
        line-height: 1.6;
      }

      .error-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #fecaca;
      }

      .error-retry-btn,
      .error-dismiss-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-family: var(--font-mono);
        font-size: 0.9em;
        cursor: pointer;
        transition: all 0.2s;
      }

      .error-retry-btn {
        background: #ef4444;
        color: white;
        font-weight: 500;
      }

      .error-retry-btn:hover {
        background: #dc2626;
      }

      .error-dismiss-btn {
        background: transparent;
        color: #991b1b;
        border: 1px solid #fecaca;
      }

      .error-dismiss-btn:hover {
        background: #fecaca;
      }

      .error-warning {
        background: #fef3c7;
        border-color: #f59e0b;
      }

      .error-warning .error-text strong {
        color: #92400e;
      }

      .error-warning .error-text p {
        color: #78350f;
      }

      .global-error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #ef4444;
        border-radius: 8px;
        padding: 16px 20px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .notification-icon {
        font-size: 20px;
      }

      .notification-text {
        flex: 1;
        color: #7f1d1d;
        font-size: 0.95em;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #991b1b;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        line-height: 1;
        transition: color 0.2s;
      }

      .notification-close:hover {
        color: #dc2626;
      }

      @media (max-width: 768px) {
        .global-error-notification {
          left: 10px;
          right: 10px;
          top: 10px;
          max-width: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initGlobalHandlers();
      injectStyles();
    });
  } else {
    initGlobalHandlers();
    injectStyles();
  }

  // Export API
  window.ErrorHandler = {
    logError,
    displayError,
    fetchWithRetry,
    safeJSONParse,
    withErrorHandling,
    getErrorType,
    getUserMessage,
    ErrorType
  };

  console.log('[Error Handler] Initialized');
})();

