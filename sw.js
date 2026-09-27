/*!
 * sw.js — Service Worker ya "Offline Incident & Rescue Report"
 * Lengo: baada ya mtumiaji kufungua app mara moja akiwa na internet (au kuipakua
 * kama ZIP na kuiweka kwenye hosting), app nzima (HTML/CSS/JS/kitabu cha elimu/icons)
 * huhifadhiwa kwenye kifaa (Cache Storage) na kufanya kazi bila internet baadaye.
 *
 * Data za ripoti (IndexedDB) HAZIHIFADHIWI hapa — zinabaki kwenye RescueDB kama kawaida.
 * Faili hii inashughulikia tu faili "tuli" (static assets) za app.
 */

const CACHE_NAME = "rescue-report-cache-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=3",
  "./core.js?v=5",
  "./script.js?v=6",
  "./sync.js?v=1",
  "./announcements.js?v=3",
  "./incident-ai.js?v=1",
  "./fire_education.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) => {
            // Faili moja kukosekana (mfano APK kubwa) haipaswi kuzuia zingine.
            console.warn("SW: imeshindwa kuhifadhi", url, err);
          })
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Mkakati: Cache-first kwa faili za app (haraka + offline), pamoja na
// "stale-while-revalidate" ili kusasisha cache ukiwa na internet tena.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // usiguse maombi ya nje (mfano SadeBooks)

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
