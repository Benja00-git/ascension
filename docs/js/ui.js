/* Ascension — outils d'interface : gabarits HTML sûrs, formats, icônes, effets, annonces. */
import { versDate, ORDRE_RANGS } from './moteur.js';

/* ───────────────────────── Gabarits : tout texte inséré est échappé ───────────────────────── */

class Sur {
  constructor(texte) {
    this.texte = texte;
  }
  toString() {
    return this.texte;
  }
}
const ECHAPPEMENTS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ECHAPPEMENTS[c]);
/** Marque un HTML comme déjà sûr (à réserver aux fragments construits ici). */
export const brut = v => new Sur(String(v ?? ''));
function rendu(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof Sur) return v.texte;
  if (Array.isArray(v)) return v.map(rendu).join('');
  return esc(v);
}
/** Gabarit étiqueté : h`<p>${texte}</p>` échappe `texte`, sauf s'il vient lui-même de h`…` ou de brut(). */
export function h(morceaux, ...valeurs) {
  let s = '';
  morceaux.forEach((m, i) => {
    s += m;
    if (i < valeurs.length) s += rendu(valeurs[i]);
  });
  return new Sur(s);
}

/* ───────────────────────── Formats ───────────────────────── */

const nf = new Intl.NumberFormat('fr-FR');
export const nombre = n => nf.format(Math.round(n || 0));
const fmt = options => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options });
const F_LONG = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const F_COURT = fmt({ day: 'numeric', month: 'short' });
const F_MOYEN = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
export const dateLongue = iso => F_LONG.format(versDate(iso));
export const dateCourte = iso => F_COURT.format(versDate(iso));
export const dateMoyenne = iso => F_MOYEN.format(versDate(iso));
export const LETTRES_JOUR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const NOMS_JOUR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const pluriel = (n, mot, mots) => `${nombre(n)} ${n > 1 ? mots || mot + 's' : mot}`;
export function ilYA(horodatage) {
  if (!horodatage) return 'jamais';
  const s = Math.max(0, Math.round((Date.now() - horodatage) / 1000));
  if (s < 45) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return `il y a ${Math.round(s / 86400)} j`;
}

/* ───────────────────────── Icônes (traits, 24 × 24) ───────────────────────── */

const TRACES = {
  quetes: '<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M12 7.8v5.4"/><path d="M12 16.2h.01"/>',
  statut: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><circle cx="12" cy="10.3" r="2.6"/><path d="M7.6 17c.9-2 2.5-3.100 4.400-3.100s3.500 1.100 4.400 3.100"/>',
  forge: '<path d="M6.500 7v10"/><path d="M17.500 7v10"/><path d="M3.500 9.500v5"/><path d="M20.500 9.500v5"/><path d="M6.500 12h11"/>',
  donjons: '<path d="M4 21V9.500h2.200V5h3v3h1.800V5h2v3h1.800V5h3v4.500H20V21z"/><path d="M10 21v-4.500a2 2 0 0 1 4 0V21"/>',
  arbre: '<path d="M12 21v-7"/><path d="M12 14c-4.100 0-7-2.500-7-5.800C5 5 7.900 2.800 12 2.800S19 5 19 8.200c0 3.300-2.900 5.800-7 5.800z"/><path d="m12 11-2.300-2.300"/><path d="m12 13.500 2.800-2.800"/>',
  reglages: '<path d="M4 7h9"/><path d="M19 7h1"/><path d="M4 17h1"/><path d="M11 17h9"/><circle cx="16" cy="7" r="2.400"/><circle cx="8" cy="17" r="2.400"/>',
  coche: '<path d="m5 12.500 4.500 4.500L19 7.500"/>',
  flamme: '<path d="M12 21c3.600 0 6-2.500 6-6 0-3.500-2.500-5.200-3.300-8.200-1.600 1-2.600 2.500-2.900 4.200-1.400-1.200-1.800-3-1.500-5C7.600 8 6 11 6 15c0 3.500 2.400 6 6 6z"/>',
  verrou: '<rect x="5" y="11" width="14" height="9.500" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  alerte: '<path d="M12 4 2.800 20h18.400z"/><path d="M12 10v4.500"/><path d="M12 17.300h.01"/>',
  sync: '<path d="M20 12a8 8 0 0 1-14 5.300"/><path d="M4 12a8 8 0 0 1 14-5.300"/><path d="M18 3v4h-4"/><path d="M6 21v-4h4"/>',
  couronne: '<path d="M4.500 18h15l1.200-9-5 3.600L12 6l-3.700 6.600-5-3.600z"/>',
  trophee: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4"/><path d="M8.500 20h7"/><path d="M10 17h4"/>',
  gauche: '<path d="m14.500 6-6 6 6 6"/>',
  droite: '<path d="m9.500 6 6 6-6 6"/>',
  bas: '<path d="m6 9.500 6 6 6-6"/>',
  fermer: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  eclair: '<path d="M13 2.500 5 13.500h6l-1 8 8-11h-6z"/>',
  oeil: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z"/><circle cx="12" cy="12" r="2.800"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.500"/><path d="M12 7.800h.01"/>',
  cle: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8.500-8.500"/><path d="m16 7 2.500 2.500"/>',
  bouclier: '<path d="M12 3 4.500 6v5.500c0 4.500 3 8 7.500 9.500 4.500-1.500 7.500-5 7.500-9.500V6z"/>',
};
export function icone(nom, classe = '') {
  return brut(`<svg class="icone ${esc(classe)}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${TRACES[nom] || ''}</svg>`);
}

/** Emblème de rang : un hexagone, la lettre, et un chevron de plus à chaque rang. */
export function embleme(rang, classe = '') {
  const i = Math.max(0, ORDRE_RANGS.indexOf(rang));
  let points = '';
  for (let k = 0; k < i; k++) {
    points += `<circle class="embleme-pip" cx="${(32 + (k - (i - 1) / 2) * 4.4).toFixed(1)}" cy="47.6" r="1.35"/>`;
  }
  return brut(
    `<svg class="embleme rang-${esc(String(rang).toLowerCase())} ${esc(classe)}" viewBox="0 0 64 64" role="img" aria-label="Rang ${esc(rang)}">` +
      '<path class="embleme-halo" d="M32 3.500 56.700 17.800v28.400L32 60.500 7.300 46.200V17.800z"/>' +
      '<path class="embleme-bord" d="M32 3.500 56.700 17.800v28.400L32 60.500 7.300 46.200V17.800z"/>' +
      '<path class="embleme-interieur" d="M32 9.500 51.500 20.800v22.400L32 54.500 12.500 43.200V20.800z"/>' +
      `<g class="embleme-orn">${points}</g>` +
      `<text class="embleme-lettre" x="32" y="${i ? 31 : 33}" text-anchor="middle" dominant-baseline="central">${esc(rang)}</text>` +
      '</svg>',
  );
}

export function dessinCoffre() {
  return brut(
    '<svg class="coffre-svg" viewBox="0 0 76 68" aria-hidden="true" focusable="false">' +
      '<g class="coffre-rayons"><path d="M38 30V4"/><path d="M38 30 16 8"/><path d="M38 30 60 8"/><path d="M38 30 4 22"/><path d="M38 30l34-8"/></g>' +
      '<rect class="coffre-lueur" x="14" y="26" width="48" height="10" rx="3"/>' +
      '<g class="coffre-caisse"><rect x="12" y="32" width="52" height="26" rx="3.500"/><path d="M12 42h52"/></g>' +
      '<g class="coffre-couvercle"><path d="M12 32v-5a11 11 0 0 1 11-11h30a11 11 0 0 1 11 11v5z"/><path d="M22 16v16"/><path d="M54 16v16"/></g>' +
      '<g class="coffre-serrure"><rect x="33" y="28" width="10" height="11" rx="2.500"/><path d="M38 32.500v3"/></g>' +
      '</svg>',
  );
}

/* ───────────────────────── Effets visuels ───────────────────────── */

const calqueFx = () => document.getElementById('fx');
let animations = true;
export function reglerAnimations(actif) {
  animations = !!actif && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.toggle('sans-animations', !animations);
}

/** Petit texte qui s'élève et s'efface (« +10 XP »). */
export function flotteur(x, y, texte, classe = '') {
  const el = document.createElement('div');
  el.className = `flotteur ${classe}`;
  el.textContent = texte;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  calqueFx().appendChild(el);
  setTimeout(() => el.remove(), animations ? 1300 : 900);
}

/** Gerbe d'éclats autour d'un point. */
export function eclats(x, y, couleur, combien = 14) {
  if (!animations) return;
  const racine = calqueFx();
  for (let i = 0; i < combien; i++) {
    const el = document.createElement('i');
    el.className = 'eclat';
    const angle = (Math.PI * 2 * i) / combien + Math.random() * 0.5;
    const portee = 34 + Math.random() * 46;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.setProperty('--dx', `${Math.cos(angle) * portee}px`);
    el.style.setProperty('--dy', `${Math.sin(angle) * portee}px`);
    el.style.setProperty('--couleur', couleur);
    el.style.animationDelay = `${Math.random() * 60}ms`;
    racine.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }
}

export function centreDe(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/* ───────────────────────── Annonces (bandeaux éphémères) ───────────────────────── */

export function annoncer(texte, { type = 'info', duree = 3600, picto = '' } = {}) {
  const zone = document.getElementById('annonces');
  const el = document.createElement('div');
  el.className = `annonce annonce-${type}`;
  el.setAttribute('role', 'status');
  if (picto) {
    const p = document.createElement('span');
    p.className = 'annonce-picto';
    p.innerHTML = String(icone(picto));
    el.appendChild(p);
  }
  const corps = document.createElement('span');
  corps.className = 'annonce-texte';
  const balise = document.createElement('span');
  balise.className = 'balise';
  balise.textContent = '[SYSTÈME] ';
  corps.appendChild(balise);
  corps.appendChild(document.createTextNode(texte));
  el.appendChild(corps);
  zone.appendChild(el);
  while (zone.children.length > 3) zone.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('sort');
    setTimeout(() => el.remove(), 320);
  }, duree);
}

/* ───────────────────────── Calque : dialogues et grandes annonces ───────────────────────── */

let fermeture = null;
let retourFoyer = null;

export function calqueOuvert() {
  return !document.getElementById('calque').hidden;
}
export function fermerCalque(valeur) {
  const calque = document.getElementById('calque');
  if (calque.hidden) return;
  calque.hidden = true;
  calque.innerHTML = '';
  calque.className = 'calque';
  const f = fermeture;
  fermeture = null;
  if (retourFoyer && document.contains(retourFoyer)) retourFoyer.focus({ preventScroll: true });
  retourFoyer = null;
  if (f) f(valeur);
}
/** Ouvre le calque avec un contenu sûr (h`…`). La promesse se résout à la fermeture. */
export function ouvrirCalque(contenu, { classe = '', fermable = true } = {}) {
  fermerCalque();
  const calque = document.getElementById('calque');
  retourFoyer = document.activeElement;
  calque.className = `calque ${classe}`;
  calque.innerHTML = String(contenu);
  calque.hidden = false;
  calque.dataset.fermable = fermable ? '1' : '';
  const cible = calque.querySelector('[data-foyer]') || calque.querySelector('button, [href], input');
  if (cible) cible.focus({ preventScroll: true });
  return new Promise(resoudre => {
    fermeture = resoudre;
  });
}
export function confirmer({ titre, texte, oui = 'Confirmer', non = 'Annuler', picto = 'info' }) {
  return ouvrirCalque(
    h`<div class="dialogue fenetre" role="alertdialog" aria-modal="true" aria-labelledby="dlg-titre">
        <div class="dialogue-picto">${icone(picto)}</div>
        <h2 id="dlg-titre" class="dialogue-titre">${titre}</h2>
        <p class="dialogue-texte">${texte}</p>
        <div class="dialogue-actions">
          <button class="bouton bouton-discret" data-action="calque-fermer">${non}</button>
          <button class="bouton bouton-plein" data-action="calque-valider" data-foyer>${oui}</button>
        </div>
      </div>`,
    { classe: 'calque-centre' },
  ).then(v => v === true);
}

/* ───────────────────────── Bulle d'information (survol, focus, appui) ───────────────────────── */

export function installerBulles() {
  const bulle = document.createElement('div');
  bulle.className = 'bulle';
  bulle.hidden = true;
  bulle.setAttribute('role', 'tooltip');
  document.body.appendChild(bulle);
  let cible = null;
  let minuterie = null;
  const montrer = el => {
    cible = el;
    bulle.textContent = '';
    const [titre, ...reste] = String(el.dataset.bulle).split(' | ');
    const fort = document.createElement('strong');
    fort.textContent = titre;
    bulle.appendChild(fort);
    if (reste.length) {
      const suite = document.createElement('span');
      suite.textContent = reste.join(' · ');
      bulle.appendChild(suite);
    }
    bulle.hidden = false;
    const r = el.getBoundingClientRect();
    const b = bulle.getBoundingClientRect();
    const x = Math.min(window.innerWidth - b.width - 8, Math.max(8, r.left + r.width / 2 - b.width / 2));
    const dessus = r.top - b.height - 8;
    bulle.style.left = `${x}px`;
    bulle.style.top = `${dessus < 8 ? r.bottom + 8 : dessus}px`;
  };
  const cacher = () => {
    cible = null;
    bulle.hidden = true;
    clearTimeout(minuterie);
  };
  const trouver = e => (e.target instanceof Element ? e.target.closest('[data-bulle]') : null);
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = trouver(e);
    if (el && el !== cible) montrer(el);
    else if (!el && cible) cacher();
  });
  document.addEventListener('focusin', e => {
    const el = trouver(e);
    if (el) montrer(el);
  });
  document.addEventListener('focusout', cacher);
  document.addEventListener(
    'pointerdown',
    e => {
      const el = trouver(e);
      if (e.pointerType !== 'touch') return;
      if (!el) return cacher();
      montrer(el);
      clearTimeout(minuterie);
      minuterie = setTimeout(cacher, 2600);
    },
    { passive: true },
  );
  document.addEventListener('scroll', cacher, true);
}
