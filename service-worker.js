const CACHE_NAME = "mahatej-games-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",

  "/snake/",
  "/snake/index.html",
  "/snake/style.css",
  "/snake/snake.js",

  "/memory/",
  "/memory/index.html",
  "/memory/style.css",
  "/memory/memory.js",

  "/math/",
  "/math/index.html",
  "/math/style.css",
  "/math/math.js",

  "/balloon/",
  "/balloon/index.html",
  "/balloon/style.css",
  "/balloon/balloon.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match("/index.html"));
    })
  );
});
