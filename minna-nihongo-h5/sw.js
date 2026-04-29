const CACHE_NAME = 'jp-helper-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data/lessons.json',
  './manifest.webmanifest',
  './assets/icon-192.svg',
  './assets/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
