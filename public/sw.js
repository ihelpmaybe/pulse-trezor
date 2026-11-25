/* Pulse Perch — offline shell. Cache app shell + same-origin assets; never RPC/API.
 * Paths are scope-relative so GitHub Pages (/pulse-trezor/) and root both work. */
const CACHE = "pulse-perch-shell-v5";

function scopeBase() {
  try {
    return new URL(self.registration.scope).pathname;
  } catch {
    return "/";
  }
}

function abs(path) {
  const base = scopeBase();
  const clean = String(path || "").replace(/^\//, "");
  if (!clean) return base;
  return `${base}${clean}`.replace(/\/{2,}/g, "/");
}

self.addEventListener("install", (event) => {
  const SHELL = [
    abs(""),
    abs("index.html"),
    abs("offline.html"),
    abs("manifest.webmanifest"),
    abs("perch-icon.svg"),
    abs("icons/icon-192.png"),
    abs("icons/icon-512.png"),
  ];
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

  const base = scopeBase();
  const assetsPrefix = `${base}assets/`.replace(/\/{2,}/g, "/");

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(abs("index.html"), copy));
          return res;
        })
        .catch(() =>
          caches
            .match(abs("index.html"))
            .then(
              (h) =>
                h ||
                caches.match(abs("")) ||
                caches.match(abs("offline.html")),
            ),
        ),
    );
    return;
  }

  event.respondWith(
    caches
      .match(req)
      .then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (
            res.ok &&
            (url.pathname.startsWith(assetsPrefix) ||
              url.pathname.match(/\.(js|css|svg|png|webp|woff2?|html)$/i))
          ) {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
      .catch(() =>
        caches
          .match(abs("offline.html"))
          .then((h) => h || caches.match(abs(""))),
      ),
  );
});
