const CACHE = "flirty-shell-v1";
const SHELL = ["/", "/welcome", "/logo/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/ws")) return;
  if (event.request.headers.get("authorization")) return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((hit) => hit || caches.match("/welcome"))),
  );
});
