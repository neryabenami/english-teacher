/* Service worker: the app opens instantly from the device (Local First), and updates arrive in the background.
   - App code (APP list) is kept per VERSION and served from the device. A new version of the code arrives as a new
     sw.js (VERSION changes): it downloads everything fresh, takes over, and the page reloads once (see app.js).
   - Words, dictionary and the article list are served from the device at once and refreshed in the background;
     when the refreshed copy differs, open pages are told ('data-updated') and show the new content right away.
   - Opened articles and photos stay readable offline. */
const VERSION = 'et-v4.10.3';
const APP = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/data.js', 'js/lex.js', 'js/core.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];
const DATA = ['data/vocab.json', 'data/dict-en-he.json', 'data/news/index.json'];
const FONTS = 'et-fonts';
const ARTICLES = 'et-articles';
const PHOTOS = 'et-photos';
const DATA_CACHE = 'et-data';
const KEEP = [VERSION, FONTS, ARTICLES, PHOTOS, DATA_CACHE];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache, so a new version is really new
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const notify = (path) => self.clients.matchAll({ type: 'window' }).then((all) => all.forEach((c) => c.postMessage({ type: 'data-updated', path })));
const sameBody = async (a, b) => {
  if (!a || !b) return false;
  const [x, y] = await Promise.all([a.clone().text(), b.clone().text()]);
  return x === y;
};

/* data: answer from the device now, refresh in the background, tell the page when something new arrived */
function staleWhileRevalidate(e, key) {
  const cache = caches.open(DATA_CACHE);
  const hit = cache.then((c) => c.match(key));
  const refresh = fetch(new Request(e.request.url, { cache: 'no-cache' })).then(async (res) => {
    if (!res.ok) return res;
    const c = await cache;
    const old = await c.match(key); // a fresh copy: the one in `hit` was already handed to the page
    const changed = old && !(await sameBody(old, res));
    await c.put(key, res.clone());
    if (changed) notify(key);
    return res;
  });
  e.respondWith(hit.then((h) => h || refresh));
  e.waitUntil(refresh.catch(() => {})); // registered right away, so the background refresh is allowed to finish
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache first, so typography also works offline after the first visit.
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }))));
    return;
  }
  // Article photos: cache first, keep the newest 60 for offline reading.
  if (/(^|\.)wikimedia\.org$|^images\.theconversation\.com$/.test(url.host) && req.destination === 'image') {
    e.respondWith(caches.open(PHOTOS).then((c) => c.match(req).then((hit) => hit || fetch(req).then(async (res) => {
      if (res.ok || res.type === 'opaque') {
        await c.put(req, res.clone());
        const keys = await c.keys();
        if (keys.length > 60) await Promise.all(keys.slice(0, keys.length - 60).map((k) => c.delete(k)));
      }
      return res;
    }))));
    return;
  }
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  const path = url.pathname.startsWith(scope) ? url.pathname.slice(scope.length) : url.pathname;

  // Words, dictionary, article list
  if (DATA.includes(path)) { staleWhileRevalidate(e, path); return; }
  // Article bodies: once opened or prefetched, they stay readable offline. Keep the newest 80.
  if (/^data\/(articles|news)\//.test(path)) {
    e.respondWith(caches.open(ARTICLES).then((c) => c.match(url.pathname).then((hit) => hit || fetch(req).then(async (res) => {
      if (res.ok) {
        await c.put(url.pathname, res.clone());
        const keys = await c.keys();
        if (keys.length > 80) await Promise.all(keys.slice(0, keys.length - 80).map((k) => c.delete(k)));
      }
      return res;
    }))));
    return;
  }

  // App code and pages: straight from the device (this version's copy); the network only for files not stored yet
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    // other pages go to the network; the app page is the offline fallback for the app's own address only
    return hit || fetch(req).catch(() => (req.mode === 'navigate' ? c.match('index.html') : undefined));
  }));
});
