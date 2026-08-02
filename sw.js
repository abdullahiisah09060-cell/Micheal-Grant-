const CACHE_NAME = 'sba-portal-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/global.css',
    '/app.js',
    '/firebase-config.js',
    '/login.html',
    '/register.html',
    '/dashboard.html',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate & Cleanup Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
        })
    );
});

// Fetch Strategy: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
    // Skip Firebase/External API calls
    if (event.request.url.includes('googleapis') || event.request.url.includes('firebase')) {
        return;
    }

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
