/* Écran « Statut » : la Fenêtre de statut — niveau, rang, six axes, séries, historique, succès. */
import * as M from '../moteur.js';
import { magasin } from '../magasin.js';
import { h, brut, esc, icone, embleme, nombre, dateCourte, dateMoyenne, pluriel, LETTRES_JOUR } from '../ui.js';

const COULEUR_AXE = id => `var(--axe-${id})`;

/* Profil des six axes. Une seule série : le polygone. Les pastilles reprennent la couleur de chaque axe,
   et la liste de jauges à côté donne les mêmes valeurs en clair. */
function radar(axes) {
  const taille = 300;
  const c = taille / 2;
  const R = 88;
  const max = Math.max(5, Math.ceil(Math.max(...axes.map(a => a.niveau + a.ratio)) / 5) * 5);
  const point = (i, v, rayon = R) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / axes.length;
    const r = (rayon * Math.min(v, max)) / max;
    return [c + r * Math.cos(angle), c + r * Math.sin(angle)];
  };
  const poly = v => axes.map((_, i) => point(i, v).map(n => n.toFixed(1)).join(',')).join(' ');
  const anneaux = [0.25, 0.5, 0.75, 1].map(k => `<polygon class="radar-grille" points="${poly(max * k)}"/>`).join('');
  const rayons = axes.map((_, i) => { const [x, y] = point(i, max); return `<line class="radar-grille" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const valeurs = axes.map((a, i) => point(i, a.niveau + a.ratio));
  const forme = valeurs.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const marques = axes
    .map((a, i) => {
      const [x, y] = valeurs[i];
      const [lx, ly] = point(i, max, R + 30);
      const ancre = Math.abs(lx - c) < 8 ? 'middle' : lx > c ? 'start' : 'end';
      const bulle = `${a.nom} | niveau ${a.niveau} | ${nombre(a.xp)} XP`;
      return (
        `<g class="radar-axe">` +
        `<text class="radar-nom" x="${lx.toFixed(1)}" y="${(ly - 5).toFixed(1)}" text-anchor="${ancre}">${esc(a.emoji)} ${esc(a.stat)}</text>` +
        `<text class="radar-niv" x="${lx.toFixed(1)}" y="${(ly + 11).toFixed(1)}" text-anchor="${ancre}">niv. ${a.niveau}</text>` +
        `<circle class="radar-point" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" style="fill:${COULEUR_AXE(a.id)}"/>` +
        `<circle class="radar-cible" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15" tabindex="0" role="img" aria-label="${esc(bulle.replaceAll(' | ', ', '))}" data-bulle="${esc(bulle)}"/>` +
        `</g>`
      );
    })
    .join('');
  return brut(
    `<svg class="radar" viewBox="0 0 ${taille} ${taille}" role="group" aria-label="Profil des six axes">` +
      anneaux + rayons +
      `<polygon class="radar-aire" points="${forme}"/><polygon class="radar-trait" points="${forme}"/>` +
      marques +
      `</svg>`,
  );
}

function blocIdentite() {
  const { jeu, calcul } = magasin;
  const g = calcul.global;
  const suivant = calcul.rangSuivant;
  const rythme = calcul.semainePrecedente ? calcul.semainePrecedente.xpTotal : 0;
  let horizon = '';
  if (suivant) {
    const reste = suivant.xp - calcul.xp;
    horizon = `Rang ${suivant.rang} au niveau ${suivant.niveau} : encore ${nombre(reste)} XP`;
    if (rythme > 0) horizon += ` (environ ${pluriel(Math.ceil(reste / rythme), 'semaine')} au rythme de la semaine dernière)`;
    horizon += '.';
  } else {
    horizon = 'Rang S : le sommet est atteint.';
  }
  const echelle = M.ORDRE_RANGS.map(r => {
    const atteint = calcul.niveau >= jeu.regles.paliersRang[r];
    return h`<li class="${r === calcul.rang ? 'est-actuel' : atteint ? 'est-atteint' : ''}">${embleme(r, 'embleme-mini')}<span>niv. ${jeu.regles.paliersRang[r]}</span></li>`;
  });
  return h`<section class="fenetre identite">
    <div class="identite-embleme">${embleme(calcul.rang, 'embleme-grand')}</div>
    <div class="identite-corps">
      <div class="etiquette">Fenêtre de statut</div>
      <div class="heros"><span class="heros-mot">Niveau</span> <span class="heros-chiffre">${calcul.niveau}</span></div>
      <div class="identite-rang">Rang ${calcul.rang} · ${nombre(calcul.xp)} XP au total</div>
      <div class="jauge jauge-xp" role="progressbar" aria-valuemin="${g.bas}" aria-valuemax="${g.haut}" aria-valuenow="${calcul.xp}" aria-label="XP vers le niveau ${g.niveau + 1}"><div class="jauge-plein" style="width:${(g.ratio * 100).toFixed(1)}%"></div></div>
      <div class="identite-suite">Niveau ${g.niveau + 1} à ${nombre(g.haut)} XP : encore ${nombre(g.haut - calcul.xp)} XP.</div>
      <div class="identite-suite">${horizon}</div>
    </div>
    <ol class="echelle-rangs" aria-label="Échelle des rangs">${echelle}</ol>
  </section>`;
}

function blocAxes() {
  const { calcul } = magasin;
  const lignes = calcul.axes.map(
    a => h`<li class="axe-ligne axe-${a.id}">
      <span class="axe-nom"><i class="pastille"></i>${a.emoji} ${a.nom}</span>
      <span class="axe-niv">Niv. ${a.niveau}</span>
      <div class="jauge jauge-axe" role="progressbar" aria-valuemin="${a.bas}" aria-valuemax="${a.haut}" aria-valuenow="${a.xp}" aria-label="${a.nom} : XP vers le niveau ${a.niveau + 1}"><div class="jauge-plein" style="width:${(a.ratio * 100).toFixed(1)}%"></div></div>
      <span class="axe-xp">${nombre(a.xp)} / ${nombre(a.haut)} XP</span>
    </li>`,
  );
  return h`<section class="bloc">
    <h2 class="bloc-titre">Les six axes</h2>
    <div class="axes-grille">
      <figure class="radar-cadre">${radar(calcul.axes)}<figcaption>Niveau de chaque axe (échelle 0 → ${Math.max(5, Math.ceil(Math.max(...calcul.axes.map(a => a.niveau + a.ratio)) / 5) * 5)})</figcaption></figure>
      <ul class="axes">${lignes}</ul>
    </div>
  </section>`;
}

function tuile(libelle, valeur, note = '') {
  return h`<li class="tuile"><span class="tuile-libelle">${libelle}</span><span class="tuile-valeur">${valeur}</span>${note ? h`<span class="tuile-note">${note}</span>` : ''}</li>`;
}

function blocCompteurs() {
  const { calcul } = magasin;
  const k = calcul.compteurs;
  return h`<section class="bloc">
    <h2 class="bloc-titre">Compteurs</h2>
    <ul class="tuiles">
      ${tuile('Série en cours', pluriel(k.serie, 'jour'), `record : ${k.serieRecord}`)}
      ${tuile('Coffres ouverts', nombre(k.coffres), k.serieCoffres > 1 ? `${k.serieCoffres} d’affilée` : '')}
      ${tuile('Quêtes accomplies', nombre(k.quetes))}
      ${tuile('Jours actifs', `${nombre(k.joursActifs)} / ${nombre(k.joursJoues)}`)}
      ${tuile('Mode survie', calcul.survie ? 'Actif' : 'Non', calcul.survie ? '' : `${pluriel(k.sansSurvie, 'jour')} sans`)}
      ${tuile('Étages de donjon', nombre(k.etages), k.boss ? pluriel(k.boss, 'boss', 'boss') : '')}
    </ul>
  </section>`;
}

function blocSemaine() {
  const { jeu, calcul } = magasin;
  const s = calcul.semaine;
  const parts = jeu.axes.map(a => ({ ...a, xp: s.xp[a.id] || 0 })).filter(a => a.xp > 0);
  const barre = parts.length
    ? h`<div class="segments" role="img" aria-label="Répartition de l’XP de la semaine par axe">${parts.map(
        a => h`<i class="axe-${a.id}" style="flex-grow:${a.xp}" tabindex="0" data-bulle="${a.nom} | ${nombre(a.xp)} XP | ${Math.round((a.xp / s.xpTotal) * 100)} %"></i>`,
      )}</div>`
    : '';
  const lignes = jeu.axes.map(a => h`<li class="axe-${a.id}"><span><i class="pastille"></i>${a.emoji} ${a.nom}</span><strong>${nombre(s.xp[a.id] || 0)} XP</strong></li>`);
  return h`<section class="bloc">
    <h2 class="bloc-titre">Semaine ${M.numeroSemaine(s.lundi)} <span class="bloc-compte">${nombre(s.xpTotal)} XP</span></h2>
    <ul class="tuiles tuiles-3">
      ${tuile('Quotidiennes', `${s.faites}/${s.total}`)}
      ${tuile('Coffres', nombre(s.coffres))}
      ${tuile('Hebdomadaires', `${s.hebdoFaites}/${s.hebdo.length}`)}
    </ul>
    ${barre}
    <ul class="repartition">${lignes}</ul>
  </section>`;
}

function palier(ratio) {
  if (ratio <= 0) return 0;
  if (ratio >= 1) return 4;
  return ratio <= 0.34 ? 1 : ratio <= 0.67 ? 2 : 3;
}

function blocChaleur() {
  const { jeu, calcul } = magasin;
  const auj = calcul.aujourdhui;
  const dernier = M.lundiDe(auj);
  const semaines = 16;
  const colonnes = [];
  for (let s = semaines - 1; s >= 0; s--) {
    const lundi = M.ajouterJours(dernier, -7 * s);
    const cases = [];
    for (let i = 0; i < 7; i++) {
      const d = M.ajouterJours(lundi, i);
      const j = calcul.jours.get(d);
      if (!j) {
        cases.push(h`<i class="case hors-jeu"></i>`);
        continue;
      }
      const ratio = j.total ? j.faites / j.total : 0;
      const texte = `${dateMoyenne(d)} | ${j.faites}/${j.total} quêtes${j.survie ? ' (survie)' : ''}${j.coffre ? ' | coffre ouvert' : ''}${j.xp ? ` | +${j.xp} XP` : ''}`;
      cases.push(h`<i class="case palier-${palier(ratio)} ${j.coffre ? 'a-coffre' : ''} ${d === auj ? 'est-aujourdhui' : ''}" tabindex="0" role="img" aria-label="${texte.replaceAll(' | ', ', ')}" data-bulle="${texte}"></i>`);
    }
    colonnes.push(h`<div class="chaleur-colonne">${cases}</div>`);
  }
  const lignesTable = [];
  for (let s = 0; s < 12; s++) {
    const lundi = M.ajouterJours(dernier, -7 * s);
    if (M.ajouterJours(lundi, 6) < jeu.debut) break;
    const r = s === 0 ? calcul.semaine : M.resumeSemaine(jeu, calcul.jours, calcul.faits, magasin.etat, lundi);
    lignesTable.push(h`<tr><th scope="row">S${M.numeroSemaine(lundi)} · ${dateCourte(lundi)}</th><td>${r.faites}/${r.total}</td><td>${r.coffres}</td><td>${r.hebdoFaites}/${r.hebdo.length}</td><td>${nombre(r.xpTotal)}</td></tr>`);
  }
  return h`<section class="bloc">
    <h2 class="bloc-titre">Régularité <span class="bloc-compte">16 semaines</span></h2>
    <div class="chaleur">
      <div class="chaleur-jours" aria-hidden="true">${LETTRES_JOUR.map(l => h`<span>${l}</span>`)}</div>
      <div class="chaleur-grille">${colonnes}</div>
    </div>
    <div class="chaleur-legende" aria-hidden="true">
      <span>0</span><i class="case palier-0"></i><i class="case palier-1"></i><i class="case palier-2"></i><i class="case palier-3"></i><i class="case palier-4"></i><span>toutes</span>
      <span class="legende-coffre"><i class="case palier-4 a-coffre"></i> coffre</span>
    </div>
    <details class="tableau-repli">
      <summary>Voir le tableau des semaines</summary>
      <table class="tableau">
        <thead><tr><th scope="col">Semaine</th><th scope="col">Quotidiennes</th><th scope="col">Coffres</th><th scope="col">Hebdo</th><th scope="col">XP</th></tr></thead>
        <tbody>${lignesTable}</tbody>
      </table>
    </details>
  </section>`;
}

function blocSucces() {
  const { calcul } = magasin;
  const obtenus = calcul.succes.filter(s => s.obtenu).sort((a, b) => (a.obtenu < b.obtenu ? 1 : -1));
  const caches = calcul.succes.length - obtenus.length;
  return h`<section class="bloc">
    <h2 class="bloc-titre">Succès <span class="bloc-compte">${obtenus.length}/${calcul.succes.length}</span></h2>
    <ul class="succes">
      ${obtenus.map(s => h`<li class="succes-carte est-obtenu"><span class="succes-picto">${icone('trophee')}</span><span class="succes-corps"><strong>${s.titre}</strong><span>${s.texte}</span><em>${dateCourte(s.obtenu)}</em></span></li>`)}
      ${caches > 0 ? h`<li class="succes-carte est-cache"><span class="succes-picto">${icone('verrou')}</span><span class="succes-corps"><strong>${pluriel(caches, 'succès caché', 'succès cachés')}</strong><span>Le Système les révélera quand ils tomberont.</span></span></li>` : ''}
    </ul>
  </section>`;
}

const LIBELLE_TYPE = { quotidienne: 'Quête', rattrapage: 'Rattrapage', coffre: 'Coffre', hebdo: 'Hebdomadaire', donjon: 'Donjon', arbre: 'Arbre', systeme: 'Système', correction: 'Correction' };

function blocJournal() {
  const { jeu, calcul } = magasin;
  const lignes = [
    ...calcul.faits.map(f => ({ le: f.le, t: f.t, ordre: 0, fait: f })),
    ...calcul.paliers.map(p => ({ le: p.le, t: Infinity, ordre: 1, palier: p })),
  ]
    .sort((a, b) => (a.le < b.le ? 1 : a.le > b.le ? -1 : b.ordre - a.ordre || b.t - a.t))
    .slice(0, 16);
  if (!lignes.length) return '';
  return h`<section class="bloc">
    <h2 class="bloc-titre">Journal du Système</h2>
    <ul class="journal">${lignes.map(l => {
      if (l.palier) {
        const p = l.palier;
        return h`<li class="journal-palier"><span class="journal-date">${dateCourte(l.le)}</span><span class="journal-texte">${icone('eclair')} Niveau ${p.niveau} atteint${p.rang !== p.rangAvant ? ` — rang ${p.rang}` : ''}</span></li>`;
      }
      const f = l.fait;
      const axe = f.axe ? M.axeDe(jeu, f.axe) : null;
      return h`<li class="${axe ? `axe-${axe.id}` : ''}"><span class="journal-date">${dateCourte(l.le)}</span><span class="journal-texte"><i class="pastille"></i><span class="journal-type">${LIBELLE_TYPE[f.type] || 'Système'}</span> ${f.titre}</span><span class="journal-xp">${f.xp < 0 ? '−' : '+'}${nombre(Math.abs(f.xp))}${axe ? ` ${axe.stat}` : ''}</span></li>`;
    })}</ul>
  </section>`;
}

export function vueStatut() {
  return h`<div class="page page-statut">
    ${blocIdentite()}
    <div class="colonnes">
      <div class="colonne">
        ${blocAxes()}
        ${blocSemaine()}
      </div>
      <div class="colonne">
        ${blocCompteurs()}
        ${blocChaleur()}
      </div>
    </div>
    <div class="colonnes">
      <div class="colonne">${blocSucces()}</div>
      <div class="colonne">${blocJournal()}</div>
    </div>
  </div>`;
}
