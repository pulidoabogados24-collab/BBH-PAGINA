// Service worker del Panel BBH.
// Regla de este archivo: NUNCA servir datos de negocio (ventas, fiados, gastos, caja) desde caché.
// Su único trabajo es (a) cumplir el requisito técnico de instalación como app y (b) dejar
// una pantalla mínima si se abre sin conexión — todo lo demás siempre va a la red primero.

const SHELL_CACHE = 'bbh-panel-shell-v1';
const SHELL_URL = './panel.html';

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.add(SHELL_URL).catch(function () { /* si falla, no bloquea la instalación */ });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== SHELL_CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);

  // Cualquier llamada a Supabase (datos o autenticación) va SIEMPRE a la red. Nunca se cachea.
  if (url.hostname.indexOf('supabase.co') > -1) return;

  // Solo el documento principal (panel.html / "/") intenta red primero y cae a la copia
  // guardada nada más si no hay conexión — así nunca se ve una versión vieja teniendo internet.
  if (req.mode === 'navigate' || url.pathname.endsWith('panel.html') || url.pathname === '/') {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(SHELL_CACHE).then(function (cache) { cache.put(SHELL_URL, copy); });
        return res;
      }).catch(function () {
        return caches.match(SHELL_URL);
      })
    );
  }
  // Todo lo demás (iconos, manifest) simplemente pasa a la red normal.
});
