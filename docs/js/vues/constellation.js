/* Vue « arbre » de l'Arbre de la connaissance : chaque domaine pousse depuis sa racine, en bas ;
 * chaque branche est une colonne ; un nœud monte d'un étage par prérequis à comprendre avant lui. */
import { h, brut, esc } from '../ui.js';
import { iconeNoeud, libelleNoeud } from './arbre.js';

const PLACE = 112; // largeur d'une place de nœud
const ETAGE = 112; // hauteur d'un étage
const PAR_RANG = 3; // nœuds au plus par rangée dans une branche
const ECART = 28; // entre deux branches
const BAS = 92; // de la racine au socle des branches

/** Les groupes d'un domaine : ses branches de premier niveau, plus les nœuds posés directement sur le domaine. */
function groupes(s, domaine) {
  const liste = [];
  const directs = (s.enfants.get(domaine.nom) || []).filter(e => e.type === 'noeud').map(s.etat);
  if (directs.length) liste.push({ nom: 'Fondations', noeuds: directs });
  for (const b of (s.enfants.get(domaine.nom) || []).filter(e => e.type === 'branche')) {
    const f = s.feuilles(b.nom);
    if (f.length) liste.push({ nom: b.nom, noeuds: f });
  }
  return liste;
}

/** Étage d'un nœud = longueur de la plus longue chaîne de prérequis du même domaine sous lui. */
function etages(noeuds) {
  const parNom = new Map(noeuds.map(n => [n.nom, n]));
  const memo = new Map();
  const etage = (n, pile = new Set()) => {
    if (memo.has(n.nom)) return memo.get(n.nom);
    if (pile.has(n.nom)) return 0; // boucle : on coupe
    pile.add(n.nom);
    const sous = (n.prerequis || []).map(p => parNom.get(p)).filter(Boolean);
    const e = sous.length ? 1 + Math.max(...sous.map(p => etage(p, pile))) : 0;
    pile.delete(n.nom);
    memo.set(n.nom, e);
    return e;
  };
  noeuds.forEach(n => etage(n));
  return memo;
}

/** Positions des nœuds (x, y) et des socles de branche, en pixels ; y grandit vers le bas. */
export function disposer(s, domaine) {
  const gs = groupes(s, domaine);
  const tous = gs.flatMap(g => g.noeuds);
  const niveau = etages(tous);
  const pos = new Map();
  let x0 = 24;
  let rangsMax = 0;
  const colonnes = [];
  for (const g of gs) {
    // Rangées : étage par étage, au plus PAR_RANG nœuds, ordonnés sous leurs prérequis.
    const parEtage = new Map();
    for (const n of g.noeuds) {
      const e = niveau.get(n.nom) || 0;
      if (!parEtage.has(e)) parEtage.set(e, []);
      parEtage.get(e).push(n);
    }
    const rangees = [];
    for (const e of [...parEtage.keys()].sort((a, b) => a - b)) {
      const liste = parEtage.get(e).sort((a, b) => b.maitrise - a.maitrise || a.nom.localeCompare(b.nom, 'fr'));
      for (let i = 0; i < liste.length; i += PAR_RANG) rangees.push(liste.slice(i, i + PAR_RANG));
    }
    const largeur = Math.max(1, ...rangees.map(r => r.length)) * PLACE;
    rangees.forEach((rangee, r) => {
      // Sous un prérequis déjà placé : on trie par position moyenne des prérequis.
      const cle = n => {
        const xs = (n.prerequis || []).map(p => pos.get(p)).filter(Boolean).map(p => p.x);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Infinity;
      };
      rangee.sort((a, b) => cle(a) - cle(b));
      const decal = (largeur - rangee.length * PLACE) / 2;
      rangee.forEach((n, i) => pos.set(n.nom, { x: x0 + decal + PLACE * (i + 0.5), r, n }));
    });
    colonnes.push({ nom: g.nom, x: x0 + largeur / 2, largeur, x0, premiers: (rangees[0] || []).map(n => n.nom) });
    rangsMax = Math.max(rangsMax, rangees.length);
    x0 += largeur + ECART;
  }
  const largeur = Math.max(x0 - ECART + 24, 320);
  const hauteur = 46 + rangsMax * ETAGE + BAS + 60;
  const socle = hauteur - 60 - BAS + 34;
  for (const p of pos.values()) p.y = socle - 96 - p.r * ETAGE;
  return { largeur, hauteur, pos, colonnes, racine: { x: largeur / 2, y: hauteur - 34 }, socle };
}

const courbe = (a, b) => {
  const m = (a.y + b.y) / 2;
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${a.x.toFixed(1)} ${m.toFixed(1)} ${b.x.toFixed(1)} ${m.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
};

/** Coupe un nom en 3 lignes au plus de ~15 caractères. */
function lignes(nom, max = 15, nb = 3) {
  const mots = String(nom).split(/\s+/);
  const out = [];
  let cur = '';
  for (const m of mots) {
    if ((cur + ' ' + m).trim().length <= max) cur = (cur + ' ' + m).trim();
    else {
      if (cur) out.push(cur);
      cur = m;
    }
  }
  if (cur) out.push(cur);
  if (out.length > nb) {
    out.length = nb;
    out[nb - 1] = out[nb - 1].slice(0, max - 1) + '…';
  }
  return out.map(l => (l.length > max + 3 ? l.slice(0, max) + '…' : l));
}

function classeNoeud(n) {
  if (n.verrouille) return 'est-verrouille';
  if (n.rouille) return 'est-rouille';
  if (n.maitrise >= 2) return 'est-compris';
  if (n.maitrise === 1) return 'est-decouvert';
  return 'est-disponible';
}

/** Le dessin SVG d'un domaine. */
export function constellation(s, domaine) {
  const L = disposer(s, domaine);
  if (!L.pos.size) return '';
  const parNom = new Map(s.noeuds.map(n => [n.nom, n]));
  const traits = [];
  // Racine → socles des branches → premiers nœuds.
  for (const c of L.colonnes) {
    const socle = { x: c.x, y: L.socle };
    traits.push(`<path class="trait-tronc" d="${courbe(L.racine, socle)}"/>`);
    for (const nom of c.premiers) {
      const p = L.pos.get(nom);
      if (p && !(p.n.prerequis || []).some(x => L.pos.has(x))) traits.push(`<path class="trait-tronc trait-fin" d="${courbe(socle, { x: p.x, y: p.y + 26 })}"/>`);
    }
  }
  // Nœuds sans prérequis posés plus haut que la première rangée : reliés au socle aussi.
  for (const p of L.pos.values()) {
    if (p.r > 0 && !(p.n.prerequis || []).some(x => L.pos.has(x))) {
      const c = L.colonnes.find(k => p.x >= k.x0 && p.x <= k.x0 + k.largeur);
      if (c) traits.push(`<path class="trait-tronc trait-fin" d="${courbe({ x: c.x, y: L.socle }, { x: p.x, y: p.y + 26 })}"/>`);
    }
  }
  // Prérequis → nœud : allumé quand le prérequis est compris (🌱 et plus).
  for (const p of L.pos.values()) {
    for (const pre of p.n.prerequis || []) {
      const q = L.pos.get(pre);
      if (!q) continue;
      const ok = ((parNom.get(pre) || {}).maitrise || 0) >= 2;
      traits.push(`<path class="trait-prerequis ${ok ? 'est-ouvert' : ''}" d="${courbe({ x: q.x, y: q.y - 26 }, { x: p.x, y: p.y + 26 })}"/>`);
    }
  }
  const socles = L.colonnes.map(
    c => `<g class="socle"><circle cx="${c.x}" cy="${L.socle}" r="5"/><text x="${c.x}" y="${L.socle + 22}" class="socle-nom">${esc(lignes(c.nom, 22, 1)[0])}</text></g>`,
  );
  const circ = 2 * Math.PI * 31;
  const noeuds = [...L.pos.values()].map(({ x, y, n }) => {
    const textes = lignes(n.nom)
      .map((l, i) => `<tspan x="${x}" dy="${i ? 13 : 0}">${esc(l)}</tspan>`)
      .join('');
    const arc = (n.maitrise / 5) * circ;
    return `<g class="etoile ${classeNoeud(n)}" data-action="noeud" data-nom="${esc(n.nom)}" role="button" tabindex="0" aria-label="${esc(n.nom)} : ${esc(libelleNoeud(n))}, niveau ${n.maitrise} sur 5">
      <circle class="etoile-halo" cx="${x}" cy="${y}" r="34"/>
      <circle class="etoile-anneau" cx="${x}" cy="${y}" r="31"/>
      ${n.maitrise ? `<circle class="etoile-maitrise" cx="${x}" cy="${y}" r="31" stroke-dasharray="${arc.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${x} ${y})"/>` : ''}
      <circle class="etoile-coeur" cx="${x}" cy="${y}" r="24"/>
      <text class="etoile-icone" x="${x}" y="${y + 7}">${esc(iconeNoeud(n))}</text>
      <text class="etoile-nom" x="${x}" y="${y + 50}">${textes}</text>
    </g>`;
  });
  const racine = `<g class="racine"><circle cx="${L.racine.x}" cy="${L.racine.y}" r="22"/><text x="${L.racine.x}" y="${L.racine.y + 8}" class="etoile-icone">${esc(domaine.emoji || '🌿')}</text></g>`;
  return h`<svg class="constellation-svg" viewBox="0 0 ${L.largeur} ${L.hauteur}" style="--l:${L.largeur}" role="group" aria-label="Arbre du domaine ${domaine.nom}">
    <defs><radialGradient id="grad-coeur" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#9fe1ff"/><stop offset="1" stop-color="#1d6fb8"/></radialGradient></defs>
    ${brut(traits.join(''))}${brut(socles.join(''))}${brut(racine)}${brut(noeuds.join(''))}
  </svg>`;
}
