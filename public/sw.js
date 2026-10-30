// Cache only public, immutable assets. Auth, APIs and private files stay network-only.
const STATIC_CACHE_NAME = 'mhd-static-20261021';
const PUBLIC_ASSETS = ['/manifest.json', '/icons/logo192.png', '/icons/logo512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE_NAME).then(cache => cache.addAll(PUBLIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names
    .filter(name => name !== STATIC_CACHE_NAME && (
      name.startsWith('static-cache-') || name.startsWith('jizdni-rady-images-cache-') || name.startsWith('mhd-static-')
    )).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      !(url.pathname.startsWith('/_next/static/') || PUBLIC_ASSETS.includes(url.pathname))) return;
  event.respondWith(caches.open(STATIC_CACHE_NAME).then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      event.waitUntil(cache.put(request, response.clone()).catch(() => {}));
    }
    return response;
  }));
});
