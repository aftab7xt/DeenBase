const CACHE_NAME = 'deenbase-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './logo.png',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cinzel:wght@600&family=Inter:wght@300;400;500;600&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons+Round'
];

// 1. Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Fetch Assets (Serve from Cache if offline)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
