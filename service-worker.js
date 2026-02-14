const CACHE_NAME = 'site-static-v1';
const assets = [
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/db.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
];

self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('caching shell assets');
            cache.addAll(assets);
        })
    );
});

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

self.addEventListener('fetch', evt => {
    evt.respondWith(
        caches.match(evt.request).then(cacheRes => {
            return cacheRes || fetch(evt.request);
        })
    );
});
