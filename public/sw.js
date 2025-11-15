// Service Worker for Warming PWA
// Handles offline caching and push notifications

const CACHE_NAME = 'warming-v1';
const OFFLINE_URL = '/dashboard';

// Files to cache for offline use
const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/history',
  '/dashboard/new-generation',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching essential files');
      return cache.addAll(urlsToCache).catch((error) => {
        console.error('[SW] Cache addAll failed:', error);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return (
        response ||
        fetch(event.request).catch(() => {
          // If both cache and network fail, return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        })
      );
    })
  );
});

// Push event - receive push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
    data = {
      title: 'Warming Notification',
      body: 'You have a new notification',
    };
  }

  const title = data.title || 'Warming';
  const options = {
    body: data.body || 'Your generation is complete!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/dashboard/history',
      generationId: data.generationId,
    },
    actions: [
      {
        action: 'view',
        title: 'View Results',
        icon: '/icons/icon-72x72.png',
      },
      {
        action: 'close',
        title: 'Close',
      },
    ],
    requireInteraction: true,
    tag: data.tag || 'warming-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event - handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Get the URL and generationId from notification data
  const urlToOpen = event.notification.data?.url || '/dashboard/history';
  const generationId = event.notification.data?.generationId;

  // Build the final URL with generationId as query parameter
  const finalUrl = generationId
    ? `${urlToOpen}?show=${generationId}`
    : urlToOpen;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes('/dashboard') && 'focus' in client) {
            // Focus existing window and navigate to the URL
            return client.focus().then(() => {
              return client.navigate(finalUrl);
            });
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(finalUrl);
        }
      })
  );
});

// Background sync event (for future offline queue functionality)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-generations') {
    event.waitUntil(syncGenerations());
  }
});

async function syncGenerations() {
  // Placeholder for future offline queue sync
  console.log('[SW] Syncing generations...');
}

console.log('[SW] Service Worker loaded');
