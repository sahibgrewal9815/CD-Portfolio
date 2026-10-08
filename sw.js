// Offline support: keeps the app shell (page, scripts, Three.js, fonts)
// cached so the Home Screen app opens without internet.
// Your discs and videos are NOT here — they live in IndexedDB.
// Bump VERSION after you change any site file so iPads pick up the update.
const VERSION = "discs-v1";
const SHELL = [
  "./", "./index.html", "./style.css", "./main.js", "./store.js", "./projects.js",
  "./manifest.webmanifest", "./icons/icon-192.png", "./icons/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
  "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/environments/RoomEnvironment.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  const cacheable =
    url.origin === location.origin ||
    url.hostname === "cdn.jsdelivr.net" ||
    url.hostname.endsWith("fonts.googleapis.com") ||
    url.hostname.endsWith("fonts.gstatic.com");
  if (!cacheable) return;

  // Network first (so updates show up), cache as offline fallback
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
