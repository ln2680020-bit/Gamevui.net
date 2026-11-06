const CACHE_NAME = 'gameverse-offline-v2';
const SHELL = [
  '/',
  '/play',
  '/games/caro',
  '/games/chess',
  '/games/2048',
  '/games/monopoly',
  '/games/sudoku',
  '/games/word',
  '/games/sequence',
  '/games/caro-engine.js',
  '/games/chess-engine.js',
  '/games/2048-engine.js',
  '/gameverse-icon.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('gameverse-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // These endpoints require the server and must never be treated as offline data.
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/health' ||
    url.pathname === '/events' ||
    url.pathname.includes('/socket')
  ) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        // Ignore query strings so links such as /games/chess?bot=1 can
        // reuse the cached game page while keeping their mode parameters.
        const pathRequest = new Request(url.origin + url.pathname);
        return (await cache.match(request)) ||
          (await cache.match(pathRequest)) ||
          (await cache.match('/')) ||
          Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
