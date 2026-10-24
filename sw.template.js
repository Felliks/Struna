// The service worker: the game's own files are cached on install so it plays offline (a song you load from your device
// never leaves it, so it needs nothing from the network). The network first (a new build is played at once), the cache
// only when offline. A new build has a new cache name and drops the old one; a song of the game's is kept once played,
// in a cache of its own that outlives builds (its mp3 is not fetched up front: tens of MB). Songs fetched from links
// (/api/) are not kept. The build fills in the file list and the version.
const CACHE = 'sim-exe-__VERSION__',
  SONGS = 'sim-exe-songs',
  FILES = __FILES__;
self.addEventListener('install', e =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then(c => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener('activate', e =>
  e.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== SONGS).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);
// the network first, every time: the cache answers only when there is no network at all (offline), never because the
// network is slow (a slow answer from the cache would be an old build, and a page of a new build with modules of an old
// one is broken); what the network answers is kept for the next time offline
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok && r.status === 200) {
          const copy = r.clone();
          caches.open(u.pathname.endsWith('.mp3') ? SONGS : CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(c => c ?? Response.error())),
  );
});
