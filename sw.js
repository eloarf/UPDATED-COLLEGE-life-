// Service Worker for AASTU OS Tracker
// Designed for offline-first PWA operation on GitHub Pages and custom subpaths

const CACHE_NAME = 'aastu-os-pwa-v2';

// Core assets to pre-cache on install (using relative paths for subpath compatibility)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Install: Cache offline app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((response) => {
              if (response && response.status === 200) {
                return cache.put(url, response);
              }
            })
            .catch((err) => {
              console.warn('[AASTU OS SW] Precache non-critical notice for', url, err);
            })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches and take immediate control of clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[AASTU OS SW] Purging old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first with offline fallback for navigation; stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Navigation requests (HTML page loads, home screen launch, routing)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const indexFallback = (await caches.match('./index.html')) || (await caches.match('./'));
          if (indexFallback) return indexFallback;
          return new Response('AASTU OS is offline. Please connect to the internet to load initial assets.', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 2. Static assets & API/resources
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Handle incoming messages from the frontend to trigger notifications
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const defaultUrl = self.registration.scope || './';
    self.registration.showNotification(title || 'AASTU OS Reminder', {
      body: options?.body || 'You have an upcoming academic task or streak alert!',
      icon: options?.icon || './icon.svg',
      badge: options?.badge || './icon.svg',
      data: options?.data || { url: defaultUrl },
      vibrate: [200, 100, 200],
      requireInteraction: options?.requireInteraction || false,
      tag: options?.tag || 'aastu-os-notice'
    });
  }
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.registration.scope || './';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
