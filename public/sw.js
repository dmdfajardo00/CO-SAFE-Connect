// CO-SAFE Connect Service Worker
// Provides offline functionality and caching for safety-critical PWA

const CACHE_NAME = 'co-safe-v1'
const RUNTIME_CACHE = 'co-safe-runtime'

// Core files to cache immediately
const CORE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/css/index.css',
  '/static/js/index.js'
]

// Install event - cache core files
self.addEventListener('install', event => {
  console.log('[SW] Install event')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core files')
        return cache.addAll(CORE_FILES)
      })
      .then(() => {
        console.log('[SW] Skip waiting')
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Claiming clients')
        return self.clients.claim()
      })
  )
})

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
  const { request } = event
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip external requests
  if (!request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    handleRequest(request)
  )
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    return handleNavigationRequest(request)
  }
  
  // Handle static assets
  if (url.pathname.startsWith('/static/') || 
      url.pathname.includes('.') ||
      url.pathname === '/manifest.json') {
    return handleStaticRequest(request)
  }
  
  // Handle API requests (if any)
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(request)
  }
  
  // Default: try cache then network
  return caches.match(request)
    .then(cached => cached || fetch(request))
    .catch(() => {
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/offline.html') || caches.match('/')
      }
    })
}

async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const response = await fetch(request)
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache')
    
    // Try cache
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    
    // Return index.html as fallback for SPA routing
    const indexCached = await caches.match('/')
    if (indexCached) {
      return indexCached
    }
    
    // Final fallback
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable'
    })
  }
}

async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    
    // Try network
    const response = await fetch(request)
    
    if (response.ok) {
      // Cache static assets
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url)
    
    // Return cached version if available
    return caches.match(request)
  }
}

async function handleApiRequest(request) {
  try {
    // Always try network first for API requests
    const response = await fetch(request)
    
    // Optionally cache GET API responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    console.log('[SW] API request failed, checking cache')
    
    // Try cache for GET requests
    if (request.method === 'GET') {
      const cached = await caches.match(request)
      if (cached) {
        return cached
      }
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Unable to connect to server' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

// Background sync for critical safety data
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'co-data-sync') {
    event.waitUntil(syncCOData())
  }
})

async function syncCOData() {
  try {
    // Sync any pending CO readings or alerts
    const pendingData = await getStoredData('pendingSync')
    
    if (pendingData && pendingData.length > 0) {
      // Send to server when online
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingData)
      })
      
      if (response.ok) {
        // Clear pending data on successful sync
        await clearStoredData('pendingSync')
        console.log('[SW] Data synced successfully')
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error)
  }
}

// Utility functions for IndexedDB operations
async function getStoredData(key) {
  // Simplified - in real implementation would use IndexedDB
  return Promise.resolve([])
}

async function clearStoredData(key) {
  // Simplified - in real implementation would use IndexedDB
  return Promise.resolve()
}

// Handle push notifications for emergency alerts
self.addEventListener('push', event => {
  console.log('[SW] Push notification received')
  
  const options = {
    body: 'Critical CO levels detected!',
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'co-emergency',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'call',
        title: 'Call Emergency'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('CO-SAFE Alert', options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close()
  
  if (event.action === 'call') {
    // Open emergency calling interface
    clients.openWindow('tel:911')
  } else {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(clientList => {
          if (clientList.length > 0) {
            return clientList[0].focus()
          }
          return clients.openWindow('/')
        })
    )
  }
})