// villagestay-frontend/public/sw.js - Perfect Offline Home Page Loading
const CACHE_NAME = 'villagestay-v4.0.0';
const RUNTIME_CACHE = 'villagestay-runtime-v4.0.0';
const STATIC_CACHE = 'villagestay-static-v4.0.0';

// Critical resources that MUST be available offline
const CRITICAL_CACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json'
];

// Install event - Aggressively cache critical resources
self.addEventListener('install', (event) => {
  console.log('🔧 SW v4.0.0: Installing...');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        
        // Cache critical URLs with custom requests to ensure they work offline
        const cachePromises = CRITICAL_CACHE_URLS.map(async (url) => {
          try {
            console.log(`📦 Caching: ${url}`);
            
            // Create a request with proper headers
            const request = new Request(url, {
              cache: 'reload',
              mode: 'same-origin',
              credentials: 'same-origin'
            });
            
            const response = await fetch(request);
            
            if (response.status === 200) {
              await cache.put(url, response.clone());
              console.log(`✅ Successfully cached: ${url}`);
            } else {
              console.warn(`⚠️ Failed to cache ${url}: Status ${response.status}`);
              
              // Create a fallback response for critical pages
              if (url === '/' || url === '/offline') {
                const fallbackResponse = new Response(generateOfflineHTML(), {
                  status: 200,
                  statusText: 'OK',
                  headers: {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache'
                  }
                });
                await cache.put(url, fallbackResponse);
                console.log(`✅ Created fallback for: ${url}`);
              }
            }
          } catch (error) {
            console.error(`❌ Error caching ${url}:`, error);
            
            // Create fallback for critical pages even if fetch fails
            if (url === '/' || url === '/offline') {
              const fallbackResponse = new Response(generateOfflineHTML(), {
                status: 200,
                statusText: 'OK',
                headers: {
                  'Content-Type': 'text/html',
                  'Cache-Control': 'no-cache'
                }
              });
              await cache.put(url, fallbackResponse);
              console.log(`✅ Created emergency fallback for: ${url}`);
            }
          }
        });
        
        await Promise.allSettled(cachePromises);
        
        // Initialize other caches
        await caches.open(RUNTIME_CACHE);
        await caches.open(STATIC_CACHE);
        
        console.log('✅ SW v4.0.0: Installation complete');
        
      } catch (error) {
        console.error('❌ SW v4.0.0: Installation failed:', error);
      }
    })()
  );
});

// Activate event - Clean up and take control
self.addEventListener('activate', (event) => {
  console.log('🚀 SW v4.0.0: Activating...');
  
  event.waitUntil(
    (async () => {
      try {
        // Delete old caches
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(name => name.includes('villagestay') && !name.includes('v4.0.0'))
          .map(name => {
            console.log(`🗑️ Deleting old cache: ${name}`);
            return caches.delete(name);
          });
        
        await Promise.all(deletePromises);
        
        // Take control of all clients immediately
        await self.clients.claim();
        
        console.log('✅ SW v4.0.0: Activated and claimed all clients');
        
        // Notify all clients that SW is ready
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: 'v4.0.0'
          });
        });
        
      } catch (error) {
        console.error('❌ SW v4.0.0: Activation failed:', error);
      }
    })()
  );
});

// Fetch event - Handle all requests with proper offline support
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Skip non-HTTP requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip requests to other domains (except for known CDNs)
  if (url.origin !== self.location.origin && !isTrustedDomain(url.hostname)) {
    return;
  }
  
  event.respondWith(handleRequest(event.request));
});

// Main request handler
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Handle navigation requests (pages) - MOST IMPORTANT for offline
    if (request.mode === 'navigate') {
      return await handleNavigationRequest(request);
    }
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      return await handleAPIRequest(request);
    }
    
    // Handle static assets
    return await handleStaticRequest(request);
    
  } catch (error) {
    console.error('❌ SW: Request handling failed:', error);
    return await createFallbackResponse(request);
  }
}

// Handle navigation requests - Critical for offline functionality
async function handleNavigationRequest(request) {
  const url = new URL(request.url);
  console.log(`🧭 Navigation request: ${url.pathname}`);
  
  try {
    // Get the main cache
    const cache = await caches.open(CACHE_NAME);
    
    // For any navigation request, first try cache
    let cachedResponse = await cache.match('/');
    
    if (cachedResponse) {
      console.log('✅ Serving cached home page for navigation');
      
      // Try to update cache in background
      updateNavigationCacheInBackground(request, cache);
      
      return cachedResponse;
    }
    
    // If no cache, try network
    console.log('🌐 No cache found, trying network...');
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful response
      await cache.put('/', networkResponse.clone());
      console.log('✅ Cached network response');
      return networkResponse;
    }
    
    throw new Error(`Network response not ok: ${networkResponse.status}`);
    
  } catch (error) {
    console.log('❌ Navigation failed, serving fallback:', error.message);
    
    // Return our offline HTML as last resort
    return new Response(generateOfflineHTML(), {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Handle API requests
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  // Handle emergency contacts offline
  if (url.pathname.includes('emergency')) {
    return new Response(JSON.stringify({
      contacts: {
        police: 100,
        fire: 101,
        ambulance: 108,
        tourist: 1363,
        women: 1091
      },
      timestamp: new Date().toISOString(),
      source: 'offline'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Try network first for API calls
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('API network request failed');
    
  } catch (error) {
    // Try cache for API requests
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline API response
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'This feature requires an internet connection',
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static requests (CSS, JS, images, etc.)
async function handleStaticRequest(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    
    // Try cache first for static assets
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Static request failed');
    
  } catch (error) {
    // Return appropriate fallback based on request type
    const url = new URL(request.url);
    
    if (url.pathname.endsWith('.css')) {
      return new Response('/* CSS not available offline */', {
        status: 200,
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    if (url.pathname.endsWith('.js')) {
      return new Response('// JavaScript not available offline', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' }
      });
    }
    
    if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      // Return a simple SVG placeholder
      const svg = generatePlaceholderSVG();
      return new Response(svg, {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' }
      });
    }
    
    return new Response('Not available offline', { status: 503 });
  }
}

// Helper functions
function isTrustedDomain(hostname) {
  const trustedDomains = [
    'fonts.googleapis.com',
    'fonts.gstatic.com',
    'cdn.jsdelivr.net',
    'unpkg.com'
  ];
  return trustedDomains.some(domain => hostname.includes(domain));
}

async function updateNavigationCacheInBackground(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put('/', response);
      console.log('🔄 Background cache update successful');
    }
  } catch (error) {
    console.log('🔄 Background cache update failed:', error.message);
  }
}

async function createFallbackResponse(request) {
  if (request.mode === 'navigate') {
    return new Response(generateOfflineHTML(), {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  return new Response('Service temporarily unavailable', {
    status: 503,
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Generate comprehensive offline HTML
function generateOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VillageStay - Discover Rural India</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            padding: 20px;
        }
        .container {
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            max-width: 600px;
            width: 100%;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .logo {
            font-size: 4rem;
            margin-bottom: 20px;
            animation: pulse 2s infinite;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #22c55e, #16a34a);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        h2 {
            font-size: 1.2rem;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 25px;
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: transform 0.3s ease;
        }
        .feature:hover {
            transform: translateY(-5px);
        }
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 15px;
        }
        .feature h3 {
            font-size: 1.2rem;
            margin-bottom: 10px;
        }
        .feature p {
            font-size: 0.9rem;
            opacity: 0.8;
            line-height: 1.5;
        }
        .status {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        .status.online {
            background: rgba(34, 197, 94, 0.3);
        }
        .status.offline {
            background: rgba(239, 68, 68, 0.3);
        }
        .btn {
            background: linear-gradient(45deg, #22c55e, #16a34a);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(34, 197, 94, 0.3);
        }
        .btn:active {
            transform: translateY(0);
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .offline-features {
            margin-top: 20px;
            text-align: left;
        }
        .offline-features h4 {
            margin-bottom: 15px;
            color: #22c55e;
        }
        .offline-features ul {
            list-style: none;
            padding: 0;
        }
        .offline-features li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .offline-features li:before {
            content: "✓ ";
            color: #22c55e;
            font-weight: bold;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏘️</div>
        <h1>VillageStay</h1>
        <h2>AI-Powered Rural Tourism</h2>
        
        <div class="status" id="status">
            <span id="status-icon">📡</span>
            <span id="status-text">Checking connection...</span>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🤖</div>
                <h3>AI Assistant</h3>
                <p>Maya is available offline to help with emergency contacts, travel tips, and local guidance</p>
            </div>
            <div class="feature">
                <div class="feature-icon">📱</div>
                <h3>Cached Content</h3>
                <p>Browse previously viewed villages and listings even without internet</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🆘</div>
                <h3>Emergency Info</h3>
                <p>Access critical emergency numbers and safety information anytime</p>
            </div>
        </div>
        
        <div class="offline-features">
            <h4>Available Offline:</h4>
            <ul>
                <li>Emergency contact numbers (Police: 100, Ambulance: 108)</li>
                <li>AI travel assistant with offline capabilities</li>
                <li>Previously viewed village listings</li>
                <li>Saved favorites and bookmarks</li>
                <li>Basic app navigation</li>
            </ul>
        </div>
        
        <div style="margin-top: 30px;">
            <button class="btn" onclick="checkConnection()">🔄 Refresh</button>
            <button class="btn" onclick="goHome()" style="background: linear-gradient(45deg, #3b82f6, #1d4ed8);">🏠 Home</button>
        </div>
    </div>
    
    <script>
        function updateStatus() {
            const status = document.getElementById('status');
            const statusIcon = document.getElementById('status-icon');
            const statusText = document.getElementById('status-text');
            
            if (navigator.onLine) {
                status.className = 'status online';
                statusIcon.textContent = '🟢';
                statusText.textContent = 'Connected - Content will update';
                
                // Auto refresh after a delay when back online
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                status.className = 'status offline';
                statusIcon.textContent = '🔴';
                statusText.textContent = 'Offline Mode - Limited functionality available';
            }
        }
        
        function checkConnection() {
            updateStatus();
            if (navigator.onLine) {
                window.location.reload();
            }
        }
        
        function goHome() {
            window.location.href = '/';
        }
        
        // Update status on load and when connection changes
        updateStatus();
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        
        // Check for service worker updates
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'SW_ACTIVATED') {
                    console.log('Service Worker activated:', event.data.version);
                }
            });
        }
    </script>
</body>
</html>`;
}

// Generate placeholder SVG for images
function generatePlaceholderSVG() {
  return `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <circle cx="200" cy="120" r="30" fill="#d1d5db"/>
    <rect x="170" y="160" width="60" height="40" fill="#d1d5db"/>
    <text x="200" y="220" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14">
      Image offline
    </text>
  </svg>`;
}

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ VillageStay Service Worker v4.0.0 - Perfect Offline Loading Ready');