// Service worker til Animal Hunt (PWA). Ligger i public/ → kopieres uændret til
// dist-roden og kører i app'ens scope. Strategi:
//   • Navigationer (HTML): network-first → nyeste version, falder tilbage til cache offline.
//   • Øvrige GET (hashede JS/CSS + GLB-modeller): cache-first → hurtigt og offline-klart.
// Filnavnene er indholds-hashede ved build, så cache-first er sikkert.

const CACHE = 'animal-hunt-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      if (req.mode === 'navigate') {
        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error();
        }
      }

      const cached = await cache.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })(),
  );
});
