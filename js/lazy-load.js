/**
 * Lazy Loading Module
 * Handles lazy loading of images and other resources
 */

(function() {
  'use strict';

  /**
   * Intersection Observer for lazy loading
   */
  let observer;

  /**
   * Initialize lazy loading
   */
  function init() {
    // Check for Intersection Observer support
    if (!('IntersectionObserver' in window)) {
      console.warn('[Lazy Load] IntersectionObserver not supported, loading all images');
      loadAllImages();
      return;
    }

    // Create observer
    observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            loadImage(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Start loading 50px before entering viewport
        threshold: 0.01
      }
    );

    // Observe all lazy images
    observeImages();

    console.log('[Lazy Load] Initialized');
  }

  /**
   * Observe all images with lazy loading attributes
   */
  function observeImages() {
    const images = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    images.forEach(img => {
      if (img.dataset.src) {
        observer.observe(img);
      }
    });
  }

  /**
   * Load a single image
   */
  function loadImage(img) {
    // Load main image
    if (img.dataset.src) {
      img.src = img.dataset.src;
      delete img.dataset.src;
    }

    // Load srcset if available
    if (img.dataset.srcset) {
      img.srcset = img.dataset.srcset;
      delete img.dataset.srcset;
    }

    // Add loaded class
    img.classList.add('lazy-loaded');

    // Handle load/error events
    img.addEventListener('load', () => {
      img.classList.add('loaded');
      img.removeAttribute('data-loading');
    });

    img.addEventListener('error', () => {
      console.error('[Lazy Load] Failed to load image:', img.src);
      img.classList.add('load-error');
      img.alt = 'Failed to load image';
    });
  }

  /**
   * Load all images immediately (fallback)
   */
  function loadAllImages() {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(loadImage);
  }

  /**
   * Create responsive image
   */
  function createResponsiveImage(src, alt, options = {}) {
    const {
      sizes = '100vw',
      srcset = null,
      lazy = true,
      className = '',
      width = null,
      height = null
    } = options;

    const img = document.createElement('img');
    img.alt = alt || '';
    
    if (className) {
      img.className = className;
    }

    if (width) {
      img.width = width;
    }

    if (height) {
      img.height = height;
    }

    if (lazy) {
      img.dataset.src = src;
      if (srcset) {
        img.dataset.srcset = srcset;
      }
      img.loading = 'lazy';
      img.setAttribute('data-loading', 'true');
      
      // Add placeholder
      img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + 
                (width || 800) + ' ' + (height || 600) + '"%3E%3C/svg%3E';
    } else {
      img.src = src;
      if (srcset) {
        img.srcset = srcset;
      }
    }

    if (sizes && srcset) {
      img.sizes = sizes;
    }

    return img;
  }

  /**
   * Generate srcset for image
   */
  function generateSrcset(basePath, filename, widths = [320, 640, 960, 1280, 1920]) {
    const ext = filename.split('.').pop();
    const name = filename.replace(`.${ext}`, '');
    
    return widths
      .map(width => `${basePath}/${name}-${width}w.${ext} ${width}w`)
      .join(', ');
  }

  /**
   * Preload critical images
   */
  function preloadImages(urls) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Add lazy loading styles
   */
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      img[data-loading] {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s ease-in-out infinite;
      }

      @keyframes loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      img.lazy-loaded {
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      img.load-error {
        border: 2px dashed #ef4444;
        background: #fef2f2;
        padding: 20px;
        min-height: 100px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Update lazy images when new content is loaded
   */
  function update() {
    if (observer) {
      observeImages();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      injectStyles();
    });
  } else {
    init();
    injectStyles();
  }

  // Export API
  window.LazyLoad = {
    init,
    update,
    createResponsiveImage,
    generateSrcset,
    preloadImages,
    loadImage
  };
})();

