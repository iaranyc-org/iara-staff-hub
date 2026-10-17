/* iara staff site service worker, covering the hub, Lineup, and Ops - one
 * scope, one worker, since they all live under staff.iara.nyc.
 *
 * The app told staff it works offline once installed, which was not true:
 * there was no worker, so a phone with no signal got nothing. A restaurant
 * basement is exactly where someone needs the allergen list.
 *
 * Strategy, chosen per resource rather than one rule for everything:
 *   the page      network first, cache as fallback, so a deploy is picked up
 *                 immediately when there is signal and still opens without it
 *   own assets    cache first, for speed - most files really don't change in
 *                 place. Team headshots are the one exception (same filename,
 *                 new photo, e.g. img/vitor.jpg), so replacing one needs a
 *                 VERSION bump here too, or an installed PWA keeps the old
 *                 photo indefinitely. Bump VERSION on any image swap, not
 *                 just markup/script changes.
 *   cross-origin  fonts are cached as they are fetched, best effort
 *   Firebase      never cached; it needs the network and has its own offline
 *                 handling
 */
const VERSION = 'iara-lineup-v55';   // v50: kit v2 dialog.js/toast.js/confirm.js precached (Lineup More sheet + feedback need them offline)
// v45: /analytics precached so an offline reload shows the cached page; kit tabs.js
const CORE = [
  './',
  './iara_hub.html',
  './home',
  './iara_home.html',
  './lineup',
  './iara_staff_hub.html',
  './analytics',
  './iara_analytics.html',
  './kit/tokens.css',
  './kit/staff.css',
  './kit/dialog.js',
  './kit/toast.js',
  './kit/confirm.js',
  './ops',
  './iara_kitchen_ops.html',
  './manifest.json',
  './ops-manifest.json',
  './icon-512.png',
  './img/amazon.jpg',
  './img/vitor.jpg',
  './img/lineup-logo.png'
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

  // Live data APIs (the Phone dashboard reads iara-inbox): never cache. Cache-first
  // here froze /phone on its first response, Refresh included.
  if (url.pathname.startsWith('/api/') || url.hostname === 'iara-inbox.vercel.app') return;

  // iara Inbox (/inbox) is its own live app proxied here: never touch it. Cache-first froze its data
  // (a 10-hour-old "connection broken" banner, 2026-10-12) and would pin old builds after deploys.
  if (url.pathname === '/inbox' || url.pathname.startsWith('/inbox/')) return;
  // Private Dining is also its own live app proxied here: same rule as Inbox.
  if (url.pathname === '/private-dining' || url.pathname.startsWith('/private-dining/')) return;

  // Good Vibes content changes all day: never serve it from cache.
  if (url.pathname === '/vibes.json') return;

  const isDoc = req.mode === 'navigate' || /\.html$/.test(url.pathname);
  // The shared staff kit (/kit/*: CSS, nav and palette scripts) changes with every UI release and
  // must always match the page it ships with. Cache-first served yesterday's kit under today's page
  // and broke the nav (2026-10-13). So: network first, cache only as the offline fallback.
  const isKit = url.origin === location.origin && url.pathname.startsWith('/kit/');

  // Root now covers three pages (the hub, Lineup at /lineup, Ops at /ops), so
  // each is cached and matched by its own request rather than one hardcoded
  // key - the old single-key version quietly served Lineup's markup for every
  // route once it was cached. Falls back to Lineup specifically (not the hub)
  // because that is the one staff actually need with no signal in the
  // basement; the hub is just a launcher.
  if (isDoc || isKit) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req)
          .then((r) => r || (isKit ? null : caches.match('./iara_staff_hub.html')))
          .then((r) => r || (isKit ? r : caches.match('./'))))
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
