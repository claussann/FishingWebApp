/**
 * Fishing Inventory — Service Worker
 * Mette in cache i file statici per uso offline
 */
const CACHE_NAME = 'fishing-inventory-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Installazione: mette in cache i file statici
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Attivazione: rimuove cache vecchie
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve dalla cache, fallback alla rete
self.addEventListener('fetch', e => {
  // Ignora richieste non-GET e API esterne
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request)
        .then(res => {
          // Metti in cache dinamicamente i file dello stesso origine
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
      )
      .catch(() => caches.match('./index.html'))
  );
});
