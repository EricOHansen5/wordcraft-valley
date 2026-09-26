// Wordcraft Valley service worker: offline app shell, stale-while-revalidate.
// Bump VERSION whenever you replace index.html so the iPad picks up the new build.
const VERSION = "wcv-2026-09-26b";
// the game voice lives in its own cache so a new build doesn't re-download it
const VOICE = "wcv-voice-1";
const SHELL = ["./", "index.html", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== VOICE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return;
  // voice clips never change: cache first. The clip list is checked online first.
  if (url.pathname.includes("/voice/")) {
    const isIndex = url.pathname.endsWith("index.json");
    e.respondWith(caches.open(VOICE).then(async c => {
      const hit = await c.match(req);
      if (hit && !isIndex) return hit;
      try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; }
      catch (err) { return hit || Response.error(); }
    }));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async cache => {
    const key = req.mode === "navigate" ? "index.html" : req;
    const hit = await cache.match(key, {ignoreSearch: true});
    const net = fetch(req).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || (await cache.match("index.html")) || Response.error();
  }));
});
