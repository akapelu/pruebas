const CACHE_NAME = 'wonder-decks-v1';
const urlsToCache = [
  'https://raw.githubusercontent.com/akapelu/WonderDecks/main/',
  'https://raw.githubusercontent.com/akapelu/WonderDecks/main/index.html',
  'https://raw.githubusercontent.com/akapelu/WonderDecks/main/styles.css',
  'https://raw.githubusercontent.com/akapelu/WonderDecks/main/script.js',
  'https://raw.githubusercontent.com/akapelu/WonderDecks/main/images/icono-192x192.png',
  'https://raw.githubusercontent.com/akapelu/WonderDecks/main/images/icono-512x512.png',
  'https://raw.githubusercontent.com/akapelu/WonderDecks/main/favicon.ico',
  'https://raw.githubusercontent.com/akapelu/WonderDecks/main/logo.png'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Interceptar solicitudes y servir desde caché
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
