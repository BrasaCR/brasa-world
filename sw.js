/* BRASA CR — Service Worker v1.0
   Strategy: Cache-first for assets, Network-first for HTML
   Offline shell: hero + waitlist always available
*/
const CACHE_NAME = 'brasa-v2';
const SHELL_CACHE = 'brasa-shell-v2';

// Assets to pre-cache on install (app shell)
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/earth.jpg',
  '/earth.webm',
  '/earth.mp4',
];

// ── Install: cache the shell ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_ASSETS.map(u => {
        try { return new Request(u); } catch(e) { return null; }
      }).filter(Boolean)))
      .catch(() => {}) // Don't fail install if assets 404
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ────────────────────────────────
self.addEventListener('activate', event => {
  const valid = [CACHE_NAME, SHELL_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !valid.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: tiered strategy ────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET and cross-origin (fonts, analytics, translate)
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // HTML: Network-first, fallback to cache (always fresh content)
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/')))
    );
    return;
  }

  // CSS/JS/images: Cache-first, update in background (stale-while-revalidate)
  if (/\.(css|js|woff2?|png|jpg|svg|ico|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(cached => {
          const networkFetch = fetch(req).then(res => {
            cache.put(req, res.clone());
            return res;
          }).catch(() => null);
          return cached || networkFetch;
        })
      )
    );
    return;
  }
});

// ── Background sync for waitlist submissions ──────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'waitlist-sync') {
    event.waitUntil(syncWaitlist());
  }
});

async function syncWaitlist() {
  try {
    const db = await openDB();
    const pending = await db.getAll('pending-signups');
    for (const item of pending) {
      const res = await fetch('https://formspree.io/f/xkoqdogl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: item.email })
      });
      if (res.ok) await db.delete('pending-signups', item.id);
    }
  } catch(e) {}
}

// Minimal IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('brasa-offline', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('pending-signups', { autoIncrement: true });
    req.onsuccess = e => {
      const db = e.target.result;
      resolve({
        getAll: store => new Promise((res, rej) => {
          const t = db.transaction(store, 'readonly');
          const r = t.objectStore(store).getAll();
          r.onsuccess = () => res(r.result || []);
          r.onerror = rej;
        }),
        delete: (store, key) => new Promise((res, rej) => {
          const t = db.transaction(store, 'readwrite');
          const r = t.objectStore(store).delete(key);
          r.onsuccess = res; r.onerror = rej;
        })
      });
    };
    req.onerror = reject;
  });
}