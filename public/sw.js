// Service Worker for College Life OS
// Engineered for 100% offline-first PWA operation on GitHub Pages and custom subpaths

const CACHE_NAME = 'college-life-os-v6';

// Core shell assets to pre-cache on install
const PRECACHE_CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

// Helper: Normalize URL to relative path from service worker location
function toAbsoluteUrl(relativePath) {
  return new URL(relativePath, self.location.href).href;
}

// 1. Install Event: Cache shell and auto-discover JS/CSS bundles from index.html
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Pre-cache core shell assets
      await Promise.allSettled(
        PRECACHE_CORE.map(async (path) => {
          try {
            const absoluteUrl = toAbsoluteUrl(path);
            const response = await fetch(new Request(absoluteUrl, { cache: 'reload' }));
            if (response && response.status === 200) {
              await cache.put(absoluteUrl, response.clone());
              // Also store under relative key for fallback matching
              await cache.put(path, response);
            }
          } catch (err) {
            console.warn('[College Life OS SW] Precache note for', path, err);
          }
        })
      );

      // Dynamically discover and cache built JS & CSS bundles from index.html
      try {
        const indexUrl = toAbsoluteUrl('./index.html');
        const indexResponse = await fetch(new Request(indexUrl, { cache: 'reload' }));
        if (indexResponse && indexResponse.status === 200) {
          const htmlText = await indexResponse.text();
          // Put the text back as a response into the cache
          await cache.put(
            indexUrl,
            new Response(htmlText, {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );

          // Find script src and link href in index.html
          const assetUrls = [];
          const scriptRegex = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
          const linkRegex = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
          let match;

          while ((match = scriptRegex.exec(htmlText)) !== null) {
            const src = match[1];
            if (src && !src.startsWith('data:') && !src.startsWith('http://') && !src.startsWith('https://')) {
              assetUrls.push(src);
            }
          }

          while ((match = linkRegex.exec(htmlText)) !== null) {
            const href = match[1];
            if (href && (href.endsWith('.css') || href.includes('/assets/'))) {
              assetUrls.push(href);
            }
          }

          // Fetch and cache discovered bundles
          await Promise.allSettled(
            assetUrls.map(async (assetRel) => {
              try {
                const fullAssetUrl = toAbsoluteUrl(assetRel);
                const assetRes = await fetch(new Request(fullAssetUrl, { cache: 'reload' }));
                if (assetRes && assetRes.status === 200) {
                  await cache.put(fullAssetUrl, assetRes.clone());
                  await cache.put(assetRel, assetRes);
                }
              } catch (assetErr) {
                console.warn('[College Life OS SW] Bundle pre-fetch note:', assetRel, assetErr);
              }
            })
          );
        }
      } catch (err) {
        console.warn('[College Life OS SW] Bundle discovery note:', err);
      }

      // Activate immediately
      await self.skipWaiting();
    })()
  );
});

// 2. Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[College Life OS SW] Purging old cache version:', key);
            return caches.delete(key);
          }
        })
      );
      // Immediately take control of all open tabs/clients
      await self.clients.claim();
    })()
  );
});

// 3. Fetch Event: Reliable Offline Navigation & Cache-First Assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  // A. Navigation Requests (HTML Page loads, Home-screen App launch, Refresh)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Attempt network fetch with 1.8s timeout to handle spotty mobile connections
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network timeout')), 1800)
          );
          const networkPromise = fetch(request).then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, networkResponse.clone());
              cache.put(toAbsoluteUrl('./index.html'), networkResponse.clone());
            }
            return networkResponse;
          });

          return await Promise.race([networkPromise, timeoutPromise]);
        } catch {
          // Offline or network timed out -> ALWAYS fall back to cached index.html
          const cache = await caches.open(CACHE_NAME);

          // 1. Check exact match
          let cached = await cache.match(request);
          if (cached) return cached;

          // 2. Check absolute index.html
          const indexAbs = toAbsoluteUrl('./index.html');
          cached = await cache.match(indexAbs);
          if (cached) return cached;

          // 3. Check relative index.html or root
          cached = (await cache.match('./index.html')) || (await cache.match('./'));
          if (cached) return cached;

          // 4. Check any cached index.html key in the cache
          const keys = await cache.keys();
          const indexKey = keys.find(
            (k) => k.url.endsWith('/index.html') || k.url.endsWith('/') || k.url === self.registration.scope
          );
          if (indexKey) {
            const fallback = await cache.match(indexKey);
            if (fallback) return fallback;
          }

          // Safe fallback page if cache was somehow empty
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>College Life OS</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center;"><h2>College Life OS</h2><p>Please connect to the internet once to load the application cache.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // B. Static Assets (JS, CSS, PNG, SVG, WOFF, Fonts, Manifest) -> CACHE FIRST
  const isStaticAsset =
    url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.json') ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // 1. Check exact cache match
        const cached = await cache.match(request);
        if (cached) return cached;

        // 2. Check path match (handles subpaths or relative URL variations)
        const keys = await cache.keys();
        const pathKey = keys.find((k) => new URL(k.url).pathname === url.pathname);
        if (pathKey) {
          const match = await cache.match(pathKey);
          if (match) return match;
        }

        // 3. Not in cache -> fetch from network, cache, and return
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (fetchErr) {
          // If offline and font request failed, return empty fallback without breaking layout
          if (url.hostname === 'fonts.googleapis.com') {
            return new Response('', { headers: { 'Content-Type': 'text/css' } });
          }
          if (url.hostname === 'fonts.gstatic.com') {
            return new Response('', { status: 404 });
          }
          throw fetchErr;
        }
      })()
    );
    return;
  }

  // C. Stale-While-Revalidate for other GET requests
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Message Listener: Dynamic caching & notification handling
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  // Client dynamically tells the SW to cache loaded asset URLs
  if (event.data.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
          event.data.urls.map(async (urlStr) => {
            try {
              if (urlStr.startsWith('http')) {
                const res = await fetch(new Request(urlStr, { mode: 'no-cors' }));
                if (res) await cache.put(urlStr, res);
              }
            } catch {}
          })
        );
      })()
    );
    return;
  }

  // Show notification
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const defaultUrl = self.registration.scope || './';
    self.registration.showNotification(title || 'College Life OS', {
      body: options?.body || 'Academic schedule update',
      icon: options?.icon || './icon-192.png',
      badge: options?.badge || './icon-192.png',
      data: options?.data || { url: defaultUrl },
      vibrate: [200, 100, 200],
      requireInteraction: options?.requireInteraction || false,
      tag: options?.tag || 'college-life-os-notice',
    });
  }
});

// 5. Notification Click Handler
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
