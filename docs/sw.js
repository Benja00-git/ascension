/* Ascension — service worker : met l'appli en cache pour qu'elle s'ouvre sans réseau.
   Les échanges avec GitHub ne passent jamais par ce cache. */
const VERSION = '1.5.0';
const CACHE = `ascension-${VERSION}`;
const FICHIERS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/main.js',
  'js/moteur.js',
  'js/magasin.js',
  'js/depot.js',
  'js/ui.js',
  'js/sons.js',
  'js/forge.js',
  'js/exercices.js',
  'js/vues/quetes.js',
  'js/vues/statut.js',
  'js/vues/donjons.js',
  'js/vues/arbre.js',
  'js/vues/constellation.js',
  'js/vues/reglages.js',
  'js/vues/exploration.js',
  'js/vues/seance.js',
  'js/vues/forge.js',
  'demo/jeu.json',
  'demo/arbre.json',
  'icones/favicon.svg',
  'icones/icone-180.png',
  'icones/icone-192.png',
  'icones/icone-512.png',
];

self.addEventListener('install', evenement => {
  evenement.waitUntil(
    caches
      .open(CACHE)
      .then(cache => cache.addAll(FICHIERS.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', evenement => {
  evenement.waitUntil(
    caches
      .keys()
      .then(cles => Promise.all(cles.filter(c => c.startsWith('ascension-') && c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', evenement => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return; // GitHub et le reste : réseau direct
  evenement.respondWith(
    caches.open(CACHE).then(async cache => {
      const enCache = await cache.match(requete, { ignoreSearch: true });
      if (enCache) return enCache;
      try {
        return await fetch(requete);
      } catch (e) {
        if (requete.mode === 'navigate') {
          const accueil = await cache.match('index.html');
          if (accueil) return accueil;
        }
        throw e;
      }
    }),
  );
});
