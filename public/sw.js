const SHELL_CACHE = 'bee4-app-shell-v1';
const RUNTIME_ASSET_CACHE = 'bee4-runtime-assets-v1';

const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="en-IN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <title>Offline · BEE4</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: radial-gradient(circle at top left, #172554, #0f172a 60%, #090d16);
        color: #f8fafc;
      }
      .card {
        width: 100%;
        max-width: 420px;
        padding: 32px 24px;
        border-radius: 24px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
        text-align: center;
      }
      .logo {
        width: 72px;
        height: 72px;
        border-radius: 18px;
        margin: 0 auto 16px;
        display: block;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 20px;
        line-height: 1.3;
        font-weight: 800;
      }
      p {
        margin: 0 0 22px;
        font-size: 14px;
        line-height: 1.55;
        color: #cbd5e1;
      }
      button {
        width: 100%;
        height: 46px;
        border: 0;
        border-radius: 14px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        color: #ffffff;
        background: linear-gradient(180deg, #f59e0b, #d97706);
      }
    </style>
  </head>
  <body>
    <main class="card">
      <img class="logo" src="/icons/icon-192.png" alt="BEE4" />
      <h1>You&apos;re Offline — Check Connection to Continue Shopping on BEE4</h1>
      <p>
        Live stock, prices, orders, and BEE4 Wallet balances stay synced automatically once your internet connection is back.
      </p>
      <button type="button" onclick="window.location.reload()">Try Again</button>
    </main>
  </body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(async (cache) => {
      await Promise.allSettled(
        APP_SHELL_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response && response.ok) {
              await cache.put(url, response);
            }
          } catch {
            // Skip any asset unavailable during install
          }
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const validCaches = new Set([SHELL_CACHE, RUNTIME_ASSET_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !validCaches.has(key)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isViteDevOrModuleAsset(url) {
  return (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/@fs/') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/__vite_ping') ||
    url.searchParams.has('t') ||
    url.searchParams.has('v')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Always network-only for external APIs, live data endpoints, and server routes
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  // Never interfere with Vite dev modules, HMR, or live /admin navigation caches
  if (isViteDevOrModuleAsset(url)) {
    return;
  }

  // Navigation requests: Network-First, preserving live /admin & live storefront data
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok && url.pathname === '/') {
            const copy = networkResponse.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Static shell icons, manifest, and built assets: Network-First with cache fallback
  const isStaticAsset =
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches
              .open(RUNTIME_ASSET_CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || Response.error();
        })
    );
  }
});
