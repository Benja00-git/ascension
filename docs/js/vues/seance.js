/* Feuille « Séance » : le type d'activité et la durée, en deux taps, quand on coche la quête de mouvement. */
import * as M from '../moteur.js';
import { magasin } from '../magasin.js';
import { h, icone, dateLongue } from '../ui.js';

/** La dernière séance notée avant cette date : elle sert de choix par défaut. */
function derniere(date) {
  const liste = M.seancesEntre(magasin.jeu, magasin.journaux, '0000-01-01', M.ajouterJours(date, -1));
  return liste[liste.length - 1] || null;
}

export function ficheSeance(date, quete) {
  const regle = magasin.jeu.regles.seance;
  const activites = Array.isArray(regle.activites) ? regle.activites : [];
  const durees = (Array.isArray(regle.durees) ? regle.durees : []).map(M.lireNombre).filter(n => n > 0);
  const avant = derniere(date);
  const actDefaut = avant ? avant.act : '';
  const minDefaut = avant && durees.includes(avant.min) ? avant.min : 0;
  const coche = (oui) => (oui ? h`checked` : '');
  return h`<form class="feuille fenetre seance" data-form="seance" data-date="${date}" data-id="${quete.id}" role="dialog" aria-modal="true" aria-labelledby="seance-titre" novalidate>
    <button type="button" class="bouton-rond feuille-fermer" data-action="calque-fermer" aria-label="Fermer">${icone('fermer')}</button>
    <p class="balise">[SYSTÈME]</p>
    <h2 id="seance-titre" class="fiche-titre">${quete.titre}</h2>
    <p class="fiche-niveau">Séance du ${dateLongue(date)} : quoi, et combien de temps.</p>
    <fieldset class="choix">
      <legend class="choix-legende">Activité</legend>
      <div class="choix-grille">
        ${activites.map(a => h`<label class="puce-choix"><input type="radio" name="act" value="${a.id}" ${coche(a.id === actDefaut)}><span>${a.emoji || ''} ${a.nom}</span></label>`)}
        <label class="puce-choix puce-autre"><input type="radio" name="act" value="autre" ${coche(actDefaut === 'autre')}><span>✳️ Autre</span></label>
      </div>
      <input class="choix-saisie" type="text" name="libre" maxlength="60" placeholder="Laquelle ? (escalade, danse…)" autocomplete="off">
    </fieldset>
    <fieldset class="choix">
      <legend class="choix-legende">Durée</legend>
      <div class="choix-grille choix-durees">
        ${durees.map(d => h`<label class="puce-choix"><input type="radio" name="min" value="${d}" ${coche(d === minDefaut)}><span>${M.dureeMinutes(d)}</span></label>`)}
      </div>
      <label class="choix-autre-duree"><span>ou</span><input type="number" name="minLibre" min="1" max="600" step="1" inputmode="numeric" placeholder="—"><span>min</span></label>
    </fieldset>
    <p class="erreur" role="alert" hidden></p>
    <div class="dialogue-actions">
      <button type="button" class="bouton bouton-discret" data-action="calque-fermer">Annuler</button>
      <button type="submit" class="bouton bouton-plein">Séance accomplie</button>
    </div>
  </form>`;
}

/** Lit la feuille : { extra } prêt pour le journal, ou { erreur }. */
export function lireSeance(form) {
  const d = new FormData(form);
  const act = String(d.get('act') || '');
  const libre = String(d.get('libre') || '').trim();
  const min = Math.round(M.lireNombre(d.get('minLibre')) || M.lireNombre(d.get('min')));
  if (!act) return { erreur: 'Choisis une activité.' };
  if (act === 'autre' && !libre) return { erreur: 'Dis en un mot quelle activité.' };
  if (!(min >= 1 && min <= 600)) return { erreur: 'Choisis une durée.' };
  const extra = { act, min, s: M.libelleSeance(magasin.jeu, act, min, libre) };
  if (act === 'autre') extra.lib = libre;
  return { extra };
}
