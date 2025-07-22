// villagestay-frontend/public/sw.js - Complete with Offline AI Support

const CACHE_NAME = 'villagestay-v1.3.0';
const OFFLINE_PAGE = '/offline';
const API_CACHE_NAME = 'villagestay-api-v1.1.0';
const AI_MODELS_CACHE = 'villagestay-ai-models-v1.0.0';

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

// AI model URLs to cache for offline use
const AI_MODEL_URLS = [
  // Hugging Face ONNX models for offline AI
  'https://huggingface.co/Xenova/gpt2/resolve/main/onnx/decoder_model_merged.onnx',
  'https://huggingface.co/Xenova/gpt2/resolve/main/tokenizer.json',
  'https://huggingface.co/Xenova/gpt2/resolve/main/config.json',
  'https://huggingface.co/Xenova/opus-mt-en-mul/resolve/main/onnx/decoder_model_merged.onnx',
  'https://huggingface.co/Xenova/opus-mt-en-mul/resolve/main/tokenizer.json',
  'https://huggingface.co/Xenova/opus-mt-en-mul/resolve/main/config.json',
  // Whisper models for speech recognition (smaller versions)
  'https://huggingface.co/Xenova/whisper-tiny/resolve/main/onnx/encoder_model.onnx',
  'https://huggingface.co/Xenova/whisper-tiny/resolve/main/onnx/decoder_model_merged.onnx',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/listings',
  '/api/auth/profile',
  '/api/impact',
  '/api/bookings',
  '/api/ai-features',
];

// Offline AI responses for rural hosts
const OFFLINE_AI_RESPONSES = {
  // Hindi responses for common host questions
  'hi': {
    'check-in': 'अतिथि चेक-इन के लिए: 1) मेहमानों का स्वागत करें 2) कमरा दिखाएं 3) घर के नियम बताएं 4) अपना नंबर दें 5) स्थानीय जानकारी दें',
    'pricing': 'मूल्य निर्धारण: त्योहार के समय 25-30% बढ़ाएं। ऑफ सीजन में 10-15% कम करें। स्थानीय प्रतिस्पर्धा देखें।',
    'guest_complaint': 'शिकायत का समाधान: 1) धैर्य से सुनें 2) माफी मांगें 3) तुरंत समाधान करने की कोशिश करें 4) भविष्य में सुधार का वादा करें',
    'temple_timing': 'मंदिर का समय: सुबह 6 बजे से दोपहर 12 बजे तक। शाम 5 बजे से रात 9 बजे तक। मेहमानों को जूते उतारने की सलाह दें।',
    'transport': 'स्थानीय परिवहन: ऑटो रिक्शा, लोकल बस, साझा टैक्सी उपलब्ध। रेट पहले से तय करें। मेहमानों को दरें बताएं।',
    'safety': 'सुरक्षा सुझाव: रात में अकेले न घूमें। कीमती सामान सुरक्षित रखें। स्थानीय आपातकालीन नंबर दें।'
  },
  // Gujarati responses
  'gu': {
    'check-in': 'મહેમાન ચેક-ઇન માટે: 1) સ્વાગત કરો 2) રૂમ બતાવો 3) ઘરના નિયમો કહો 4) તમારો નંબર આપો 5) સ્થાનિક માહિતી આપો',
    'pricing': 'કિંમત નક્કી કરવા: ઉત્સવના સમયે 25-30% વધારો। ઓફ સીઝનમાં 10-15% ઘટાડો। સ્થાનિક સ્પર્ધા જુઓ।',
    'guest_complaint': 'ફરિયાદનો ઉકેલ: 1) ધીરજથી સાંભળો 2) માફી માગો 3) તરત ઉકેલ કરવાનો પ્રયાસ કરો 4) ભવિષ્યમાં સુધારાનું વચન આપો',
    'temple_timing': 'મંદિરનો સમય: સવારે 6 થી બપોરે 12 વાગ્યા સુધી। સાંજે 5 થી રાત્રે 9 વાગ્યા સુધી। મહેમાનોને જૂતા ઉતારવા કહો।',
    'transport': 'સ્થાનિક વાહનવ્યવહાર: ઓટો રિક્શા, લોકલ બસ, શેર ટેક્સી ઉપલબ્ધ. પહેલેથી રેટ ફિક્સ કરો.',
    'safety': 'સુરક્ષા સૂચનો: રાત્રે એકલા ન ફરો. કિંમતી સામાન સુરક્ષિત રાખો. લોકલ ઇમરજન્સી નંબર આપો.'
  },
  // English responses
  'en': {
    'check-in': 'Guest check-in process: 1) Welcome guests warmly 2) Show room facilities 3) Explain house rules 4) Share your contact 5) Provide local area guidance',
    'pricing': 'Pricing strategy: Increase 25-30% during festivals. Reduce 10-15% in off-season. Check local competition rates.',
    'guest_complaint': 'Handle complaints: 1) Listen patiently 2) Apologize sincerely 3) Resolve immediately if possible 4) Promise future improvements',
    'temple_timing': 'Temple timings: Morning 6 AM to 12 PM. Evening 5 PM to 9 PM. Advise guests to remove shoes.',
    'transport': 'Local transport: Auto-rickshaw, local buses, shared taxis available. Fix rates beforehand.',
    'safety': 'Safety tips: Avoid walking alone at night. Secure valuables. Share local emergency numbers.'
  }
};

// Offline AI patterns for question matching
const AI_PATTERNS = {
  'check': ['check', 'चेक', 'ચેક', 'checkin', 'guest arrival'],
  'price': ['price', 'मूल्य', 'કિંમત', 'cost', 'rate', 'pricing'],
  'complaint': ['complaint', 'problem', 'शिकायत', 'ફરિયાદ', 'issue'],
  'temple': ['temple', 'मंदिर', 'મંદિર', 'religious', 'worship'],
  'transport': ['transport', 'परिवहन', 'વાહન', 'bus', 'auto', 'taxi'],
  'safety': ['safety', 'सुरक्षा', 'સુરક્ષા', 'secure', 'danger']
};

// Supported schemes for caching
const CACHEABLE_SCHEMES = ['http', 'https'];

// Install event - cache static resources and AI models
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing with AI support...');
  
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAME)
        .then((cache) => {
          console.log('📦 Service Worker: Caching static resources');
          return cache.addAll(STATIC_RESOURCES);
        }),
      
      // Cache AI models for offline use
      caches.open(AI_MODELS_CACHE)
        .then((cache) => {
          console.log('🤖 Service Worker: Caching AI models for offline use');
          return cache.addAll(AI_MODEL_URLS.map(url => new Request(url, {
            mode: 'cors',
            credentials: 'omit'
          })));
        })
        .catch((error) => {
          console.warn('⚠️ Service Worker: Some AI models failed to cache:', error);
          // Don't fail installation if AI models can't be cached
          return Promise.resolve();
        })
    ])
    .then(() => {
      console.log('✅ Service Worker: Installed successfully with AI support');
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
                cacheName !== AI_MODELS_CACHE) {
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

  // Handle AI model requests
  if (url.href.includes('huggingface.co') || url.href.includes('.onnx')) {
    event.respondWith(handleAIModelRequest(request));
    return;
  }

  // In development mode, don't intercept API requests at all
  if (isDevelopment() && url.pathname.startsWith('/api/')) {
    console.log('🔧 Service Worker: Skipping API interception in development:', url.pathname);
    return;
  }

  // Handle offline AI requests
  if (url.pathname.startsWith('/api/ai-features/offline-assistant')) {
    event.respondWith(handleOfflineAIRequest(request));
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

// Handle AI model requests with cache-first strategy
async function handleAIModelRequest(request) {
  const cache = await caches.open(AI_MODELS_CACHE);
  
  try {
    // Try cache first for AI models
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('🤖 Service Worker: Serving AI model from cache');
      return cachedResponse;
    }
    
    // Try network if not in cache
    console.log('🌐 Service Worker: Fetching AI model from network');
    const response = await fetch(request);
    
    if (response.ok) {
      await cache.put(request, response.clone());
      console.log('✅ Service Worker: AI model cached');
    }
    
    return response;
  } catch (error) {
    console.error('❌ Service Worker: Failed to fetch AI model', error);
    throw error;
  }
}

// Handle offline AI assistant requests
async function handleOfflineAIRequest(request) {
  try {
    const requestData = await request.json();
    const { message, language = 'hi', context = {} } = requestData;
    
    console.log('🤖 Service Worker: Processing offline AI request:', message);
    
    // Simple pattern matching for offline responses
    const response = getOfflineAIResponse(message, language);
    
    return new Response(
      JSON.stringify({
        response: response,
        language: language,
        timestamp: new Date().toISOString(),
        offline: true,
        cached: true
      }),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-Served-By': 'offline-ai'
        }
      }
    );
  } catch (error) {
    console.error('❌ Service Worker: Offline AI error', error);
    
    return new Response(
      JSON.stringify({
        error: 'Offline AI processing failed',
        message: 'I apologize, but I encountered an error. Please try again.',
        offline: true
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Get offline AI response using pattern matching
function getOfflineAIResponse(message, language) {
  const messageLower = message.toLowerCase();
  
  // Find matching pattern
  for (const [key, patterns] of Object.entries(AI_PATTERNS)) {
    if (patterns.some(pattern => messageLower.includes(pattern.toLowerCase()))) {
      const responses = OFFLINE_AI_RESPONSES[language] || OFFLINE_AI_RESPONSES['en'];
      return responses[key] || responses['check-in']; // fallback to check-in
    }
  }
  
  // Default helpful response
  const defaultResponses = {
    'hi': 'मैं आपकी मदद के लिए यहां हूं! आप मुझसे चेक-इन, मूल्य निर्धारण, मेहमान सेवा, या स्थानीय जानकारी के बारे में पूछ सकते हैं।',
    'gu': 'હું તમારી મદદ કરવા અહીં છું! તમે મારી પાસે ચેક-ઇન, કિંમત, મહેમાન સેવા અથવા સ્થાનિક માહિતી વિશે પૂછી શકો છો.',
    'en': 'I\'m here to help! You can ask me about check-in procedures, pricing, guest services, or local information.'
  };
  
  return defaultResponses[language] || defaultResponses['en'];
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
    
    // Return offline response for critical API endpoints
    return new Response(
      JSON.stringify({
        error: 'Network Error',
        message: 'Unable to connect to server. Please check your connection.',
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

// Background sync for bookings and favorites
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered');
  
  if (event.tag === 'background-sync-bookings') {
    event.waitUntil(syncBookings());
  }
  
  if (event.tag === 'background-sync-favorites') {
    event.waitUntil(syncFavorites());
  }
  
  if (event.tag === 'background-sync-ai-conversations') {
    event.waitUntil(syncAIConversations());
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
      case 'offline_ai_ready':
        url = `/host/dashboard`;
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

// Message handling for AI assistant communication
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'OFFLINE_AI_QUERY') {
    const { message, language = 'hi', context = {} } = event.data;
    
    const response = getOfflineAIResponse(message, language);
    
    event.ports[0].postMessage({
      type: 'OFFLINE_AI_RESPONSE',
      response: response,
      language: language,
      timestamp: new Date().toISOString(),
      offline: true
    });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
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

async function syncAIConversations() {
  try {
    const offlineConversations = await getOfflineData('ai-conversations');
    
    for (const conversation of offlineConversations) {
      try {
        await fetch('/api/ai-features/sync-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(conversation)
        });
        
        await removeOfflineData('ai-conversations', conversation.id);
      } catch (error) {
        console.error('Failed to sync AI conversation:', error);
      }
    }
  } catch (error) {
    console.error('AI conversations sync failed:', error);
  }
}

// IndexedDB helpers for offline data
async function getOfflineData(store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageStayOffline', 2);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('bookings')) {
        db.createObjectStore('bookings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ai-conversations')) {
        db.createObjectStore('ai-conversations', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ai-models-status')) {
        db.createObjectStore('ai-models-status', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(store)) {
        resolve([]);
        return;
      }
      
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
    const request = indexedDB.open('VillageStayOffline', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(store)) {
        resolve();
        return;
      }
      
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

// AI-specific helper functions
async function storeAIModelStatus(modelId, status) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VillageStayOffline', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['ai-models-status'], 'readwrite');
      const objectStore = transaction.objectStore('ai-models-status');
      
      const storeRequest = objectStore.put({
        id: modelId,
        status: status,
        timestamp: new Date().toISOString()
      });
      
      storeRequest.onsuccess = () => resolve();
      storeRequest.onerror = () => reject(storeRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Notify clients when AI models are ready
async function notifyAIModelsReady() {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: 'AI_MODELS_READY',
      timestamp: new Date().toISOString()
    });
  });
  
  // Show notification to host
  self.registration.showNotification('VillageStay AI Assistant Ready! 🤖', {
    body: 'You can now use the offline AI assistant even without internet connection.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'ai-ready',
    data: {
      type: 'offline_ai_ready',
      url: '/host/dashboard'
    },
    actions: [
      {
        action: 'try_assistant',
        title: 'Try Assistant',
        icon: '/icons/ai-action.png'
      }
    ]
  });
}

// Initialize AI models cache status
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // ... existing activation code ...
      
      // Check and notify about AI models
      caches.open(AI_MODELS_CACHE)
        .then(cache => cache.keys())
        .then(keys => {
          if (keys.length > 0) {
            console.log('🤖 Service Worker: AI models available offline');
            notifyAIModelsReady();
          }
        })
        .catch(console.error)
    ])
  );
});

console.log('✅ VillageStay Service Worker loaded with AI support');