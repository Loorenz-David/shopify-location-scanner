const APP_SHELL_CACHE = "item-scanner-app-shell-v1";
const STATIC_CACHE = "item-scanner-static-v1";
const CACHE_ALLOWLIST = [APP_SHELL_CACHE, STATIC_CACHE];
const APP_SHELL_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-96x96.png",
  "/apple-touch-icon.png",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
];

function isAppShellRequest(request) {
  return request.mode === "navigate";
}

function isStaticAssetRequest(request) {
  return ["script", "style", "image", "font", "manifest"].includes(
    request.destination,
  );
}

function shouldBypassCache(url, request) {
  if (request.method !== "GET") {
    return true;
  }

  if (url.origin !== self.location.origin) {
    return true;
  }

  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/shopify")) {
    return true;
  }

  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => !CACHE_ALLOWLIST.includes(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
        ),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldBypassCache(url, request)) {
    return;
  }

  if (isAppShellRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          void caches.open(APP_SHELL_CACHE).then((cache) => {
            void cache.put(request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          const shellResponse = await caches.match("/");
          if (shellResponse) {
            return shellResponse;
          }

          throw new Error("No cached app shell available.");
        }),
    );

    return;
  }

  if (isStaticAssetRequest(request)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const networkResponsePromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              void cache.put(request, response.clone());
            }

            return response;
          })
          .catch(() => null);

        if (cachedResponse) {
          void networkResponsePromise;
          return cachedResponse;
        }

        const networkResponse = await networkResponsePromise;
        if (networkResponse) {
          return networkResponse;
        }

        throw new Error("Unable to resolve static asset response.");
      }),
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const title = "Item Scanner";
  const options = {
    body: data.message ?? "You have pending logistic items",
    icon: "/web-app-manifest-192x192.png",
    badge: "/favicon-96x96.png",
    data: { url: "/" },
    tag: "logistic-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            void client.navigate(targetUrl);
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      }),
  );
});
