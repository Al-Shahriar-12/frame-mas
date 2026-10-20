/* Frame MAS service worker: lets the installed app open offline.
   When you change any file, raise the version in CACHE so phones fetch the update. */
const CACHE = "frame-mas-v1.0.0";
const FILES = ["./", "index.html", "three.min.js", "manifest.webmanifest", "favicon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // three.js from the CDN: use the copy saved with the app when offline
  if (url.hostname === "cdnjs.cloudflare.com" && url.pathname.endsWith("/three.min.js")) {
    event.respondWith(fetch(req).catch(() => caches.match("three.min.js")));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); } return res; }).catch(() => caches.match("index.html")));
    return;
  }
  event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
});
