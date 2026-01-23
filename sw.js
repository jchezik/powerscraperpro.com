const CACHE_NAME = 'psp-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/features.html',
  '/screenshots.html',
  '/download.html',
  '/404.html',
  '/css/styles.css',
  '/js/main.js',
  '/assets/icons/app-icon.png'
];

// Install: precache critical assets only (not screenshots - they load lazily)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches and claim clients
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

// Fetch: Strategy depends on resource type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // HTML pages: Network-first with cache fallback (always get fresh content)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match('/404.html');
          });
        })
    );
    return;
  }

  // Static assets (CSS, JS, images): Cache-first with network fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-while-revalidate: serve cached, update in background
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          }).catch(() => {});

          return cachedResponse;
        }

        // No cache: fetch from network and cache
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)$/i.test(url.pathname);
            if (isStaticAsset) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
          }
          return networkResponse;
        });
      })
      .catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('/404.html');
        }
      })
  );
});
