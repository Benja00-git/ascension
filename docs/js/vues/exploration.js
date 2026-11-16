/* Feuille « Quinze minutes dans l'arbre » : 3 explorations proposées par le Système + un choix libre. */
import * as M from '../moteur.js';
import { magasin } from '../magasin.js';
import { h, icone, dateLongue } from '../ui.js';

const TYPES = { approfondir: 'Approfondir', explorer: 'Explorer', reviser: 'Réviser' };
const FORMATS = { video: '🎬', article: '📄', page: '📄', guide: '📘', pdf: '📄', podcast: '🎧', livre: '📚', cours: '🎓', code: '💻' };

/** N'accepte que les liens web. */
export const urlSure = u => (/^https?:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : '');

export function optionsExploration(date) {
  const r = M.explorationsDuJour(magasin.jeu, magasin.journaux, date);
  return r ? r.options : [];
}

function carteOption(o) {
  const r = o.ressource || {};
  const url = urlSure(r.url);
  const type = TYPES[o.type] ? o.type : 'approfondir';
  const details = [r.auteur, r.duree, r.langue && r.langue !== 'fr' ? String(r.langue).toUpperCase() : ''].filter(Boolean).join(' · ');
  return h`<div class="option-bloc">
    <label class="option type-${type}">
      <input type="radio" name="choix" value="${o.id}">
      <span class="option-corps">
        <span class="option-tete"><span class="option-type">${TYPES[type]}</span><span class="option-noeud">${o.nouveau ? 'Nouveau nœud · ' : ''}${o.noeud || o.domaine || ''}</span></span>
        <span class="option-titre">${o.titre}</span>
        ${r.titre ? h`<span class="option-ressource">${FORMATS[r.format] || '🔗'} ${r.titre}${details ? h` <em>${details}</em>` : ''}</span>` : ''}
        ${o.pourquoi ? h`<span class="option-pourquoi">${o.pourquoi}</span>` : ''}
      </span>
    </label>
    ${url ? h`<a class="option-lien" href="${url}" target="_blank" rel="noopener noreferrer">Ouvrir la ressource ↗</a>` : ''}
  </div>`;
}

export function ficheExploration(date) {
  const options = optionsExploration(date);
  return h`<form class="feuille fenetre exploration" data-form="exploration" data-date="${date}" role="dialog" aria-modal="true" aria-labelledby="expl-titre" novalidate>
    <button type="button" class="bouton-rond feuille-fermer" data-action="calque-fermer" aria-label="Fermer">${icone('fermer')}</button>
    <p class="balise">[SYSTÈME]</p>
    <h2 id="expl-titre" class="fiche-titre">Quinze minutes dans l’arbre</h2>
    <p class="fiche-niveau">Exploration du ${dateLongue(date)}. Choisis, consomme, puis valide : le Système l’ajoutera à ton arbre.</p>
    <fieldset class="options">
      <legend class="invisible">Explorations proposées</legend>
      ${options.map(carteOption)}
      <div class="option-bloc">
        <label class="option type-libre">
          <input type="radio" name="choix" value="libre">
          <span class="option-corps">
            <span class="option-tete"><span class="option-type">Choix libre</span></span>
            <span class="option-titre">Autre chose qui t’attire</span>
            <input class="option-saisie" type="text" name="sujet" maxlength="200" placeholder="Sur quoi ? Titre, lien ou sujet" autocomplete="off">
          </span>
        </label>
      </div>
    </fieldset>
    <label class="champ">
      <span>Ce que tu en retiens <em>(facultatif : avec tes mots, une définition et trois points clés valent preuve du niveau 🌱 Pousse)</em></span>
      <textarea name="resume" rows="3" maxlength="2000"></textarea>
    </label>
    <p class="erreur" role="alert" hidden></p>
    <div class="dialogue-actions">
      <button type="button" class="bouton bouton-discret" data-action="calque-fermer">Plus tard</button>
      <button type="submit" class="bouton bouton-plein">Quête accomplie</button>
    </div>
  </form>`;
}
