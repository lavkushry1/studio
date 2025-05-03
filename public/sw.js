// public/sw.js

// Basic service worker implementation
// In a real app, use Workbox or similar libraries for caching strategies

const CACHE_NAME = 'ticketflow-cache-v1';
const urlsToCache = [
  '/',
  '/events',
  // Add other important static assets or page routes
  // '/manifest.json',
  // '/icons/icon-192x192.png',
  // '/_next/static/...', // Be careful caching Next.js assets
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Perform install steps - e.g., caching initial assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Use addAll for atomic caching, handle potential failures
        // return cache.addAll(urlsToCache).catch(error => {
        //   console.error('Service Worker: Failed to cache initial assets:', error);
        // });
        // For now, just log successful open
         return Promise.resolve();
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Perform activation steps - e.g., cleaning up old caches
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of uncontrolled clients
});

self.addEventListener('fetch', (event) => {
    // Basic Cache-First strategy example (very simplified)
    // console.log('Service Worker: Fetching ', event.request.url);
    // event.respondWith(
    //   caches.match(event.request)
    //     .then((response) => {
    //       // Cache hit - return response
    //       if (response) {
    //         return response;
    //       }
    //       // Not in cache - fetch from network
    //       return fetch(event.request).then(
    //         (networkResponse) => {
    //           // Optional: Cache the new response if needed
    //           // Be careful caching API responses without a proper strategy
    //           // if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
    //           //   return networkResponse;
    //           // }
    //           // const responseToCache = networkResponse.clone();
    //           // caches.open(CACHE_NAME).then((cache) => {
    //           //   cache.put(event.request, responseToCache);
    //           // });
    //           return networkResponse;
    //         }
    //       ).catch(error => {
    //          console.error('Service Worker: Fetch failed:', error);
    //          // Optional: Return an offline fallback page/response
    //       });
    //     })
    // );

    // For now, just let the browser handle fetch events
     // console.log('Service Worker: Fetching ', event.request.url);
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
