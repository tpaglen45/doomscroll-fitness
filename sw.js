const VERSION = 'v7';
const CACHE = `doomscroll-fitness-${VERSION}`;
const CACHE_PREFIX = 'doomscroll-fitness-';
const CORE_ASSETS = ['./', './index.html', './app-core.js', './manifest.json', './icon.png'];
// Not every deploy bundles a history CSV (it can contain personal data and is kept out of
// some deploys), so it's cached best-effort and must never fail the whole install.
const OPTIONAL_ASSETS = ['./josh-program-2026-08-08.csv'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(async cache => {
            // cache: 'reload' skips the browser's HTTP cache so an update always downloads fresh files.
            const fresh = url => new Request(url, { cache: 'reload' });
            await cache.addAll(CORE_ASSETS.map(fresh));
            await Promise.all(OPTIONAL_ASSETS.map(url => cache.add(fresh(url)).catch(() => {})));
        })
    );
});

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
    if (event.data === 'GET_VERSION' && event.ports[0]) event.ports[0].postMessage(VERSION);
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
