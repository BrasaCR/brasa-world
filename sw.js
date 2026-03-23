// BRASA CR Service Worker
// Citizens' Renaissance — April 1, 2026
const CACHE_NAME = 'brasa-renaissance-v20';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/og-image.png',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE.map(u => {
                try { return new Request(u); }
                catch(e) { return null; }
            }).filter(Boolean)))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                }).catch(() => {
                    if (event.request.destination === 'document') {
                        return caches.match(OFFLINE_URL) || caches.match('/');
                    }
                });
            })
    );
});
