const CACHE_NAME = 'ed-rpg-pwa-v2';
const APP_SHELL = [
  './',
  './index.html',
  './perfil.html',
  './configs/auth.js',
  './configs/manifest.webmanifest',
  './configs/pwa.js',
  './configs/icons/icon.svg',
  './v1/ed_sistemav1_mestre.html',
  './v2/ed_sistemav2_mestre.html',
  './v3/ed_sistemav3_ficha.html',
  './v3/ed_sistemav3_bancodedados.html',
  './v3/ed_sistemav3_criadordetecnicas.html',
  './v3/ed_sistemav3_mestre.html',
  './v3/ed_sistemav3_tabletop.html',
  './v3/tabletop/tabletop.css',
  './v3/tabletop/tabletop.js',
  './v4/ed_sistemav4_ficha.html',
  './v4/ed_sistemav4_bancodedados.html',
  './v4/ed_sistemav4_criadordetecnicas.html',
  './v4/ed_sistemav4_calendario.html',
  './v4/ed_sistemav4_mestre.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    }))
  );
});
