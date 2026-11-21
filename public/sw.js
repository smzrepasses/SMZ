// Service worker do SMZ Repasses — só deixa o app instalável e abrir mais rápido.
// Dados financeiros NUNCA ficam em cache aqui: ficam no Supabase e no aparelho (já existente no sistema).
const CACHE = 'smz-shell-v4';
const SHELL = ['./', 'index.html', 'config.js', 'visual.js', 'visual.css', 'logo-smz.webp', 'favicon.png', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Rede primeiro (sempre pega a versão nova depois de um deploy); se estiver sem internet, usa o cache.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // Supabase, CDN e fontes passam direto
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
