// Minimal service worker: no offline caching (this app needs the API to be
// useful anyway), just a fetch handler so the browser considers the app
// installable as a PWA.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
