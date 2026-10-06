/* Versioned app shell. Third-party APIs, map tiles and ads are never cached. */
const CACHE_NAME = 'fishing-inventory-v4-ocean-20261006';
const ASSETS = [ './', './index.html', './style.css', './upgrade.css', './ocean.css', './ocean.js', './script.js', './weather.js', './upgrade.js', './data.js', './ads-config.js', './ads.js', './ads.css', './manifest.json', './icon-192.png', './icon-512.png', './pages.css', './guide.html', './about.html', './privacy.html', './help.html', './contact.html', './guide-surfcasting.html', './guide-bolognese.html', './guide-spinning-mare.html', './guide-carpfishing.html', './guide-spinning-lago.html' ];
const ALLOWED = new Set(ASSETS.map(path => new URL(path, self.registration.scope).pathname));
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))); });
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('fishing-inventory-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ALLOWED.has(url.pathname) || url.search) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic') await cache.put(event.request, response.clone());
      return response;
    } catch {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      if (url.pathname === new URL('./', self.registration.scope).pathname) return await cache.match('./index.html');
      return new Response('Contenuto non disponibile offline.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
