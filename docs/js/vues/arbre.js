/* Écran « Arbre » : l'Arbre de la connaissance, en lecture. Les niveaux se gagnent avec le Système. */
import { NIVEAUX_ARBRE, explorationsConsommees } from '../moteur.js';
import { magasin } from '../magasin.js';
import { h, icone, dateCourte, pluriel } from '../ui.js';
import { constellation } from './constellation.js';

/** Organise la liste plate d'arbre.json en domaines → branches → nœuds. */
export function structurer(arbre, aujourdhui) {
  const elements = (arbre && arbre.noeuds) || [];
  const parNom = new Map(elements.map(e => [e.nom, e]));
  const enfants = new Map();
  for (const e of elements) {
    if (e.type === 'domaine') continue;
    const parent = e.parent && parNom.has(e.parent) ? e.parent : e.domaine;
    if (!enfants.has(parent)) enfants.set(parent, []);
    enfants.get(parent).push(e);
  }
  const etat = n => {
    const m = n.maitrise || 0;
    const manque = (n.prerequis || []).filter(p => ((parNom.get(p) || {}).maitrise || 0) < 2);
    const rouille = !!n.revision && n.revision <= aujourdhui;
    return { ...n, maitrise: m, verrouille: m === 0 && manque.length > 0, manque, rouille };
  };
  const feuilles = nom => {
    const liste = [];
    for (const e of enfants.get(nom) || []) {
      if (e.type === 'noeud') liste.push(etat(e));
      else liste.push(...feuilles(e.nom));
    }
    return liste;
  };
  const noeuds = elements.filter(e => e.type === 'noeud').map(etat);
  const domaines = elements
    .filter(e => e.type === 'domaine')
    .map(d => ({ ...d, feuilles: feuilles(d.nom), enfants: enfants.get(d.nom) || [] }));
  return { domaines, enfants, etat, feuilles, noeuds };
}

export function iconeNoeud(n) {
  if (n.rouille) return '🍂';
  if (n.verrouille) return '🔒';
  return NIVEAUX_ARBRE[n.maitrise] ? NIVEAUX_ARBRE[n.maitrise].icone : '⚪';
}
export function libelleNoeud(n) {
  if (n.verrouille) return 'Verrouillé';
  const niv = NIVEAUX_ARBRE[n.maitrise];
  return niv ? `${niv.nom}${n.maitrise ? ` — ${niv.etat}` : ''}` : '—';
}

function ligneNoeud(n) {
  const pips = [1, 2, 3, 4, 5].map(i => h`<i class="${i <= n.maitrise ? 'plein' : ''}"></i>`);
  return h`<li><button class="noeud ${n.verrouille ? 'est-verrouille' : ''} ${n.rouille ? 'est-rouille' : ''}" data-action="noeud" data-nom="${n.nom}">
    <span class="noeud-icone" aria-hidden="true">${iconeNoeud(n)}</span>
    <span class="noeud-nom">${n.nom}</span>
    <span class="noeud-pips" aria-label="${libelleNoeud(n)}, niveau ${n.maitrise} sur 5">${pips}</span>
  </button></li>`;
}

function rameau(s, parent, profondeur) {
  const enfants = s.enfants.get(parent) || [];
  const noeuds = enfants.filter(e => e.type === 'noeud').map(s.etat);
  const branches = enfants.filter(e => e.type === 'branche');
  return h`
    ${noeuds.length ? h`<ul class="noeuds">${noeuds.map(ligneNoeud)}</ul>` : ''}
    ${branches.map(b => {
      const f = s.feuilles(b.nom);
      const acquis = f.filter(n => n.maitrise >= 2).length;
      return h`<div class="branche profondeur-${Math.min(profondeur, 3)}">
        <h3 class="branche-titre">${b.nom} <span>${f.length ? `${acquis}/${f.length} compris` : 'vide'}</span></h3>
        ${rameau(s, b.nom, profondeur + 1)}
      </div>`;
    })}`;
}

export function vueArbre(ui) {
  const { arbre, calcul } = magasin;
  if (!arbre || !Array.isArray(arbre.noeuds) || !arbre.noeuds.length) {
    return h`<div class="page page-arbre"><section class="message-systeme"><p><span class="balise">[SYSTÈME]</span> L’Arbre de la connaissance n’a pas encore été transmis. Le Système le déposera à la prochaine mise à jour.</p></section></div>`;
  }
  const s = structurer(arbre, calcul.aujourdhui);
  const total = s.noeuds.length;
  const compte = { verrou: 0, rouille: 0, niveaux: [0, 0, 0, 0, 0, 0] };
  for (const n of s.noeuds) {
    if (n.rouille) compte.rouille++;
    if (n.verrouille) compte.verrou++;
    else compte.niveaux[n.maitrise]++;
  }
  const legende = [
    h`<li><span>🔒</span><strong>${compte.verrou}</strong><em>verrouillés</em></li>`,
    ...NIVEAUX_ARBRE.map(niv => h`<li><span>${niv.icone}</span><strong>${compte.niveaux[niv.niveau]}</strong><em>${niv.niveau ? niv.etat : 'disponibles'}</em></li>`),
    compte.rouille ? h`<li><span>🍂</span><strong>${compte.rouille}</strong><em>à réviser</em></li>` : '',
  ];
  const points = s.noeuds.reduce((somme, n) => somme + n.maitrise, 0);

  const vue = ui.vueArbre === 'liste' ? 'liste' : 'arbre';
  const bascule = h`<div class="segment-vue" role="tablist" aria-label="Affichage">
    <button role="tab" data-action="arbre-vue" data-vue="arbre" aria-selected="${vue === 'arbre' ? 'true' : 'false'}">Arbre</button>
    <button role="tab" data-action="arbre-vue" data-vue="liste" aria-selected="${vue === 'liste' ? 'true' : 'false'}">Liste</button>
  </div>`;

  const domaines = s.domaines.map(d => {
    const f = d.feuilles;
    const ouvert = ui.domaines.has(d.nom);
    const somme = f.reduce((x, n) => x + n.maitrise, 0);
    const ratio = f.length ? somme / (f.length * 5) : 0;
    return h`<section class="domaine ${f.length ? '' : 'est-inexplore'} ${ouvert ? 'est-ouvert' : ''}">
      <button class="domaine-tete" data-action="domaine" data-nom="${d.nom}" aria-expanded="${ouvert ? 'true' : 'false'}" ${f.length ? '' : h`disabled`}>
        <span class="domaine-emoji" aria-hidden="true">${d.emoji || '🌿'}</span>
        <span class="domaine-corps">
          <span class="domaine-nom">${d.nom}</span>
          <span class="domaine-compte">${f.length ? `${pluriel(f.length, 'nœud')} · ${f.filter(n => n.maitrise >= 2).length} compris` : 'Terre inexplorée'}</span>
          <span class="jauge jauge-fine"><span class="jauge-plein" style="width:${(ratio * 100).toFixed(1)}%"></span></span>
        </span>
        <span class="domaine-fleche">${f.length ? icone('bas') : icone('verrou')}</span>
      </button>
      ${ouvert && f.length ? h`<div class="domaine-contenu">${rameau(s, d.nom, 1)}</div>` : ''}
    </section>`;
  });

  return h`<div class="page page-arbre">
    <section class="fenetre arbre-resume">
      <div class="etiquette">Arbre de la connaissance</div>
      <div class="arbre-chiffres"><strong>${total}</strong> nœuds · <strong>${points}</strong> / ${total * 5} points de maîtrise</div>
      <ul class="arbre-legende">${legende}</ul>
      <p class="arbre-note">Un niveau se prouve : résumé, quiz ou pratique. Dis au Système « Teste-moi sur… ».${arbre.genere ? ` Mis à jour le ${dateCourte(String(arbre.genere).slice(0, 10))}.` : ''}</p>
    </section>
    ${bascule}
    ${vue === 'arbre' ? vueConstellation(s, ui) : h`<div class="domaines">${domaines}</div>`}
    ${blocExplorations()}
  </div>`;
}

function vueConstellation(s, ui) {
  const avecNoeuds = s.domaines.filter(d => d.feuilles.length);
  const choisi = s.domaines.find(d => d.nom === ui.domaineArbre && d.feuilles.length) || avecNoeuds[0];
  if (!choisi) return h`<p class="vide">Aucun nœud pour l’instant.</p>`;
  const f = choisi.feuilles;
  return h`<section class="arbre-vue">
    <div class="jetons arbre-domaines">${s.domaines.map(
      d => h`<button type="button" class="jeton ${d === choisi ? 'est-actif' : ''}" data-action="arbre-domaine" data-nom="${d.nom}" aria-pressed="${d === choisi ? 'true' : 'false'}" ${d.feuilles.length ? '' : h`disabled`}>${d.emoji || '🌿'} ${d.nom}</button>`,
    )}</div>
    <div class="constellation" data-defile>
      ${constellation(s, choisi)}
    </div>
    <p class="arbre-note">${pluriel(f.length, 'nœud')} · ${f.filter(n => n.maitrise >= 2).length} compris. L’arbre pousse vers le haut : un nœud s’allume quand ses prérequis sont compris (🌱). Touche un nœud pour sa fiche.</p>
  </section>`;
}

function blocExplorations() {
  const liste = explorationsConsommees(magasin.jeu, magasin.journaux);
  if (!liste.length) return '';
  const attente = liste.filter(x => !x.integree).length;
  return h`<section class="bloc">
    <h2 class="bloc-titre">Explorations <span class="bloc-compte">${attente ? `${attente} à intégrer` : 'toutes intégrées'}</span></h2>
    <ul class="explorations">${liste.slice(0, 8).map(
      x => h`<li class="${x.integree ? 'est-integree' : ''}">
        <span class="journal-date">${dateCourte(x.date)}</span>
        <span class="exploration-corps"><strong>${x.sujet || 'Choix libre'}</strong>${x.noeud ? h`<span>${x.noeud}</span>` : ''}${x.resume ? h`<span>✍️ Résumé écrit</span>` : ''}</span>
        <span class="etat-puce ${x.integree ? 'etat-termine' : 'etat-propose'}">${x.integree ? 'Intégrée' : 'À intégrer'}</span>
      </li>`,
    )}</ul>
    <p class="bloc-note">Le Système transforme chaque exploration en nœud (🌰, ou 🌱 si ton résumé suffit) à l’entretien du dimanche, ou quand tu le lui demandes.</p>
  </section>`;
}

/** Fiche d'un nœud, affichée dans le calque. */
export function ficheNoeud(nom) {
  const { arbre, calcul } = magasin;
  const s = structurer(arbre, calcul.aujourdhui);
  const n = s.noeuds.find(x => x.nom === nom);
  if (!n) return null;
  const suivant = NIVEAUX_ARBRE[n.maitrise + 1];
  const chemin = [n.domaine, n.parent && n.parent !== n.domaine ? n.parent : null].filter(Boolean).join(' › ');
  return h`<div class="feuille fenetre" role="dialog" aria-modal="true" aria-labelledby="fiche-titre">
    <button class="bouton-rond feuille-fermer" data-action="calque-fermer" aria-label="Fermer">${icone('fermer')}</button>
    <div class="fiche-icone" aria-hidden="true">${iconeNoeud(n)}</div>
    <div class="etiquette">${chemin}</div>
    <h2 id="fiche-titre" class="fiche-titre">${n.nom}</h2>
    <p class="fiche-niveau">Niveau ${n.maitrise} sur 5 · ${libelleNoeud(n)}</p>
    <ol class="fiche-paliers">${NIVEAUX_ARBRE.slice(1).map(
      niv => h`<li class="${niv.niveau <= n.maitrise ? 'est-acquis' : niv.niveau === n.maitrise + 1 ? 'est-suivant' : ''}">
        <span class="fiche-palier-icone">${niv.icone}</span>
        <span class="fiche-palier-corps"><strong>${niv.nom} — ${niv.etat}</strong><span>${niv.exigence}</span></span>
        <span class="xp">+${niv.xp} INT</span>
      </li>`,
    )}</ol>
    ${n.prerequis && n.prerequis.length ? h`<p class="fiche-note"><strong>Prérequis :</strong> ${n.prerequis.map(p => {
      const q = s.noeuds.find(x => x.nom === p);
      return `${q ? iconeNoeud(q) : '·'} ${p}`;
    }).join(' · ')}</p>` : ''}
    ${(() => {
      const ouvre = s.noeuds.filter(x => (x.prerequis || []).includes(n.nom));
      return ouvre.length ? h`<p class="fiche-note"><strong>Débloque :</strong> ${ouvre.map(x => x.nom).join(' · ')}</p>` : '';
    })()}
    ${n.verrouille ? h`<p class="fiche-alerte">${icone('verrou')} Verrouillé : il faut d’abord comprendre ${n.manque.map(m => `« ${m} »`).join(', ')}.</p>` : ''}
    ${n.rouille ? h`<p class="fiche-alerte">🍂 Nœud rouillé depuis le ${dateCourte(n.revision)} : un quiz de révision t’attend.</p>` : ''}
    ${!n.rouille && n.revision ? h`<p class="fiche-note">Prochaine révision : ${dateCourte(n.revision)}.</p>` : ''}
    ${suivant && !n.verrouille ? h`<p class="fiche-note">Pour passer ${suivant.icone} ${suivant.nom}, dis au Système : « Teste-moi sur ${n.nom} ».</p>` : ''}
    ${!suivant ? h`<p class="fiche-note">Sommet atteint : ce savoir est transmis.</p>` : ''}
  </div>`;
}
