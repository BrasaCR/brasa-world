const CACHE_VERSION = 'brasa-app-v3-2026-09-11';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = ['/', OFFLINE_URL, '/manifest.webmanifest', '/favicon.ico', '/icons/icon-192.png', '/icons/icon-512.png'];
const PRIVATE_PATHS = [/^\/v1\//, /^\/api\//, /^\/(health|verify|session|credential|keys|credentials|rights|module|payments|destinations|thread|campuses|officers|recover|metrics|report|ussd|whatsapp)(\/|$)/];

function isPrivateRequest(request, url) {
  return request.headers.has('authorization') || request.headers.has('cookie') || PRIVATE_PATHS.some((pattern) => pattern.test(url.pathname));
}
function cacheable(response) {
  const control = response.headers.get('cache-control') || '';
  return response.ok && !response.headers.has('set-cookie') && !/private|no-store/i.test(control);
}
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null)))));
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const current = new Set([STATIC_CACHE, PAGE_CACHE]);
    await Promise.all((await caches.keys()).filter((key) => key.startsWith('brasa-') && !current.has(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivateRequest(request, url)) return;
  const navigation = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (navigation) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (cacheable(response)) await (await caches.open(PAGE_CACHE)).put(request, response.clone());
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match(OFFLINE_URL)) || new Response('BRASA is offline.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }
  if (!['style', 'script', 'image', 'font'].includes(request.destination)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async (response) => {
      if (cacheable(response)) await (await caches.open(STATIC_CACHE)).put(request, response.clone());
      return response;
    }).catch(() => null);
    return cached || (await network) || new Response('', { status: 504 });
  })());
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CLEAR_OFFLINE_DATA') event.waitUntil(Promise.all([caches.delete(STATIC_CACHE), caches.delete(PAGE_CACHE)]));
});
