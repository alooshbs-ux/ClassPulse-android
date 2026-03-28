/**
 * EduPulse — Service Worker v2
 * © ALAA BANI SALAMEH
 */

const CACHE_NAME = 'edupulse-v2';
const OFFLINE_URL = '/index.html';

const PRECACHE_URLS = ['/', '/index.html'];

const PREWARM_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
];

const CDN_HOSTS = [
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

const BYPASS_HOSTS = [
  'firebaseio.com',
  'firestore.googleapis.com',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(PRECACHE_URLS);
      await Promise.allSettled(
        PREWARM_CDN.map(url =>
          fetch(url, { mode: 'cors', credentials: 'omit' })
            .then(res => { if(res.ok) cache.put(url, res); })
            .catch(() => {})
        )
      );
    })
    .then(() => self.skipWaiting())
    .catch(err => console.warn('[SW] Install failed:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if(req.method !== 'GET') return;
  if(!req.url.startsWith('http')) return;
  if(BYPASS_HOSTS.some(h => url.hostname.includes(h))) return;

  if(CDN_HOSTS.some(h => url.hostname.includes(h))){
    event.respondWith(
      caches.match(req).then(cached => {
        if(cached) return cached;
        return fetch(req).then(res => {
          if(res.ok){
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  if(url.origin === self.location.origin){
    event.respondWith(
      fetch(req)
        .then(res => {
          if(res.ok){
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
  }
});

self.addEventListener('message', event => {
  if(event.data === 'SKIP_WAITING') self.skipWaiting();
});
```
