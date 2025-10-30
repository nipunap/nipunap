/**
 * Main Application Module
 * Handles service worker registration, PWA features, and app initialization
 */

(function() {
  'use strict';

  /**
   * Register service worker for offline support
   */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then(registration => {
            console.log('[App] Service Worker registered:', registration.scope);
            
            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available, show update notification
                  showUpdateNotification();
                }
              });
            });
          })
          .catch(error => {
            console.error('[App] Service Worker registration failed:', error);
          });
      });
    }
  }

  /**
   * Show notification when new version is available
   */
  function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--terminal-green-bright);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      font-family: var(--font-mono);
      font-size: 14px;
      max-width: 300px;
    `;
    
    notification.innerHTML = `
      <div style="margin-bottom: 8px;">
        <strong>Update Available</strong>
      </div>
      <div style="margin-bottom: 12px; font-size: 13px;">
        A new version of this site is available.
      </div>
      <button 
        onclick="location.reload()" 
        style="
          background: white;
          color: var(--terminal-green-bright);
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--font-mono);
          font-weight: 500;
          margin-right: 8px;
        ">
        Reload
      </button>
      <button 
        onclick="this.parentElement.remove()" 
        style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-family: var(--font-mono);
        ">
        Later
      </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Initialize PWA install prompt
   */
  function initInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button if needed
      const installButton = document.getElementById('install-button');
      if (installButton) {
        installButton.style.display = 'block';
        
        installButton.addEventListener('click', async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[App] Install prompt outcome:', outcome);
            deferredPrompt = null;
            installButton.style.display = 'none';
          }
        });
      }
    });

    // Detect if already installed
    window.addEventListener('appinstalled', () => {
      console.log('[App] PWA installed');
      deferredPrompt = null;
    });
  }

  /**
   * Add keyboard shortcuts
   */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Alt + H: Go to home
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        window.location.href = '/index.html';
      }
      
      // Alt + B: Go to blog
      if (e.altKey && e.key === 'b') {
        e.preventDefault();
        window.location.href = '/blog.html';
      }
      
      // Alt + P: Go to projects
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        window.location.href = '/projects.html';
      }
      
      // Alt + C: Go to contact
      if (e.altKey && e.key === 'c') {
        e.preventDefault();
        window.location.href = '/contact.html';
      }
      
      // Ctrl + K: Focus search (if exists)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    });
  }

  /**
   * Initialize performance monitoring
   */
  function initPerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('[Performance] LCP:', lastEntry.renderTime || lastEntry.loadTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        console.warn('[Performance] LCP observation not supported');
      }

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          console.log('[Performance] FID:', entry.processingStart - entry.startTime);
        });
      });
      
      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        console.warn('[Performance] FID observation not supported');
      }
    }

    // Log navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          console.log('[Performance] Load time:', perfData.loadEventEnd - perfData.fetchStart, 'ms');
          console.log('[Performance] DOM ready:', perfData.domContentLoadedEventEnd - perfData.fetchStart, 'ms');
        }
      }, 0);
    });
  }

  /**
   * Initialize dark mode toggle (if needed)
   */
  function initThemeToggle() {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Listen for theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
      });
    }
  }

  /**
   * Initialize application
   */
  function init() {
    console.log('[App] Initializing...');
    
    registerServiceWorker();
    initInstallPrompt();
    initKeyboardShortcuts();
    initPerformanceMonitoring();
    initThemeToggle();
    
    console.log('[App] Initialized');
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for manual control if needed
  window.App = {
    init,
    registerServiceWorker,
    showUpdateNotification
  };
})();

