import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for offline PWA functionality under GitHub Pages subpath
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js', { scope: './' })
      .then((registration) => {
        console.log('[AASTU OS] Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('[AASTU OS] Service Worker registration failed:', error);
      });
  });
}
