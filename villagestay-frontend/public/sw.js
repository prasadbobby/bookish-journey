// villagestay-frontend/public/sw.js - Clean WebLLM Support Only

const CACHE_NAME = 'villagestay-v1.4.0';
const OFFLINE_PAGE = '/offline';
const API_CACHE_NAME = 'villagestay-api-v1.2.0';
const WEBLLM_CACHE = 'villagestay-webllm-v1.0.0';

// Check if we're in development mode
const isDevelopment = () => {
  return self.location.hostname === 'localhost' || 
         self.location.hostname === '127.0.0.1' ||
         self.location.hostname === '0.0.0.0' ||
         self.location.port === '3000';
};

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/offline',
  '/listings',
  '/auth/login',
  '/host/dashboard',
  '/tourist/dashboard',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/badge-72x72.png',
];

// WebLLM model files to cache (these will be downloaded by WebLLM itself)
const WEBLLM_MODEL_PATTERNS = [
  'https://huggingface.co/mlc-ai/',
  'https://cdn.jsdelivr.net/npm/@mlc-ai/',
  '/static/js/chunk', // Next.js chunks containing WebLLM
  'wasm', // WebAssembly files
  '.wasm',
  'onnx', // ONNX model files
  '.onnx'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/listings',
  '/api/auth/profile',
  '/api/impact',
  '/api/bookings',
  '/api/ai-features',
];

// Essential emergency contacts only (no mock responses)
const EMERGENCY_CONTACTS = {
  police: 100,
  fire: 101,
  ambulance: 108,
  disaster: 108,
  tourist: 1363,
  women: 1091
};

// Supported schemes for caching
const CACHEABLE_SCHEMES = ['http', 'https'];

// Install event - cache static resources and prepare for WebLLM
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing with WebLLM support...');
  
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('📦 Service Worker: Caching static resources');
          return cache.addAll(STATIC_RESOURCES);
        }),
      
      // Prepare WebLLM cache (will be populated by WebLLM itself)
      caches.open(WEBLLM_CACHE)
        .then((cache) => {
          console.log('🤖 Service Worker: WebLLM cache prepared');
          return Promise.resolve();
        })
    ])
    .then(() => {
      console.log('✅ Service Worker: Installed successfully with WebLLM support');
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
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== WEBLLM_CACHE &&
                !cacheName.includes('mlc-ai')) { // Keep WebLLM related caches
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

// Check if request is for WebLLM resources
function isWebLLMRequest(request) {
  const url = request.url.toLowerCase();
  return WEBLLM_MODEL_PATTERNS.some(pattern => url.includes(pattern.toLowerCase()));
}

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-cacheable requests
  if (!isCacheableRequest(request)) {
    return;
  }
  
  const url = new URL(request.url);

  // Handle WebLLM model requests with special caching
  if (isWebLLMRequest(request)) {
    event.respondWith(handleWebLLMRequest(request));
    return;
  }

  // In development mode, don't intercept API requests
  if (isDevelopment() && url.pathname.startsWith('/api/')) {
    console.log('🔧 Service Worker: Skipping API interception in development:', url.pathname);
    return;
  }

  // Handle emergency contacts only (no AI fallback)
  if (url.pathname.startsWith('/api/emergency-contacts')) {
    event.respondWith(handleEmergencyContacts(request));
  }
  // Handle API requests (only in production)
  else if (url.pathname.startsWith('/api/')) {
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

// Handle WebLLM model requests with aggressive caching
async function handleWebLLMRequest(request) {
  const cache = await caches.open(WEBLLM_CACHE);
  
  try {
    // Always try cache first for WebLLM resources (they're large and stable)
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('🤖 Service Worker: Serving WebLLM resource from cache');
      return cachedResponse;
    }
    
    // Fetch from network if not cached
    console.log('🌐 Service Worker: Fetching WebLLM resource from network');
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache WebLLM resources aggressively
      await cache.put(request, response.clone());
      console.log('✅ Service Worker: WebLLM resource cached');
    }
    
    return response;
  } catch (error) {
    console.error('❌ Service Worker: Failed to fetch WebLLM resource', error);
    throw error;
  }
}

// Handle only emergency contacts (no mock AI responses)
async function handleEmergencyContacts(request) {
  return new Response(
    JSON.stringify({
      contacts: EMERGENCY_CONTACTS,
      timestamp: new Date().toISOString(),
      source: 'service-worker'
    }),
    {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Served-By': 'emergency-contacts'
      }
    }
  );
}

// Handle API requests with network-first strategy (production only)
async function handleApiRequest(request) {
  if (!isCacheableRequest(request)) {
    return fetch(request);
  }

  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    console.log('🌐 Service Worker: Trying network for API request');
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const responseClone = response.clone();
      await cache.put(request, responseClone);
      console.log('✅ Service Worker: Cached API response');
    }
    
    return response;
  } catch (error) {
    console.log('🌐 Service Worker: Network failed, trying cache for API');
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-By', 'cache');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    // Return simple offline response
    return new Response(
      JSON.stringify({
        error: 'Network Error',
        message: 'No internet connection available.',
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
    return new Response('Resource not available offline', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

// Background sync for essential data only
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync-bookings') {
    event.waitUntil(syncBookings());
  }
  
  if (event.tag === 'background-sync-favorites') {
    event.waitUntil(syncFavorites());
  }
  
  if (event.tag === 'sync-webllm-usage') {
    event.waitUntil(syncWebLLMUsage());
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
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    tag: data.tag || 'villagestay-notification',
    requireInteraction: false,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked');
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  let url = '/';
  
  if (data) {
    switch (data.type) {
      case 'booking_confirmation':
        url = `/bookings/${data.bookingId}`;
        break;
      case 'weather_alert':
        url = `/listings?location=${data.location}`;
        break;
      default:
        url = data.url || '/';
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Message handling for WebLLM status updates only
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'WEBLLM_STATUS_UPDATE') {
    const { status, progress } = event.data;
    console.log(`🤖 Service Worker: WebLLM status update - ${status} (${progress}%)`);
    
    // Store WebLLM status for other tabs
    storeOfflineData('webllm-status', {
      id: 'current-status',
      status,
      progress,
      timestamp: new Date().toISOString()
    });
  }
  
  if (event.data && event.data.type === 'GET_EMERGENCY_CONTACTS') {
    event.ports[0].postMessage({
      type: 'EMERGENCY_CONTACTS',
      contacts: EMERGENCY_CONTACTS
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Essential sync functions
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

async function syncWebLLMUsage() {
  try {
    const usageData = await getOfflineData('webllm-usage');
    
    for (const usage of usageData) {
      try {
        await fetch('/api/ai-features/usage-analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(usage)
        });
        
        await removeOfflineData('webllm-usage', usage.id);
      } catch (error) {
        console.error('Failed to sync WebLLM usage:', error);
      }
    }
  } catch (error) {
    console.error('WebLLM usage sync failed:', error);
  }
}

// Minimal IndexedDB helpers
async function storeOfflineData(store, data) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageStayOffline', 3);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      const stores = ['bookings', 'favorites', 'webllm-status', 'webllm-usage'];
      
      stores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(store)) {
        db.close();
        resolve();
        return;
      }
      
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      
      const storeRequest = objectStore.put(data);
      storeRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      storeRequest.onerror = () => {
        db.close();
        reject(storeRequest.error);
      };
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function getOfflineData(store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageStayOffline', 3);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(store)) {
        db.close();
        resolve([]);
        return;
      }
      
      const transaction = db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const getRequest = objectStore.getAll();
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
    
    request.onerror = () => reject(request.error);
  });
}
 
async function removeOfflineData(store, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageStayOffline', 3);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(store)) {
        db.close();
        resolve();
        return;
      }
      
      const transaction = db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const deleteRequest = objectStore.delete(id);
      
      deleteRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      deleteRequest.onerror = () => {
        db.close();
        reject(deleteRequest.error);
      };
    };
    
    request.onerror = () => reject(request.error);
  });
}

console.log('✅ VillageStay Service Worker v1.4.0 loaded with clean WebLLM support');