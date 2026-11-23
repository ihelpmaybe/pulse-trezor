/* Pulse Perch — thin offline shell. Cache app shell only; never cache RPC/API. */
const CACHE = "pulse-perch-shell-v2";
const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/perch-icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API / RPC / explorer
  if (/rpc|api|scan|dexscreener|walletconnect|reown/i.test(url.href)) return;
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).catch(() => caches.match("/"))),
  );
});
