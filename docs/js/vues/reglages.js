/* Écrans « Réglages » et « Accueil » (premier lancement) : connexion au dépôt, préférences, règles. */
import { ORDRE_RANGS, NIVEAUX_ARBRE } from '../moteur.js';
import { magasin, enAttente } from '../magasin.js';
import { API_GITHUB } from '../depot.js';
import { h, brut, icone, ilYA, pluriel } from '../ui.js';

export const VERSION = '1.5.0';

export const SIGLE = brut(
  '<svg class="sigle" viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<path class="sigle-hex" d="M32 4 56 18v28L32 60 8 46V18z"/>' +
    '<path class="sigle-trait" d="m19 39 13-13 13 13"/><path class="sigle-trait" d="m19 29 13-13 13 13"/><path class="sigle-trait sigle-bas" d="m24 47 8-8 8 8"/>' +
    '</svg>',
);

const AIDE_JETON = h`<details class="repli">
  <summary>Comment créer le jeton d’accès ?</summary>
  <ol class="etapes">
    <li>Sur github.com : photo de profil → <strong>Settings</strong> → <strong>Developer settings</strong> → <strong>Personal access tokens</strong> → <strong>Fine-grained tokens</strong> → <strong>Generate new token</strong>.</li>
    <li>Nom : par exemple « Ascension – iPhone ». Expiration : un an, ou aucune.</li>
    <li><strong>Repository access</strong> → « Only select repositories » → le dépôt qui contient tes données.</li>
    <li><strong>Permissions</strong> → Repository permissions → <strong>Contents : Read and write</strong>. Rien d’autre.</li>
    <li><strong>Generate token</strong>, copie-le et colle-le ici.</li>
  </ol>
  <p class="note">Un jeton par appareil : tu peux en révoquer un sans toucher à l’autre. Il reste sur cet appareil et n’est envoyé qu’à GitHub.</p>
</details>`;

export function formulaireConnexion(ui, { annulable = false } = {}) {
  const c = ui.connexion;
  const v = c.champs;
  return h`<form class="formulaire" data-form="connexion" novalidate>
    <label class="champ">
      <span>Dépôt GitHub</span>
      <input name="depot" type="text" inputmode="url" placeholder="propriétaire/nom-du-dépôt" value="${v.depot}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" required>
    </label>
    <label class="champ">
      <span>Jeton d’accès</span>
      <input name="jeton" type="password" placeholder="github_pat_…" value="${v.jeton}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" required>
    </label>
    <details class="repli" ${c.avance ? h`open` : ''} data-repli="avance">
      <summary>Avancé</summary>
      <label class="champ">
        <span>Dossier des données <em>(vide : détection automatique)</em></span>
        <input name="dossier" type="text" placeholder="chemin/vers/les/donnees" value="${v.dossier}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
      </label>
      <label class="champ">
        <span>Branche <em>(vide : branche par défaut)</em></span>
        <input name="branche" type="text" placeholder="main" value="${v.branche}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
      </label>
      <label class="champ">
        <span>Adresse de l’API</span>
        <input name="api" type="url" placeholder="${API_GITHUB}" value="${v.api}" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
      </label>
    </details>
    ${c.erreur ? h`<p class="erreur" role="alert">${icone('alerte')} <span>${c.erreur}</span></p>` : ''}
    <div class="formulaire-actions">
      ${annulable ? h`<button type="button" class="bouton bouton-discret" data-action="connexion-annuler">Annuler</button>` : ''}
      <button type="submit" class="bouton bouton-plein" ${c.occupe ? h`disabled` : ''}>${c.occupe ? 'Vérification…' : 'Relier cet appareil'}</button>
    </div>
  </form>`;
}

export function vueAccueil(ui) {
  return h`<div class="accueil">
    <section class="fenetre accueil-fenetre">
      <div class="accueil-sigle">${SIGLE}</div>
      <h1 class="accueil-titre">Ascension</h1>
      <p class="accueil-message"><span class="balise">[SYSTÈME]</span> Joueur détecté. Relie cet appareil à ton dépôt pour charger tes quêtes.</p>
      ${formulaireConnexion(ui)}
      ${AIDE_JETON}
      <div class="accueil-demo">
        <button class="bouton bouton-discret" data-action="demo">Essayer d’abord en mode démo</button>
      </div>
    </section>
  </div>`;
}

export function vueAttente() {
  const s = magasin.sync;
  const bloque = s.statut === 'erreur' || s.statut === 'horsligne';
  return h`<div class="accueil">
    <section class="fenetre accueil-fenetre">
      <div class="accueil-sigle ${bloque ? '' : 'pulse'}">${SIGLE}</div>
      <h1 class="accueil-titre">Ascension</h1>
      <p class="accueil-message"><span class="balise">[SYSTÈME]</span> ${bloque ? s.message || 'Synchronisation impossible.' : 'Chargement des données du joueur…'}</p>
      ${bloque
        ? h`<div class="formulaire-actions">
            <button class="bouton bouton-discret" data-action="deconnecter">Changer la connexion</button>
            <button class="bouton bouton-plein" data-action="sync">Réessayer</button>
          </div>`
        : ''}
    </section>
  </div>`;
}

const LIBELLES_SYNC = {
  ok: 'À jour',
  encours: 'Synchronisation…',
  horsligne: 'Hors ligne',
  erreur: 'Erreur',
  demo: 'Mode démo',
  inactif: 'En attente',
};
export function libelleSync() {
  const s = magasin.sync;
  const n = enAttente();
  if (s.statut === 'horsligne') return n ? `Hors ligne · ${pluriel(n, 'envoi')} en attente` : 'Hors ligne';
  if (s.statut === 'ok' && n) return 'Envoi en attente';
  return LIBELLES_SYNC[s.statut] || s.statut;
}

function interrupteur(cle, libelle, note) {
  const actif = !!magasin.config[cle];
  return h`<li class="reglage">
    <span class="reglage-texte"><strong>${libelle}</strong><span>${note}</span></span>
    <button class="interrupteur" role="switch" aria-checked="${actif ? 'true' : 'false'}" aria-label="${libelle}" data-action="bascule" data-cle="${cle}"><i></i></button>
  </li>`;
}

function regles() {
  const { jeu } = magasin;
  const r = jeu.regles;
  return h`<details class="repli">
    <summary>Les règles en bref</summary>
    <div class="regles">
      <h3>Rangs des quêtes</h3>
      <ul class="regles-rangs">${ORDRE_RANGS.map(k => h`<li><span class="rang rang-${k.toLowerCase()}">${k}</span> ${r.xpRangs[k]} XP</li>`)}</ul>
      <h3>Ton rang</h3>
      <p>${ORDRE_RANGS.map(k => `${k} dès le niveau ${r.paliersRang[k]}`).join(' · ')}.</p>
      <h3>Chaque jour</h3>
      <ul>
        <li><strong>Coffre du jour</strong> : toutes les quotidiennes faites → +${r.coffre.xp} XP Mental.</li>
        <li><strong>Zone de pénalité</strong> : une quotidienne ratée → un rattrapage le lendemain, sur le même axe. Jamais de perte d’XP.</li>
        <li><strong>Mode survie</strong> : ${r.survie.joursRates} jours vides d’affilée → une seule quête par jour, jusqu’à ${r.survie.joursReussis} jours actifs de suite.</li>
        <li>La journée bascule à ${r.heureBascule} h du matin, et les ${r.joursModifiables} derniers jours restent modifiables.</li>
      </ul>
      <h3>L’Arbre de la connaissance</h3>
      <ul>${NIVEAUX_ARBRE.slice(1).map(n => h`<li>${n.icone} <strong>${n.nom}</strong> (${n.etat}) : +${n.xp} XP Intelligence.</li>`)}</ul>
    </div>
  </details>`;
}

export function vueReglages(ui) {
  const { config, sync } = magasin;
  const demo = config.mode === 'demo';
  const n = enAttente();
  const blocSync = demo
    ? h`<section class="bloc">
        <h2 class="bloc-titre">Mode démo</h2>
        <p class="bloc-note">Tu joues avec des données d’exemple, rangées à part et jamais synchronisées.</p>
        <div class="formulaire-actions">
          <button class="bouton bouton-discret" data-action="demo-neuve">Recommencer la démo</button>
          <button class="bouton bouton-plein" data-action="deconnecter">Relier mes vraies données</button>
        </div>
      </section>`
    : h`<section class="bloc">
        <h2 class="bloc-titre">Synchronisation <span class="etat-puce etat-sync-${sync.statut}">${libelleSync()}</span></h2>
        ${sync.message ? h`<p class="erreur" role="alert">${icone('alerte')} <span>${sync.message}</span></p>` : ''}
        ${ui.connexion.ouverte
          ? formulaireConnexion(ui, { annulable: true })
          : h`<dl class="fiche-sync">
              <div><dt>Dépôt</dt><dd>${config.depot}</dd></div>
              <div><dt>Dossier</dt><dd>${config.dossier || '—'}</dd></div>
              ${config.branche ? h`<div><dt>Branche</dt><dd>${config.branche}</dd></div>` : ''}
              ${config.api !== API_GITHUB ? h`<div><dt>API</dt><dd>${config.api}</dd></div>` : ''}
              <div><dt>Dernière synchro</dt><dd>${ilYA(sync.dernier)}</dd></div>
              <div><dt>Envois en attente</dt><dd>${n ? pluriel(n, 'fichier') : 'aucun'}</dd></div>
            </dl>
            <div class="formulaire-actions">
              <button class="bouton bouton-discret" data-action="connexion-ouvrir">Modifier la connexion</button>
              <button class="bouton bouton-plein" data-action="sync" ${sync.statut === 'encours' ? h`disabled` : ''}>${icone('sync')} Synchroniser</button>
            </div>`}
      </section>`;

  return h`<div class="page page-reglages">
    ${blocSync}
    <section class="bloc">
      <h2 class="bloc-titre">Préférences</h2>
      <ul class="reglages-liste">
        ${interrupteur('sons', 'Sons', 'Un signal discret à chaque quête, coffre et niveau.')}
        ${interrupteur('animations', 'Animations', 'Éclats, coffre qui s’ouvre, montées de niveau.')}
      </ul>
    </section>
    <section class="bloc">
      <h2 class="bloc-titre">Le jeu</h2>
      ${regles()}
      <details class="repli">
        <summary>Où vont mes données ?</summary>
        <div class="regles">
          <p>Dans ton dépôt, et nulle part ailleurs. Cette appli écrit <code>journal-AAAA-MM.json</code> (ce que tu coches) et <code>etat.json</code> (hebdomadaires, donjons, succès, résumé). Le Système, lui, écrit <code>jeu.json</code> (les quêtes) et <code>arbre.json</code>.</p>
          <p>Sans réseau, tes coches restent sur l’appareil et partent à la prochaine connexion.</p>
        </div>
      </details>
      ${!demo && !ui.connexion.ouverte ? AIDE_JETON : ''}
    </section>
    ${demo
      ? ''
      : h`<section class="bloc">
          <h2 class="bloc-titre">Cet appareil</h2>
          <p class="bloc-note">Déconnecter efface de cet appareil le jeton et la copie locale. Rien n’est supprimé dans le dépôt.</p>
          <div class="formulaire-actions">
            <button class="bouton bouton-discret" data-action="vider-cache">Recharger depuis le dépôt</button>
            <button class="bouton bouton-danger" data-action="deconnecter">Déconnecter cet appareil</button>
          </div>
        </section>`}
    <p class="version">Ascension ${VERSION} · le Système tient les comptes</p>
  </div>`;
}
