const CACHE_NAME = 'dice-pwa-v1';
const URLs = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
  // add icon URLs if you include them
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLs))
  );
  self.skipWaiting();
});

self.addEventListener('activate', ev => {
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', ev => {
  // network-first for dynamic freshness, fallback to cache
  ev.respondWith(
    fetch(ev.request).catch(()=> caches.match(ev.request))
  );
});
