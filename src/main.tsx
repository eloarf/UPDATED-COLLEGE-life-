import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Service Worker Management:
// In the native Android Capacitor APK, assets are bundled locally in the APK assets.
// A Service Worker inside the WebView can serve stale bundles after app updates.
if (Capacitor.isNativePlatform()) {
  // If running natively, ensure no active service workers or stale caches intercept local assets
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      })
      .catch(() => {});
  }
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => {
        for (const key of keys) {
          caches.delete(key).catch(() => {});
        }
      })
      .catch(() => {});
  }
} else if ('serviceWorker' in navigator) {
  // Web / PWA mode: Register Service Worker for genuine 100% offline-first PWA operation
  window.addEventListener('load', () => {
    // Resolve relative to current base path to support GitHub Pages subpaths
    const swUrl = new URL('./sw.js', window.location.href).href;

    navigator.serviceWorker
      .register(swUrl, { scope: './' })
      .then((registration) => {
        // Send currently loaded assets to service worker for comprehensive precaching
        const notifyAssetsToCache = () => {
          if (navigator.serviceWorker.controller) {
            const resources = performance.getEntriesByType('resource');
            const assetUrls = resources
              .map((r) => r.name)
              .filter(
                (url) =>
                  url.includes('/assets/') ||
                  url.endsWith('.js') ||
                  url.endsWith('.css') ||
                  url.includes('fonts.gstatic.com')
              );
            if (assetUrls.length > 0) {
              navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_URLS',
                urls: assetUrls,
              });
            }
          }
        };

        if (registration.active) {
          notifyAssetsToCache();
        }

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[College Life OS] New version installed and ready for offline use.');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[College Life OS] Service Worker registration failed:', error);
      });
  });
}
