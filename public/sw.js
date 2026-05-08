// ===== 44day_ — service worker (offline cache) =====
const VER = 'v2-260509';
const CORE = 'core-' + VER;
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/hub.css',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CORE).then((c) => c.addAll(CORE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.endsWith(VER)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // never cache API or admin or SSE
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // network-first for HTML, fallback cache
  if (req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req).then((r) => {
        const copy = r.clone();
        caches.open(CORE).then((c) => c.put(req, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(req).then((m) => m || caches.match('/')))
    );
    return;
  }

  // cache-first for static assets
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      if (r.ok) {
        const copy = r.clone();
        caches.open(CORE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return r;
    }).catch(() => m))
  );
});
