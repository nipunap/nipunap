/**
 * Privacy-Friendly Analytics Module
 * Simple, GDPR-compliant analytics tracking
 */

(function() {
  'use strict';

  // Configuration
  const config = {
    enabled: false, // Set to true when you add analytics service
    service: 'none', // 'plausible', 'fathom', 'ga4', 'matomo', or 'none'
    respectDNT: true, // Respect Do Not Track header
    
    // Service-specific settings
    plausible: {
      domain: 'nipunap.github.io',
      apiHost: 'https://plausible.io'
    },
    fathom: {
      siteId: 'YOUR_SITE_ID'
    },
    ga4: {
      measurementId: 'G-XXXXXXXXXX'
    },
    matomo: {
      url: 'https://your-matomo.com/',
      siteId: 1
    }
  };

  /**
   * Check if tracking should be enabled
   */
  function shouldTrack() {
    // Check if analytics is enabled
    if (!config.enabled) {
      return false;
    }

    // Respect Do Not Track
    if (config.respectDNT && navigator.doNotTrack === '1') {
      console.log('[Analytics] Tracking disabled (DNT)');
      return false;
    }

    // Don't track localhost
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
      console.log('[Analytics] Tracking disabled (localhost)');
      return false;
    }

    return true;
  }

  /**
   * Initialize Plausible Analytics
   */
  function initPlausible() {
    const script = document.createElement('script');
    script.defer = true;
    script.src = `${config.plausible.apiHost}/js/script.js`;
    script.dataset.domain = config.plausible.domain;
    document.head.appendChild(script);

    console.log('[Analytics] Plausible initialized');
  }

  /**
   * Initialize Fathom Analytics
   */
  function initFathom() {
    const script = document.createElement('script');
    script.src = 'https://cdn.usefathom.com/script.js';
    script.dataset.site = config.fathom.siteId;
    script.defer = true;
    document.head.appendChild(script);

    console.log('[Analytics] Fathom initialized');
  }

  /**
   * Initialize Google Analytics 4
   */
  function initGA4() {
    // Load gtag.js
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4.measurementId}`;
    document.head.appendChild(script1);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', config.ga4.measurementId, {
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure'
    });

    console.log('[Analytics] Google Analytics 4 initialized');
  }

  /**
   * Initialize Matomo
   */
  function initMatomo() {
    window._paq = window._paq || [];
    _paq.push(['trackPageView']);
    _paq.push(['enableLinkTracking']);
    
    const script = document.createElement('script');
    script.async = true;
    script.src = `${config.matomo.url}matomo.js`;
    document.head.appendChild(script);

    _paq.push(['setTrackerUrl', `${config.matomo.url}matomo.php`]);
    _paq.push(['setSiteId', config.matomo.siteId]);

    console.log('[Analytics] Matomo initialized');
  }

  /**
   * Track page view
   */
  function trackPageView(path = null) {
    if (!shouldTrack()) return;

    const pagePath = path || window.location.pathname + window.location.search;

    switch (config.service) {
      case 'plausible':
        if (window.plausible) {
          window.plausible('pageview');
        }
        break;

      case 'fathom':
        if (window.fathom) {
          window.fathom.trackPageview();
        }
        break;

      case 'ga4':
        if (window.gtag) {
          window.gtag('event', 'page_view', {
            page_path: pagePath
          });
        }
        break;

      case 'matomo':
        if (window._paq) {
          window._paq.push(['setCustomUrl', pagePath]);
          window._paq.push(['trackPageView']);
        }
        break;
    }

    console.log('[Analytics] Page view tracked:', pagePath);
  }

  /**
   * Track custom event
   */
  function trackEvent(eventName, properties = {}) {
    if (!shouldTrack()) return;

    switch (config.service) {
      case 'plausible':
        if (window.plausible) {
          window.plausible(eventName, { props: properties });
        }
        break;

      case 'fathom':
        if (window.fathom) {
          window.fathom.trackGoal(eventName, properties.value || 0);
        }
        break;

      case 'ga4':
        if (window.gtag) {
          window.gtag('event', eventName, properties);
        }
        break;

      case 'matomo':
        if (window._paq) {
          window._paq.push(['trackEvent', 
            properties.category || 'General',
            eventName,
            properties.label || '',
            properties.value || 0
          ]);
        }
        break;
    }

    console.log('[Analytics] Event tracked:', eventName, properties);
  }

  /**
   * Track outbound link click
   */
  function trackOutboundLink(url) {
    trackEvent('Outbound Link', {
      category: 'Engagement',
      label: url,
      url: url
    });
  }

  /**
   * Track blog post read
   */
  function trackBlogPostRead(postId, readPercentage) {
    if (readPercentage >= 90) {
      trackEvent('Blog Post Completed', {
        category: 'Content',
        label: postId,
        value: 100
      });
    }
  }

  /**
   * Track download
   */
  function trackDownload(filename) {
    trackEvent('File Download', {
      category: 'Downloads',
      label: filename
    });
  }

  /**
   * Automatically track outbound links
   */
  function setupOutboundTracking() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Check if external link
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        trackOutboundLink(href);
      }

      // Check if download
      if (link.hasAttribute('download') || 
          href.match(/\.(pdf|zip|doc|docx|xls|xlsx)$/i)) {
        trackDownload(href.split('/').pop());
      }
    });
  }

  /**
   * Track scroll depth
   */
  function setupScrollTracking() {
    let maxScroll = 0;
    let tracked = new Set();

    const trackScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100
      );

      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;

        // Track at 25%, 50%, 75%, 100%
        [25, 50, 75, 100].forEach(threshold => {
          if (scrollPercent >= threshold && !tracked.has(threshold)) {
            tracked.add(threshold);
            trackEvent('Scroll Depth', {
              category: 'Engagement',
              label: `${threshold}%`,
              value: threshold
            });
          }
        });
      }
    };

    window.addEventListener('scroll', () => {
      if (!scrolling) {
        scrolling = true;
        requestAnimationFrame(() => {
          trackScroll();
          scrolling = false;
        });
      }
    });

    let scrolling = false;
  }

  /**
   * Track time on page
   */
  function setupTimeTracking() {
    const startTime = Date.now();

    window.addEventListener('beforeunload', () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      
      trackEvent('Time on Page', {
        category: 'Engagement',
        label: window.location.pathname,
        value: timeSpent
      });
    });
  }

  /**
   * Initialize analytics
   */
  function init() {
    if (!shouldTrack()) {
      console.log('[Analytics] Tracking disabled');
      return;
    }

    // Initialize selected service
    switch (config.service) {
      case 'plausible':
        initPlausible();
        break;
      case 'fathom':
        initFathom();
        break;
      case 'ga4':
        initGA4();
        break;
      case 'matomo':
        initMatomo();
        break;
      default:
        console.log('[Analytics] No analytics service configured');
        return;
    }

    // Setup automatic tracking
    setupOutboundTracking();
    setupScrollTracking();
    setupTimeTracking();

    // Track initial page view
    trackPageView();

    console.log('[Analytics] Initialized with service:', config.service);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API
  window.Analytics = {
    config,
    init,
    trackPageView,
    trackEvent,
    trackOutboundLink,
    trackBlogPostRead,
    trackDownload
  };

  console.log('[Analytics] Module loaded (currently disabled)');
  console.log('[Analytics] To enable: Set Analytics.config.enabled = true and configure service');
})();

