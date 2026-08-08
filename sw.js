const CACHE = 'doomscroll-fitness-v6';
const CACHE_PREFIX = 'doomscroll-fitness-';
const CORE_ASSETS = ['./', './index.html', './app-core.js', './manifest.json', './icon.png'];
// Not every deploy bundles a history CSV (it can contain personal data and is kept out of
// some deploys), so it's cached best-effort and must never fail the whole install.
const OPTIONAL_ASSETS = ['./josh-program-2026-08-08.csv'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(async cache => {
            await cache.addAll(CORE_ASSETS);
            await Promise.all(OPTIONAL_ASSETS.map(url => cache.add(url).catch(() => {})));
        })
    );
});

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
