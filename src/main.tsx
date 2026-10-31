import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for genuine 100% offline-first PWA operation
if ('serviceWorker' in navigator) {
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
