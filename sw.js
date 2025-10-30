/**
 * Service Worker for Offline Support
 * Implements caching strategies for different resource types
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `nipunap-site-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Resources to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/blog.html',
  '/projects.html',
  '/contact.html',
  '/cv.html',
  '/404.html',
  '/styles.css',
  '/script.js',
  '/css/blog-post.css',
  '/css/blog-listing.css',
  '/css/print.css',
  '/js/seo.js',
  '/js/utils.js',
  '/manifest.json'
];

// Resources that should always be fetched from network
const NETWORK_ONLY = [
  '/blogs/index.json',
  '/api/'
];

// Maximum age for cached resources (7 days)
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Install event - precache static resources
 */
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching static resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              // Delete old versions
              return cacheName.startsWith('nipunap-site-') && 
                     cacheName !== CACHE_NAME &&
                     cacheName !== RUNTIME_CACHE;
            })
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }
  
  // Network-only resources
  if (NETWORK_ONLY.some(pattern => url.pathname.includes(pattern))) {
    event.respondWith(
      fetch(request)
        .catch(error => {
          console.error('[SW] Network request failed:', error);
          return new Response('Network error', {
            status: 408,
            statusText: 'Network request failed'
          });
        })
    );
    return;
  }
  
  // HTML pages - Network first, fallback to cache
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            // Clone and cache the response
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return 404 page if available
              return caches.match('/404.html');
            });
        })
    );
    return;
  }
  
  // Static assets - Cache first, fallback to network
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'font' ||
      request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Check cache age
            return cachedResponse.headers.get('date')
              ? checkCacheAge(cachedResponse, request)
              : cachedResponse;
          }
          
          // Fetch from network and cache
          return fetch(request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }
  
  // API and dynamic content - Network first, cache as fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then(cachedResponse => {
            if (cachedResponse) {
              console.log('[SW] Serving stale content for:', request.url);
              return cachedResponse;
            }
            throw new Error('No cached response available');
          });
      })
  );
});

/**
 * Check if cached response is too old and refresh if needed
 */
function checkCacheAge(cachedResponse, request) {
  const dateHeader = cachedResponse.headers.get('date');
  const cacheTime = new Date(dateHeader).getTime();
  const now = Date.now();
  
  if (now - cacheTime > MAX_AGE) {
    console.log('[SW] Cache expired, fetching fresh:', request.url);
    // Fetch fresh copy in background
    fetch(request)
      .then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, response);
          });
        }
      })
      .catch(error => {
        console.error('[SW] Background fetch failed:', error);
      });
  }
  
  return cachedResponse;
}

/**
 * Message handler for cache management
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      })
    );
  }
});

/**
 * Background sync for failed requests
 */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(
      // Retry failed requests
      console.log('[SW] Background sync triggered')
    );
  }
});

/**
 * Push notification handler (for future use)
 */
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New content available',
    icon: '/assets/icon-192x192.png',
    badge: '/assets/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('Nipuna Perera', options)
  );
});

console.log('[SW] Service Worker loaded');

