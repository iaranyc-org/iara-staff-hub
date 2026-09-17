/* iara Lineup service worker.
 *
 * The app told staff it works offline once installed, which was not true:
 * there was no worker, so a phone with no signal got nothing. A restaurant
 * basement is exactly where someone needs the allergen list.
 *
 * Strategy, chosen per resource rather than one rule for everything:
 *   the page      network first, cache as fallback, so a deploy is picked up
 *                 immediately when there is signal and still opens without it
 *   own assets    cache first, since audio and images never change in place;
 *                 a new clip ships under a new name
 *   cross-origin  fonts are cached as they are fetched, best effort
 *   Firebase      never cached; it needs the network and has its own offline
 *                 handling
 */
const VERSION = 'iara-lineup-v1';
const CORE = [
  './',
  './iara_staff_hub.html',
  './manifest.json',
  './icon-512.png',
  './img/amazon.jpg',
  './img/vitor.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll rejects the whole batch if one file 404s, which would leave the
      // worker uninstalled; add them individually and tolerate a miss.
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Firebase and Google APIs: always live.
  if (/googleapis|firebaseio|firebaseapp|gstatic\.com\/firebasejs/.test(url.href)) return;

  const isDoc = req.mode === 'navigate' || /\.html$/.test(url.pathname);

  if (isDoc) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./iara_staff_hub.html', copy));
          return res;
        })
        .catch(() => caches.match('./iara_staff_hub.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Everything else: serve from cache, fill the cache on first fetch.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
