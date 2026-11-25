/* Pulse Perch — offline shell. Cache app shell + same-origin assets; never RPC/API. */
const CACHE = "pulse-perch-shell-v4";
const SHELL = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/perch-icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

function isBlocked(url) {
  return /rpc|api\.|scan\.|dexscreener|walletconnect|reown|infura|alchemy/i.test(
    url.href,
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isBlocked(url)) return;

  // Navigations: network first, then cached shell, then offline face
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() =>
          caches
            .match("/index.html")
            .then(
              (h) =>
                h ||
                caches.match("/") ||
                caches.match("/offline.html"),
            ),
        ),
    );
    return;
  }

  // Static assets: cache-first, then network + put
  event.respondWith(
    caches
      .match(req)
      .then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (
            res.ok &&
            (url.pathname.startsWith("/assets/") ||
              url.pathname.match(/\.(js|css|svg|png|webp|woff2?|html)$/i))
          ) {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
      .catch(() => caches.match("/offline.html").then((h) => h || caches.match("/"))),
  );
});
