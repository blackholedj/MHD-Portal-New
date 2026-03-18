// public/sw.js
const STATIC_CACHE_NAME = "static-cache-v1";
const IMAGE_CACHE_NAME = "jizdni-rady-images-cache-v1";

// Statické assety, které chceme cachovat při instalaci
const assetsToCache = [
  "/",
  "/user-portal/tables", // Zajištění, že se nacachuje hlavní stránka
  "/manifest.json",
  "/icons/icon-192x192.png",
  // Zde by měly být další kritické CSS/JS soubory (po buildu)
];

// Instalace SW: Cachování statických assetů
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Installing static assets.");
      return cache.addAll(assetsToCache).catch((error) => {
        console.warn("[Service Worker] Failed to cache some assets:", error);
      });
    })
  );
});

// Aktivace SW: Vyčištění starých cache
self.addEventListener("activate", (event) => {
  const cacheAllowList = [STATIC_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheAllowList.indexOf(cacheName) === -1) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch událost: Strategie cachování
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 1. STRATEGIE PRO OBRÁZKY SUPABASE (Cache First)
  if (
    url.hostname === "abfuprplwnftsvichild.supabase.co" &&
    url.pathname.includes("jizdni-rady")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Vrátit cachovanou verzi, pokud existuje
        if (cachedResponse) {
          return cachedResponse;
        }

        // Pokud ne, jít do sítě a cachovat
        return fetch(event.request)
          .then((response) => {
            // Kontrola validity odezvy
            if (
              !response ||
              response.status !== 200 ||
              response.type !== "basic"
            ) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(IMAGE_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch((error) => {
            console.error("[Service Worker] Image fetch failed:", error);
            // Můžete vrátit placeholder obrázek
            // return new Response('Image failed to load', { status: 404 });
          });
      })
    );
    return;
  }

  // 2. STRATEGIE PRO STRÁNKY/API (Network First nebo Cache Fallback)
  // Pro zjednodušení použijeme jen obecnou cache pro JS/CSS assety
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
