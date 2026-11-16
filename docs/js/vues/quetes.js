/* Écran « Quêtes » : le jour choisi, la zone de pénalité, le coffre, la semaine. */
import * as M from '../moteur.js';
import { magasin, hebdoModifiable } from '../magasin.js';
import { h, icone, dessinCoffre, dateLongue, dateCourte, LETTRES_JOUR, NOMS_JOUR, pluriel, nombre } from '../ui.js';

/** Contexte partagé avec les actions : quel jour et quelle semaine sont affichés. */
export function contexteQuetes(ui) {
  const { jeu, calcul } = magasin;
  const auj = calcul.aujourdhui;
  const date = ui.date || (calcul.commence ? auj : jeu.debut);
  const lundi = M.lundiDe(date);
  const jour = calcul.jours.get(date) || null;
  const semaine = lundi === calcul.semaine.lundi ? calcul.semaine : M.resumeSemaine(jeu, calcul.jours, calcul.faits, magasin.etat, lundi);
  return {
    auj,
    date,
    lundi,
    jour,
    semaine,
    futur: date > auj,
    modifiable: M.estModifiable(jeu, date, auj),
    hebdoModifiable: calcul.commence && hebdoModifiable(lundi),
    premierLundi: M.lundiDe(jeu.debut),
    dernierLundi: M.lundiDe(auj > jeu.debut ? auj : jeu.debut),
  };
}

export function puceAxe(jeu, id) {
  const axe = M.axeDe(jeu, id);
  return h`<span class="puce-axe axe-${axe.id}"><i class="pastille"></i>${axe.emoji} ${axe.nom}</span>`;
}
export const badgeRang = rang => (rang ? h`<span class="rang rang-${rang.toLowerCase()}" aria-label="Rang ${rang}">${rang}</span>` : '');

export function carteQuete(q, { action, inactive = false, extra = '', ton = '' }) {
  const jeu = magasin.jeu;
  const classes = ['quete', `axe-${q.axe || 'aucun'}`, q.faite ? 'est-faite' : '', ton, inactive ? 'est-inactive' : ''].join(' ');
  return h`<li>
    <button class="${classes}" data-action="${action}" data-id="${q.id}" ${extra} aria-pressed="${q.faite ? 'true' : 'false'}" ${inactive ? h`disabled` : ''}>
      <span class="quete-coche">${icone('coche')}</span>
      <span class="quete-corps">
        <span class="quete-titre">${q.titre}</span>
        ${q.detail ? h`<span class="quete-detail">${q.detail}</span>` : ''}
        <span class="quete-meta">
          ${q.axe ? puceAxe(jeu, q.axe) : h`<span class="puce-axe">Axe à définir</span>`}
          ${badgeRang(q.rang)}
          <span class="xp">+${q.xp} XP</span>
        </span>
      </span>
    </button>
  </li>`;
}

/** La quête « arbre » ouvre le choix d'exploration quand le Système a préparé un réservoir pour la semaine. */
function carteQuoti(q, c, inactive) {
  if (q.faite && q.entree && q.entree.auto === 'forme') return carteQuete({ ...q, detail: q.entree.s }, { action: 'quete', inactive });
  if (q.id !== 'arbre') return carteQuete(q, { action: 'quete', inactive });
  const e = q.entree;
  if (q.faite && e && e.s) return carteQuete({ ...q, detail: `📖 ${e.s}` }, { action: 'quete', inactive });
  const options = !q.faite && !inactive && !q.apercu ? M.explorationsDuJour(magasin.jeu, magasin.journaux, c.date) : null;
  if (options && options.options.length) {
    return carteQuete({ ...q, detail: `${q.detail || ''} Le Système te propose 3 explorations.`.trim() }, { action: 'explorer', inactive, ton: 'est-exploration' });
  }
  return carteQuete(q, { action: 'quete', inactive });
}

function messageSysteme(c) {
  const { jeu, calcul } = magasin;
  const { jour, date, auj, futur, modifiable } = c;
  if (!calcul.commence) {
    const n = calcul.joursAvantDebut;
    return h`Éveil programmé : ${dateLongue(jeu.debut)}. ${n === 1 ? 'C’est demain.' : `Encore ${n} jours.`} Voici ce qui t’attend.`;
  }
  if (futur) return h`Aperçu du ${dateLongue(date)}. Rien à cocher pour l’instant.`;
  if (date < auj) return modifiable ? h`Registre du ${dateLongue(date)}. Encore modifiable.` : h`Registre du ${dateLongue(date)}. Clos.`;
  if (jour.survie) return h`Mode survie. Une seule quête aujourd’hui. Ne décroche pas.`;
  if (jour.coffre) return h`Toutes les quêtes du jour sont accomplies. Coffre ouvert.`;
  if (jour.rattrapages.some(r => !r.faite) && jour.faites === 0) return h`Quête non accomplie hier. Un rattrapage est disponible.`;
  if (jour.faites === 0) return h`Quêtes du jour disponibles.`;
  const reste = jour.total - jour.faites;
  return h`${reste === 1 ? 'Une quête restante' : `${reste} quêtes restantes`} avant le coffre.`;
}

function semainier(c) {
  const { calcul, jeu } = magasin;
  const dimanche = M.ajouterJours(c.lundi, 6);
  const cellules = [];
  for (let i = 0; i < 7; i++) {
    const d = M.ajouterJours(c.lundi, i);
    const j = calcul.jours.get(d);
    const avant = d < jeu.debut;
    const ratio = j && j.total ? j.faites / j.total : 0;
    const classes = ['sem-jour', d === c.auj ? 'est-aujourdhui' : '', d === c.date ? 'est-choisi' : '', d > c.auj ? 'est-futur' : '', j && j.coffre ? 'a-coffre' : '', j && j.survie ? 'en-survie' : ''].join(' ');
    const etat = avant ? 'avant le début' : !j ? 'à venir' : `${j.faites} sur ${j.total}${j.coffre ? ', coffre ouvert' : ''}`;
    cellules.push(h`<button class="${classes}" data-action="jour" data-date="${d}" ${avant ? h`disabled` : ''} aria-label="${NOMS_JOUR[i]} ${dateCourte(d)} : ${etat}" aria-current="${d === c.date ? 'date' : 'false'}">
      <span class="sem-lettre">${LETTRES_JOUR[i]}</span>
      <span class="sem-anneau" style="--p:${ratio.toFixed(3)}"><span class="sem-num">${Number(d.slice(8))}</span></span>
    </button>`);
  }
  return h`<section class="semainier" aria-label="Semaine">
    <div class="sem-tete">
      <button class="bouton-rond" data-action="semaine" data-sens="-1" aria-label="Semaine précédente" ${c.lundi <= c.premierLundi ? h`disabled` : ''}>${icone('gauche')}</button>
      <div class="sem-titre">Semaine ${M.numeroSemaine(c.lundi)} <span>${dateCourte(c.lundi)} → ${dateCourte(dimanche)}</span></div>
      <button class="bouton-rond" data-action="semaine" data-sens="1" aria-label="Semaine suivante" ${c.lundi >= c.dernierLundi ? h`disabled` : ''}>${icone('droite')}</button>
    </div>
    <div class="sem-jours">${cellules}</div>
    ${c.date !== c.auj && magasin.calcul.commence ? h`<button class="lien-retour" data-action="aujourdhui">Revenir à aujourd’hui</button>` : ''}
  </section>`;
}

function blocCoffre(c) {
  const { jeu } = magasin;
  const j = c.jour;
  const axe = M.axeDe(jeu, jeu.regles.coffre.axe);
  if (j && !j.coffrePossible) return '';
  const total = j ? j.total : M.apercuJour(jeu, c.date).length;
  const faites = j ? j.faites : 0;
  const pips = [];
  for (let i = 0; i < total; i++) pips.push(h`<i class="${i < faites ? 'plein' : ''}"></i>`);
  const ouvert = !!(j && j.coffre);
  return h`<section class="coffre ${ouvert ? 'est-ouvert' : ''}" id="coffre" aria-label="Coffre du jour">
    <div class="coffre-dessin">${dessinCoffre()}</div>
    <div class="coffre-texte">
      <div class="coffre-titre">${ouvert ? 'Coffre ouvert' : 'Coffre du jour'}</div>
      <div class="coffre-detail">${ouvert ? h`+${jeu.regles.coffre.xp} XP ${axe.emoji} ${axe.nom} — la régularité paie.` : h`Toutes les quotidiennes du jour → +${jeu.regles.coffre.xp} XP ${axe.emoji} ${axe.nom}`}</div>
      <div class="coffre-pips" aria-label="${faites} sur ${total}">${pips}</div>
    </div>
  </section>`;
}

/** Durée telle qu'écrite par Raccourcis : « 31 min » et « 0:31:10 » restent tels quels ; un nombre seul est lu en secondes. */
function duree(v) {
  const texte = String(v ?? '').trim();
  if (!/^\d+([.,]\d+)?$/.test(texte)) return texte;
  const secondes = M.lireNombre(texte);
  return secondes >= 3600 ? `${Math.floor(secondes / 3600)} h ${String(Math.round((secondes % 3600) / 60)).padStart(2, '0')}` : `${Math.max(1, Math.round(secondes / 60))} min`;
}

function blocForme(c) {
  const f = (magasin.forme || {})[c.date];
  if (!f) return '';
  const n = v => nombre(M.lireNombre(v));
  const seances = Array.isArray(f.seances) ? f.seances.filter(s => s && (s.type || s.duree)) : [];
  const seuil = M.lireNombre((magasin.jeu.regles.forme || {}).minutes) || 20;
  const minutes = M.lireNombre(f.exercice_min);
  return h`<section class="bloc bloc-forme">
    <h2 class="bloc-titre">⌚ App Forme <span class="bloc-compte">${minutes >= seuil ? 'objectif atteint' : `objectif : ${seuil} min`}</span></h2>
    <ul class="tuiles tuiles-3">
      <li class="tuile"><span class="tuile-libelle">Exercice</span><span class="tuile-valeur">${n(f.exercice_min)} min</span></li>
      <li class="tuile"><span class="tuile-libelle">Calories actives</span><span class="tuile-valeur">${n(f.calories)}</span></li>
      <li class="tuile"><span class="tuile-libelle">Pas</span><span class="tuile-valeur">${n(f.pas)}</span></li>
    </ul>
    ${seances.length
      ? h`<ul class="seances">${seances.map(s => h`<li><span>${String(s.type || 'Séance')}</span><strong>${duree(s.duree)}</strong></li>`)}</ul>`
      : h`<p class="bloc-note">Aucune séance enregistrée par la montre ce jour-là.</p>`}
  </section>`;
}

function blocHebdo(c) {
  const { calcul } = magasin;
  const s = c.semaine;
  const enCours = s.lundi === M.lundiDe(c.auj) && calcul.commence;
  const reste = 7 - M.jourSemaine(c.auj);
  const delai = !calcul.commence || s.lundi > c.auj ? 'à venir' : enCours ? (reste === 0 ? 'dernier jour' : `J-${reste}`) : 'terminée';
  const liste = s.hebdo.length
    ? h`<ul class="quetes">${s.hebdo.map(q => carteQuete(q, { action: 'hebdo', inactive: !c.hebdoModifiable, ton: q.boss ? 'est-boss' : '' }))}</ul>`
    : h`<p class="vide">Le Système fixera les quêtes de cette semaine à l’entretien du dimanche.</p>`;
  return h`<section class="bloc">
    <h2 class="bloc-titre">Quêtes de la semaine <span class="bloc-compte">${s.hebdo.length ? `${s.hebdoFaites}/${s.hebdo.length} · ` : ''}${delai}</span></h2>
    ${liste}
  </section>`;
}

function blocDonjons() {
  const { jeu, etat } = magasin;
  const ouverts = jeu.donjons.filter(d => d.statut === 'ouvert');
  const proposes = jeu.donjons.filter(d => d.statut === 'propose');
  if (!ouverts.length && !proposes.length) return '';
  const lignes = ouverts.map(d => {
    const faits = (etat.donjons || {})[d.id] || {};
    const prochain = d.etages.find(e => !M.estFaite(faits[e.id]));
    const n = d.etages.filter(e => M.estFaite(faits[e.id])).length;
    return h`<li><button class="raccourci" data-action="onglet" data-onglet="donjons">
      <span class="raccourci-emoji">${d.emoji || '🏰'}</span>
      <span class="raccourci-corps"><strong>${d.nom}</strong><span>${prochain ? `Prochain étage : ${prochain.titre}` : 'Donjon terminé'}</span></span>
      <span class="raccourci-compte">${n}/${d.etages.length}</span>
    </button></li>`;
  });
  const scelles = proposes.map(
    d => h`<li><button class="raccourci est-scelle" data-action="onglet" data-onglet="donjons">
      <span class="raccourci-emoji">${d.emoji || '🏰'}</span>
      <span class="raccourci-corps"><strong>${d.nom}</strong><span>${d.ouverture ? `Scellé — ouverture prévue le ${dateCourte(d.ouverture)}` : 'Scellé'}</span></span>
      <span class="raccourci-compte">${icone('verrou')}</span>
    </button></li>`,
  );
  return h`<section class="bloc">
    <h2 class="bloc-titre">Donjons</h2>
    <ul class="raccourcis">${lignes}${scelles}</ul>
  </section>`;
}

function blocRevisions() {
  const { arbre, calcul } = magasin;
  const dues = ((arbre && arbre.noeuds) || []).filter(n => n.revision && n.revision <= calcul.aujourdhui);
  if (!dues.length) return '';
  return h`<section class="bloc">
    <h2 class="bloc-titre">Révisions <span class="bloc-compte">${dues.length}</span></h2>
    <ul class="raccourcis">${dues.slice(0, 4).map(
      n => h`<li><button class="raccourci" data-action="onglet" data-onglet="arbre">
        <span class="raccourci-emoji">🍂</span>
        <span class="raccourci-corps"><strong>${n.nom}</strong><span>Nœud rouillé : demande un quiz au Système.</span></span>
      </button></li>`,
    )}</ul>
  </section>`;
}

export function vueQuetes(ui) {
  const { jeu, calcul } = magasin;
  const c = contexteQuetes(ui);
  const j = c.jour;
  const quetes = j ? j.quetes : M.apercuJour(jeu, c.date);
  const inactive = !c.modifiable;
  const annonce = jeu.annonce && jeu.annonce.texte && (!jeu.annonce.jusqua || jeu.annonce.jusqua >= c.auj) ? jeu.annonce.texte : '';
  const titreJour = c.date === c.auj && calcul.commence ? 'Quêtes du jour' : `Quêtes du ${dateLongue(c.date)}`;

  const survie = j && j.survie
    ? h`<section class="alerte-survie" role="status">
        <div class="alerte-picto">${icone('bouclier')}</div>
        <div><strong>Mode survie</strong><span>Une seule quête par jour. Jour ${Math.min(j.survieJour, jeu.regles.survie.joursReussis)} sur ${jeu.regles.survie.joursReussis} pour en sortir.</span></div>
      </section>`
    : '';

  const penalite = j && j.rattrapages.length
    ? h`<section class="bloc bloc-penalite">
        <h2 class="bloc-titre">${icone('alerte')} Zone de pénalité <span class="bloc-compte">${j.rattrapages.filter(r => r.faite).length}/${j.rattrapages.length}</span></h2>
        <p class="bloc-note">Rattrapages d’hier. Aucune XP perdue : ils rapportent en plus.</p>
        <ul class="quetes">${j.rattrapages.map(q => carteQuete(q, { action: 'quete', inactive, ton: 'est-rattrapage' }))}</ul>
      </section>`
    : '';

  const bonus = j && j.bonus.length
    ? h`<section class="bloc bloc-bonus">
        <h2 class="bloc-titre">Quêtes suspendues <span class="bloc-compte">en bonus</span></h2>
        <p class="bloc-note">Rien d’obligatoire. Si tu en fais une, elle compte quand même.</p>
        <ul class="quetes">${j.bonus.map(q => carteQuete(q, { action: 'quete', inactive, ton: 'est-bonus' }))}</ul>
      </section>`
    : '';

  const archives = j && j.archives.length
    ? h`<ul class="quetes">${j.archives.map(q => carteQuete(q, { action: 'aucune', inactive: true }))}</ul>`
    : '';

  return h`<div class="page page-quetes">
    <section class="message-systeme" aria-live="polite">
      <p><span class="balise">[SYSTÈME]</span> ${messageSysteme(c)}</p>
      ${annonce ? h`<p class="message-annonce">${annonce}</p>` : ''}
    </section>
    ${semainier(c)}
    <div class="colonnes">
      <div class="colonne">
        ${survie}
        <section class="bloc">
          <h2 class="bloc-titre">${titreJour} <span class="bloc-compte">${j ? `${j.faites}/${j.total}` : c.futur || !calcul.commence ? 'aperçu' : ''}</span></h2>
          ${quetes.length ? h`<ul class="quetes">${quetes.map(q => carteQuoti(q, c, inactive))}</ul>` : h`<p class="vide">Aucune quête ce jour-là.</p>`}
          ${archives}
          ${j && !c.modifiable ? h`<p class="bloc-note">${icone('verrou')} Jour clos : il reste ${pluriel(jeu.regles.joursModifiables, 'jour')} pour corriger une journée.</p>` : ''}
        </section>
        ${penalite}
        ${bonus}
        ${blocCoffre(c)}
        ${blocForme(c)}
      </div>
      <div class="colonne">
        ${blocHebdo(c)}
        ${blocDonjons()}
        ${blocRevisions()}
      </div>
    </div>
  </div>`;
}
