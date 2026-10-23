/* TrybChat service worker — network-first so the app is never stale;
   cache is only an offline fallback for the app shell. Supabase API and
   realtime traffic is never intercepted. */
const CACHE = "trybchat-shell-v14";
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

self.addEventListener("push", (event) => {
  let note = { title: "TrybChat", body: "You have a new message." };
  try { note = { ...note, ...event.data.json() }; } catch (e) { /* keep defaults */ }
  event.waitUntil(
    self.registration.showNotification(note.title, {
      body: note.body,
      icon: note.icon || "https://chat.trybnetwork.com/icon-192.png",
      badge: note.badge || "https://chat.trybnetwork.com/icon-192.png",
      tag: note.tag || "tc-message",
      data: note.data || { url: "https://chat.trybnetwork.com/" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "https://chat.trybnetwork.com/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.startsWith("https://chat.trybnetwork.com") && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(url);
    })
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
