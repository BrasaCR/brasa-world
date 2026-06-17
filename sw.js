/* =============================================================================
   BRASA service worker
   -----------------------------------------------------------------------------
   Goal: never serve a stale page. Pages are ALWAYS fetched from the network
   first, so the index and every right page show the latest deploy immediately.
   Cache is only a fallback for offline. Live ledger data is never touched.

   To force an update across all visitors, bump CACHE_VERSION below.
   ============================================================================ */

const CACHE_VERSION = 'brasa-v2-2026-06-17';
const OFFLINE_URL   = '/offline.html';

// Same-origin static assets that are safe to cache and rarely change.
const PRECACHE = [OFFLINE_URL, '/favicon.ico', '/apple-touch-icon.png'];

/* ---- install: cache the offline shell, take over immediately ---- */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Cache each item individually so one missing file can't break install.
    await Promise.all(PRECACHE.map((url) =>
      cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
    ));
    await self.skipWaiting();
  })());
});

/* ---- activate: delete every old cache, claim open pages ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ---- fetch strategy ----
   - Cross-origin (R2 images, fonts, the ledger API): not intercepted — straight
     to the network, so live data stays live and nothing is cached stale.
   - Page navigations (HTML): NETWORK-FIRST. Fresh page every time online;
     last-seen page when offline; offline.html if never seen.
   - Same-origin static files: stale-while-revalidate (fast, self-updating).   */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave cross-origin alone

  const isNavigation =
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);                 // always try the network first
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, fresh.clone()).catch(() => {});  // keep a copy for offline
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || (await caches.match(OFFLINE_URL)) ||
          new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } });
      }
    })());
    return;
  }

  // Same-origin static asset: serve cache fast, refresh in the background.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);
    return cached || (await network) ||
      new Response('', { status: 504 });
  })());
});

/* Optional: lets a page tell the worker to activate a new version on demand. */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
