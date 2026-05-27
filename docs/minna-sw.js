const CACHE_NAME = 'minna-ai-lesson-cache-v12-full-50-network-first';
const APP_SHELL = [
  './minna-index.html',
  './minna-batch-player.html?v=12.1',
  './minna-batch-lesson.js?v=12.1',
  './minna-batch-lesson-details-01-10.js?v=12.1',
  './minna-app.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.pathname.includes('/TypingJapaneseWords/docs/')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./minna-index.html')))
  );
});
