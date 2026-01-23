const CACHE_NAME = 'psp-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/features.html',
  '/screenshots.html',
  '/download.html',
  '/404.html',
  '/css/styles.css',
  '/js/main.js',
  '/assets/icons/app-icon.png',
  '/assets/screenshots/dashboard-library.png',
  '/assets/screenshots/movies-dashboard.png',
  '/assets/screenshots/tv-dashboard.png',
  '/assets/screenshots/collections.png',
  '/assets/screenshots/upcoming.png',
  '/assets/screenshots/settings-artwork.png',
  '/assets/screenshots/settings-cloud-sync.png',
  '/assets/screenshots/rename-rescrape.png'
];

// Install: precache all main pages and assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Only cache same-origin GET requests for static assets
          if (
            event.request.method === 'GET' &&
            event.request.url.startsWith(self.location.origin)
          ) {
            const url = new URL(event.request.url);
            const isStaticAsset = /\.(html|css|js|png|jpg|jpeg|gif|svg|ico|woff2?)$/i.test(url.pathname);
            if (isStaticAsset) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/404.html');
        }
      })
  );
});
