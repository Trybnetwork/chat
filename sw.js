/* TrybChat service worker — network-first so the app is never stale;
   cache is only an offline fallback for the app shell. Supabase API and
   realtime traffic is never intercepted. */
const CACHE = "trybchat-shell-v1";
const SHELL = [
  "https://chat.trybnetwork.com/",
  "https://chat.trybnetwork.com/manifest.json",
  "https://chat.trybnetwork.com/icon-192.png",
  "https://chat.trybnetwork.com/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch Supabase/CDN calls
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
