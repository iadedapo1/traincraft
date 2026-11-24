/* The build inserts the version and the list of files before this script. */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(APP_FILES.map(path => new Request(path, { cache: 'reload' })))
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names
      .filter(name => name.startsWith('traincraft-shell-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  const isAppNavigation = request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')
  if (!isAppNavigation && !APP_FILES.includes(url.pathname)) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(isAppNavigation ? '/index.html' : url.pathname)
    return cached ?? fetch(request)
  })())
})
