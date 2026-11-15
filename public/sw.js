// Service Worker ligero para habilitar WebAPK nativo en Android sin caches agresivos
self.addEventListener('install', () => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
    // Siempre priorizar red en tiempo real para mantener sincronia con Supabase
    if (event.request.method !== 'GET') return
})
