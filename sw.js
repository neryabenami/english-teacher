/* Service worker: keeps the app, the dictionary and opened articles on the device (Local First). */
const VERSION = 'et-v4.6.1';
const APP = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/data.js', 'js/lex.js', 'js/core.js', 'js/app.js', 'data/dict-en-he.json', 'data/vocab.json',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'
];
const FONTS = 'et-fonts';
const ARTICLES = 'et-articles';
const PHOTOS = 'et-photos';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => ![VERSION, FONTS, ARTICLES, PHOTOS].includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache first, so typography also works offline after the first visit.
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }))));
    return;
  }
  // Article photos (Wikimedia / The Conversation): cache first, keep the newest 60 for offline reading.
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

  // Article list: network first (fresh articles), cached copy when offline.
  if (/\/data\/(articles|news)\/index\.json$/.test(url.pathname)) {
    e.respondWith(caches.open(ARTICLES).then((c) => fetch(req).then((res) => { if (res.ok) c.put(url.pathname, res.clone()); return res; }).catch(() => c.match(url.pathname))));
    return;
  }
  // Article bodies: once opened or prefetched, they stay readable offline. Keep the newest 80.
  if (/\/data\/(articles|news)\//.test(url.pathname)) {
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

  // App files: network first so updates show up right away; the saved copy is used offline or on a slow network.
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req, { cache: 'no-cache' }).then((res) => { if (res.ok) c.put(req, res.clone()); return res; });
    const fallback = () => hit || (req.mode === 'navigate' ? c.match('index.html') : undefined);
    if (!hit) return net.catch(fallback);
    const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 3000));
    return Promise.race([net.catch(() => null), timeout]).then((res) => res || fallback());
  }));
});
