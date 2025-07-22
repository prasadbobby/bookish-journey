// villagestay-frontend/public/sw.js
const CACHE_NAME = 'villagestay-v1.2.0';
const OFFLINE_PAGE = '/offline';
const API_CACHE_NAME = 'villagestay-api-v1.0.0';

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/offline',
  '/listings',
  '/auth/login',
  '/manifest.json',
  // Add your static assets
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Add critical CSS and JS files
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/listings',
  '/api/auth/profile',
  '/api/impact',
];

// Supported schemes for caching
const CACHEABLE_SCHEMES = ['http', 'https'];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('✅ Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Helper function to check if request is cacheable
function isCacheableRequest(request) {
  const url = new URL(request.url);
  
  // Only cache supported schemes
  if (!CACHEABLE_SCHEMES.includes(url.protocol.slice(0, -1))) {
    return false;
  }
  
  // Skip extension requests
  if (url.protocol.startsWith('chrome-extension') || 
      url.protocol.startsWith('moz-extension') || 
      url.protocol.startsWith('safari-extension')) {
    return false;
  }
  
  // Skip data URLs
  if (url.protocol === 'data:') {
    return false;
  }
  
  return true;
}

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-cacheable requests
  if (!isCacheableRequest(request)) {
    return;
  }
  
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  }
  // Handle page requests
  else if (request.mode === 'navigate') {
    event.respondWith(handlePageRequest(request));
  }
  // Handle static resources
  else {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  // Additional check for API requests
  if (!isCacheableRequest(request)) {
    return fetch(request);
  }

  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      // Clone response for cache
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('🌐 Service Worker: Network failed, trying cache for API');
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add offline indicator header
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-By', 'cache');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    // Return offline response for critical API endpoints
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Please check your connection.',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle page requests with cache-first for performance
async function handlePageRequest(request) {
  // Additional check for page requests
  if (!isCacheableRequest(request)) {
    return fetch(request);
  }

  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Check cache first for faster loading
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Update cache in background
      fetch(request)
        .then((response) => {
          if (response.ok && isCacheableRequest(request)) {
            cache.put(request, response.clone()).catch(console.error);
          }
        })
        .catch(() => {});
      
      return cachedResponse;
    }
    
    // Try network if not in cache
    const response = await fetch(request);
    
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('🌐 Service Worker: Serving offline page');
    
    // Serve offline page
    const offlineResponse = await cache.match(OFFLINE_PAGE);
    return offlineResponse || new Response('Offline');
  }
}

// Handle static resources with cache-first strategy
async function handleStaticRequest(request) {
  // Additional check for static requests
  if (!isCacheableRequest(request)) {
    return fetch(request);
  }

  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to network
    const response = await fetch(request);
    
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('❌ Service Worker: Failed to fetch resource', request.url);
    // Return the error instead of throwing it to prevent unhandled promise rejection
    return new Response('Resource not available offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Background sync for bookings and favorites
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync-bookings') {
    event.waitUntil(syncBookings());
  }
  
  if (event.tag === 'background-sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📬 Service Worker: Push notification received');
  
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: data.image,
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/view-action.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss-action.png'
      }
    ],
    tag: data.tag || 'villagestay-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    silent: false,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Handle different notification types
  let url = '/';
  
  if (data) {
    switch (data.type) {
      case 'booking_confirmation':
        url = `/bookings/${data.bookingId}`;
        break;
      case 'weather_alert':
        url = `/listings?weather=true&location=${data.location}`;
        break;
      case 'price_alert':
        url = `/listings/${data.listingId}`;
        break;
      case 'new_message':
        url = `/messages/${data.conversationId}`;
        break;
      default:
        url = data.url || '/';
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Utility functions for background sync
async function syncBookings() {
  try {
    const offlineBookings = await getOfflineData('bookings');
    
    for (const booking of offlineBookings) {
      try {
        await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(booking)
        });
        
        // Remove from offline storage
        await removeOfflineData('bookings', booking.id);
      } catch (error) {
        console.error('Failed to sync booking:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

async function syncFavorites() {
  try {
    const offlineFavorites = await getOfflineData('favorites');
    
    for (const favorite of offlineFavorites) {
      try {
        await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(favorite)
        });
        
        await removeOfflineData('favorites', favorite.id);
      } catch (error) {
        console.error('Failed to sync favorite:', error);
      }
    }
  } catch (error) {
    console.error('Favorites sync failed:', error);
  }
}

// IndexedDB helpers for offline data
async function getOfflineData(store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageStayOffline', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const getRequest = objectStore.getAll();
      
      getRequest.onsuccess = () => {
        resolve(getRequest.result);
      };
      
      getRequest.onerror = () => {
        reject(getRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}
 
async function removeOfflineData(store, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageStayOffline', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const deleteRequest = objectStore.delete(id);
      
      deleteRequest.onsuccess = () => {
        resolve();
      };
      
      deleteRequest.onerror = () => {
        reject(deleteRequest.error);
      };
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}