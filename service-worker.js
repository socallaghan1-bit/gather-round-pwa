const CACHE_NAME = 'gatherround-cache-v11';
// CDNJS assets are version-pinned in their URLs, so they live in their own cache that survives app updates.
const CDN_CACHE_NAME = 'gatherround-cdnjs-v1';
const CDN_CACHE_MAX_ENTRIES = 60;
const MAP_TILES_CACHE_NAME = 'gatherround-map-tiles-v1';
const MAP_TILES_MAX_ENTRIES = 150;
const CDNJS_ORIGIN = 'https://cdnjs.cloudflare.com';
const KEEP_CACHES = [CACHE_NAME, CDN_CACHE_NAME, MAP_TILES_CACHE_NAME];
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './cdn-libs.js',
    './stage-map.js',
    './push-notifications.js',
    './events.json',
    './defunct-grounds.json',
    './heritage.json',
    './facilities.json',
    './data/sanfl-zones-current.geojson',
    './data/sanfl-zones-1990.geojson',
    './data/footy-vault.json',
    './manifest.json',
    './icons/apple-touch-icon.png',
    './icons/grounds/port-adelaide.png',
    './icons/grounds/sturt.png',
    './icons/grounds/norwood.png',
    './icons/grounds/central-district.jpg',
    './icons/grounds/north-adelaide.png',
    './icons/grounds/west-adelaide.png',
    './icons/grounds/glenelg.png',
    './icons/grounds/south-adelaide.png',
    './icons/grounds/woodville-west-torrens.png',
    './icons/grounds/adelaide-crows.jpg',
    './animations/success-check.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((key) => !KEEP_CACHES.includes(key)).map((key) => caches.delete(key))
        ))
    );
    self.clients.claim();
});

async function trimCache(cacheName, maxEntries) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

// Cache First, Network Fallback for CDNJS libraries, stylesheets, and fonts.
async function cdnCacheFirst(event) {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    const response = await fetch(event.request);
    // Only cache successful CORS/basic responses; opaque responses can't be validated and bloat quota.
    if (response.ok && response.type !== 'opaque') {
        const copy = response.clone();
        event.waitUntil(
            caches.open(CDN_CACHE_NAME)
                .then((cache) => cache.put(event.request, copy))
                .then(() => trimCache(CDN_CACHE_NAME, CDN_CACHE_MAX_ENTRIES))
                .catch(() => {})
        );
    }
    return response;
}

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);

    if (requestUrl.origin === CDNJS_ORIGIN) {
        event.respondWith(cdnCacheFirst(event));
        return;
    }

    // Bounded runtime cache for OSM map tiles
    if (requestUrl.hostname.endsWith('tile.openstreetmap.org')) {
        event.respondWith(
            caches.open(MAP_TILES_CACHE_NAME).then(async (cache) => {
                const cached = await cache.match(event.request);
                if (cached) return cached;
                try {
                    const response = await fetch(event.request);
                    if (response.ok && response.type !== 'opaque') {
                        const copy = response.clone();
                        cache.put(event.request, copy).then(() => trimCache(MAP_TILES_CACHE_NAME, MAP_TILES_MAX_ENTRIES)).catch(() => {});
                    }
                    return response;
                } catch (err) {
                    return new Response('', { status: 503, statusText: 'Offline' });
                }
            })
        );
        return;
    }

    // Network-first with cache fallback for dynamic fixture and heritage datasets
    const isDataFile = requestUrl.pathname.endsWith('/events.json') ||
                       requestUrl.pathname.endsWith('/defunct-grounds.json') ||
                       requestUrl.pathname.endsWith('/heritage.json') ||
                       requestUrl.pathname.endsWith('/facilities.json') ||
                       requestUrl.pathname.endsWith('/footy-vault.json') ||
                       requestUrl.pathname.endsWith('.geojson');

    if (isDataFile) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true })
            .then((cached) => cached || fetch(event.request))
    );
});

// ---- Web Push ----

const NOTIFICATION_ICON = new URL('icons/apple-touch-icon.png', self.registration.scope).href;
const DEFAULT_NOTIFICATION_TITLE = 'MyGatherRound 2027';
// Deep links must stay on this app or sanctioned AFL/SA sport sites
const ALLOWED_LINK_HOSTS = ['mygatherround.app', 'afl.com.au', 'adelaideoval.com.au', 'sanfl.com.au'];

function cleanText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function safeUrl(value, { allowExternal }) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
        const url = new URL(value, self.registration.scope);
        if (url.origin === self.location.origin) return url.href;
        if (!allowExternal || url.protocol !== 'https:') return '';
        if (allowExternal === 'any') return url.href;
        const host = url.hostname.toLowerCase();
        return ALLOWED_LINK_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? url.href : '';
    } catch (error) {
        return '';
    }
}

function getAppEventUrl(eventId) {
    const url = new URL('index.html', self.registration.scope);
    if (eventId) url.searchParams.set('event', eventId);
    return url.href;
}

function parsePushPayload(event) {
    if (!event.data) return {};
    try {
        const data = event.data.json();
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (error) {
        return { body: event.data.text() };
    }
}

self.addEventListener('push', (event) => {
    const data = parsePushPayload(event);
    
    // Fallback variables matching payload structure
    const eventId = cleanText(data.eventId, 64).replace(/[^A-Za-z0-9_-]/g, '');
    const appUrl = getAppEventUrl(eventId);
    
    // Check both targetUrl (from admin.html) and url (from original spec)
    const rawTarget = data.targetUrl || data.url;
    const destUrl = safeUrl(rawTarget, { allowExternal: true }) || appUrl;
    
    const imageUrl = safeUrl(data.imageUrl, { allowExternal: 'any' });
    const tag = cleanText(data.tag, 64) || (eventId ? `event-${eventId}` : 'gatherround-alert-' + Date.now());
    const title = cleanText(data.title, 120) || DEFAULT_NOTIFICATION_TITLE;
    const bodyText = cleanText(data.body, 300);

    const options = {
        body: bodyText,
        icon: data.icon || NOTIFICATION_ICON,
        badge: data.badge || NOTIFICATION_ICON,
        vibrate: [200, 100, 200, 100, 200],
        tag,
        renotify: true,
        data: { url: destUrl },
        actions: data.actions || [
            { action: 'open', title: '🏉 View Event' }
        ]
    };

    if (imageUrl) options.image = imageUrl;

    event.waitUntil((async () => {
        // 1. Show OS system notification
        await self.registration.showNotification(title, options);

        // 2. Broadcast to active app windows for in-app toast
        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windowClients) {
            client.postMessage({
                type: 'PUSH_RECEIVED',
                payload: {
                    title,
                    body: bodyText,
                    imageUrl,
                    targetUrl: destUrl
                }
            });
        }
    })());
});

async function openOrFocus(targetUrl) {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = new URL(targetUrl, self.registration.scope);

    if (target.origin === self.location.origin) {
        // Find exact match
        const exact = windowClients.find((client) => client.url === target.href);
        if (exact) {
            exact.focus();
            return;
        }

        // Find any open app instance and navigate it
        const appClient = windowClients.find((client) => new URL(client.url).origin === target.origin);
        if (appClient && 'navigate' in appClient) {
            const navigated = await appClient.navigate(target.href).catch(() => null);
            if (navigated) {
                navigated.focus();
                return;
            }
        }
    }

    // Fallback: open a new window
    return self.clients.openWindow(target.href);
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const data = event.notification.data || {};
    let targetUrl = data.url;
    
    // Ensure we don't open 'undefined'
    const safeTarget = safeUrl(targetUrl, { allowExternal: true }) || getAppEventUrl('');
    event.waitUntil(openOrFocus(safeTarget));
});
