// Service Worker for Nemus PWA
// 1. UPDATE VERSION: Bumping this triggers the update
const CACHE_NAME = 'nemus-v2'; 

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  // 2. SKIP WAITING: Forces this new SW to become active immediately
  // instead of waiting for the user to close the app entirely.
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 3. STRATEGY CHANGE: Network-First for HTML (Navigation)
  // This ensures the user always gets the latest HTML updates.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // If offline, return the cached index.html
          return caches.match('./index.html');
        })
    );
    return;
  }

  // 4. STRATEGY: Cache-First for everything else (Images, CSS, JS)
  // This keeps the app fast.
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          if (response.type !== 'cors' && response.type !== 'opaque') {
            return response;
          }
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  // Claims control immediately so the page is controlled by the new SW 
  // without requiring a reload.
  event.waitUntil(clients.claim());

  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
