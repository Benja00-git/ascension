/* Écran « Donjons » : chaque projet est une tour ; on la gravit étage par étage, le boss au sommet. */
import * as M from '../moteur.js';
import { magasin } from '../magasin.js';
import { h, icone, dateCourte, dateLongue, nombre } from '../ui.js';
import { puceAxe, badgeRang } from './quetes.js';

const ETATS = { propose: 'Scellé', ouvert: 'Ouvert', termine: 'Conquis' };

function tour(donjon) {
  const { jeu, etat } = magasin;
  const faits = (etat.donjons || {})[donjon.id] || {};
  const etages = donjon.etages.map((e, i) => ({ ...e, numero: i + 1, entree: faits[e.id], faite: M.estFaite(faits[e.id]) }));
  const autres = etages.filter(e => !e.boss);
  const tousFranchis = autres.every(e => e.faite);
  const nFaits = etages.filter(e => e.faite).length;
  const xpTotal = etages.reduce((s, e) => s + e.xp, 0);
  const xpGagnee = etages.reduce((s, e) => s + (e.faite ? e.xp : 0), 0);
  const ouvert = donjon.statut === 'ouvert';
  const conquis = donjon.statut === 'termine' || (etages.length > 0 && nFaits === etages.length);

  // Affichage du sommet vers la base : le boss en haut.
  const lignes = [...etages].reverse().map(e => {
    const scelleBoss = e.boss && !tousFranchis && !e.faite;
    const sansAxe = !e.axe;
    const inactif = !ouvert || scelleBoss || sansAxe;
    const classes = ['etage', e.boss ? 'est-boss' : '', e.faite ? 'est-fait' : '', inactif && !e.faite ? 'est-verrouille' : '', `axe-${e.axe || 'aucun'}`].join(' ');
    const note = e.faite
      ? `Franchi le ${dateCourte((e.entree && e.entree.le) || magasin.calcul.aujourdhui)}`
      : scelleBoss
        ? 'Le boss attend que tous les étages soient franchis.'
        : sansAxe
          ? 'Le Système attribuera un axe à l’ouverture.'
          : '';
    return h`<li>
      <button class="${classes}" data-action="etage" data-donjon="${donjon.id}" data-id="${e.id}" aria-pressed="${e.faite ? 'true' : 'false'}" ${inactif && !e.faite ? h`disabled` : ''}>
        <span class="etage-repere">${e.faite ? icone('coche') : e.boss ? icone('couronne') : inactif ? icone('verrou') : h`<b>${e.numero}</b>`}</span>
        <span class="etage-corps">
          <span class="etage-sur">${e.boss ? 'Boss' : `Étage ${e.numero}`}</span>
          <span class="etage-titre">${e.titre}</span>
          ${e.detail ? h`<span class="etage-detail">${e.detail}</span>` : ''}
          <span class="quete-meta">
            ${e.axe ? puceAxe(jeu, e.axe) : ''}
            ${badgeRang(e.rang)}
            <span class="xp">+${nombre(e.xp)} XP</span>
          </span>
          ${note ? h`<span class="etage-note">${note}</span>` : ''}
        </span>
      </button>
    </li>`;
  });

  const sceau =
    donjon.statut === 'propose'
      ? h`<p class="donjon-sceau">${icone('verrou')} ${donjon.ouverture ? `Scellé. Ouverture prévue ${dateLongue(donjon.ouverture)}, après validation des étages.` : 'Scellé. Le Système l’ouvrira après validation des étages.'}</p>`
      : '';

  return h`<section class="donjon statut-${conquis ? 'termine' : donjon.statut}">
    <header class="donjon-tete">
      <span class="donjon-emoji" aria-hidden="true">${donjon.emoji || '🏰'}</span>
      <div class="donjon-noms">
        <h2>${donjon.nom}</h2>
        ${donjon.sousTitre ? h`<p>${donjon.sousTitre}</p>` : ''}
      </div>
      <span class="etat-puce etat-${conquis ? 'termine' : donjon.statut}">${conquis ? ETATS.termine : ETATS[donjon.statut] || donjon.statut}</span>
    </header>
    ${sceau}
    ${donjon.note ? h`<p class="donjon-note">${donjon.note}</p>` : ''}
    <div class="donjon-avancee">
      <div class="jauge" role="progressbar" aria-valuemin="0" aria-valuemax="${etages.length}" aria-valuenow="${nFaits}" aria-label="Étages franchis"><div class="jauge-plein" style="width:${etages.length ? ((nFaits / etages.length) * 100).toFixed(1) : 0}%"></div></div>
      <span>${nFaits}/${etages.length} étages · ${nombre(xpGagnee)} / ${nombre(xpTotal)} XP</span>
    </div>
    <ol class="etages">${lignes}</ol>
    ${donjon.suite ? h`<p class="donjon-note">Ensuite : ${donjon.suite}</p>` : ''}
  </section>`;
}

export function vueDonjons() {
  const { jeu } = magasin;
  const ordre = { ouvert: 0, propose: 1, termine: 2 };
  const donjons = [...jeu.donjons].sort((a, b) => (ordre[a.statut] ?? 3) - (ordre[b.statut] ?? 3));
  const ouverts = donjons.filter(d => d.statut === 'ouvert').length;
  return h`<div class="page page-donjons">
    <section class="message-systeme">
      <p><span class="balise">[SYSTÈME]</span> ${
        !donjons.length
          ? 'Aucun donjon pour l’instant. Ils s’ouvrent à la revue mensuelle.'
          : ouverts
            ? `${ouverts === 1 ? 'Un donjon ouvert' : `${ouverts} donjons ouverts`}. Deux au maximum à la fois.`
            : 'Aucun donjon ouvert. Les étages se valident à l’entretien du dimanche.'
      }</p>
    </section>
    <div class="donjons">${donjons.map(tour)}</div>
  </div>`;
}
