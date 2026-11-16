/* Ascension — démarrage, rendu des écrans et actions du joueur. */
import * as M from './moteur.js';
import {
  magasin,
  abonner,
  demarrer,
  aujourdhui,
  basculerQuete,
  basculerHebdo,
  basculerEtage,
  etageFait,
  synchroniser,
  connecter,
  deconnecter,
  passerEnDemo,
  sauverConfig,
  prendreAnnonces,
  rafraichir,
  viderCacheLocal,
  enAttente,
} from './magasin.js';
import { API_GITHUB } from './depot.js';
import { h, icone, embleme, nombre, pluriel, annoncer, flotteur, eclats, centreDe, ouvrirCalque, fermerCalque, calqueOuvert, confirmer, installerBulles, reglerAnimations } from './ui.js';
import { sons, reglerSons } from './sons.js';
import { vueQuetes, contexteQuetes } from './vues/quetes.js';
import { vueStatut } from './vues/statut.js';
import { vueDonjons } from './vues/donjons.js';
import { vueArbre, ficheNoeud } from './vues/arbre.js';
import { ficheExploration, optionsExploration } from './vues/exploration.js';
import { vueReglages, vueAccueil, vueAttente, libelleSync, SIGLE } from './vues/reglages.js';

const ui = {
  onglet: 'quetes',
  date: null, // null = aujourd'hui
  domaines: new Set(),
  connexion: { ouverte: false, avance: false, occupe: false, erreur: '', champs: { depot: '', jeton: '', dossier: '', branche: '', api: '' } },
};

const ONGLETS = [
  ['quetes', 'Quêtes'],
  ['statut', 'Statut'],
  ['donjons', 'Donjons'],
  ['arbre', 'Arbre'],
  ['reglages', 'Réglages'],
];
const VUES = { quetes: vueQuetes, statut: vueStatut, donjons: vueDonjons, arbre: vueArbre, reglages: vueReglages };

const zones = {
  app: document.getElementById('app'),
  entete: document.getElementById('entete'),
  vue: document.getElementById('vue'),
  nav: document.getElementById('nav'),
};
const dernier = {};
function poser(zone, contenu) {
  const s = String(contenu);
  if (dernier[zone] === s) return;
  dernier[zone] = s;
  zones[zone].innerHTML = s;
}

/* ───────────────────────── Rendu ───────────────────────── */

function entete() {
  const c = magasin.calcul;
  const g = c.global;
  const k = c.compteurs;
  const s = magasin.sync;
  const n = enAttente();
  return h`<div class="entete-ligne">
    <button class="entete-rang" data-action="onglet" data-onglet="statut" aria-label="Rang ${c.rang}, niveau ${c.niveau}. Ouvrir la fenêtre de statut">${embleme(c.rang, 'embleme-petit')}</button>
    <div class="entete-centre">
      <div class="entete-titre"><strong>Niveau ${c.niveau}</strong><span class="entete-rang-nom">Rang ${c.rang}</span><span class="entete-xp">${nombre(c.xp)} / ${nombre(g.haut)} XP</span></div>
      <div class="jauge jauge-xp" role="progressbar" aria-valuemin="${g.bas}" aria-valuemax="${g.haut}" aria-valuenow="${c.xp}" aria-label="XP vers le niveau ${g.niveau + 1}"><div class="jauge-plein" style="width:${(g.ratio * 100).toFixed(1)}%"></div></div>
    </div>
    <div class="entete-droite">
      <span class="serie ${k.serie ? 'est-active' : ''}" tabindex="0" role="img" aria-label="Série : ${pluriel(k.serie, 'jour')}" data-bulle="Série | ${pluriel(k.serie, 'jour')} d’affilée | record : ${k.serieRecord}">${icone('flamme')}<b>${k.serie}</b></span>
      <button class="temoin temoin-${s.statut} ${n ? 'a-envoyer' : ''}" data-action="temoin" aria-label="Synchronisation : ${libelleSync()}" data-bulle="${libelleSync()}">${icone('sync')}</button>
    </div>
  </div>`;
}

function nav() {
  const c = magasin.calcul;
  const restantes = c.jour ? c.jour.total - c.jour.faites : 0;
  return h`<div class="nav-marque">${SIGLE}<span>Ascension</span></div>
    <ul class="nav-liste">${ONGLETS.map(
      ([id, nom]) => h`<li><button class="nav-lien" data-action="onglet" data-onglet="${id}" aria-current="${ui.onglet === id ? 'page' : 'false'}">
        <span class="nav-icone">${icone(id)}${id === 'quetes' && restantes > 0 ? h`<b class="nav-pastille" aria-label="${pluriel(restantes, 'quête restante', 'quêtes restantes')}">${restantes}</b>` : ''}</span>
        <span class="nav-nom">${nom}</span>
      </button></li>`,
    )}</ul>`;
}

function cleFoyer() {
  const el = document.activeElement;
  if (!el || !el.dataset || !el.dataset.action || !zones.app.contains(el)) return null;
  return Object.entries(el.dataset)
    .filter(([k]) => k !== 'bulle')
    .map(([k, v]) => `[data-${k.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`)}="${CSS.escape(v)}"]`)
    .join('');
}

function rendre(force = false) {
  const mode = magasin.config.mode;
  const pret = !!magasin.calcul && !!magasin.jeu;
  zones.app.dataset.etat = !mode ? 'accueil' : pret ? 'jeu' : 'attente';
  zones.app.dataset.onglet = ui.onglet;
  zones.app.classList.toggle('en-survie', pret && magasin.calcul.survie);
  const foyer = cleFoyer();
  // On ne remplace pas un formulaire pendant la saisie.
  const enSaisie = !force && document.activeElement && document.activeElement.tagName === 'INPUT' && zones.vue.contains(document.activeElement);

  if (!mode || !pret) {
    poser('entete', '');
    poser('nav', '');
    if (!enSaisie) poser('vue', !mode ? vueAccueil(ui) : vueAttente());
  } else {
    poser('entete', entete());
    poser('nav', nav());
    if (!enSaisie) poser('vue', VUES[ui.onglet](ui));
  }
  if (foyer && (!document.activeElement || document.activeElement === document.body)) {
    const el = zones.app.querySelector(foyer);
    if (el) el.focus({ preventScroll: true });
  }
  traiterAnnonces();
}

/* ───────────────────────── Annonces du Système ───────────────────────── */

const fileNiveaux = [];
let niveauPrevu = false;

function montrerNiveau(a) {
  const rangChange = a.rang !== a.rangAvant;
  sons.niveau();
  ouvrirCalque(
    h`<div class="niveau-sup ${rangChange ? 'est-rang' : ''}" role="alertdialog" aria-modal="true" aria-labelledby="niv-titre">
      <div class="niveau-rayons" aria-hidden="true"></div>
      <p class="balise">[SYSTÈME]</p>
      <h2 id="niv-titre" class="niveau-titre">${rangChange ? 'Nouveau rang' : 'Niveau supérieur'}</h2>
      <div class="niveau-embleme">${embleme(a.rang, 'embleme-grand')}</div>
      <p class="niveau-chiffres"><span>${a.de}</span>${icone('droite')}<strong>${a.a}</strong></p>
      <p class="niveau-texte">${rangChange ? `Le rang ${a.rangAvant} est derrière toi. Rang ${a.rang} atteint.` : `Niveau ${a.a} atteint. Continue.`}</p>
      <button class="bouton bouton-plein" data-action="calque-fermer" data-foyer>Continuer</button>
    </div>`,
    { classe: 'calque-centre calque-niveau' },
  ).then(() => traiterAnnonces());
}

function traiterAnnonces() {
  for (const a of prendreAnnonces()) {
    if (a.type === 'succes') {
      annoncer(`Succès débloqué : ${a.titre}.`, { type: 'succes', picto: 'trophee', duree: 5200 });
      setTimeout(() => sons.succes(), 500);
    } else if (a.type === 'forme') {
      annoncer(`${a.minutes} min d’exercice reçues de la montre : « ${a.titre} » validée (+${a.xp} XP).`, { type: 'xp', picto: 'eclair', duree: 5200 });
    } else if (a.type === 'attribution') {
      const axe = a.axe ? M.axeDe(magasin.jeu, a.axe) : null;
      annoncer(`+${nombre(a.xp)} XP${axe ? ` ${axe.nom}` : ''}${a.motif ? ` — ${a.motif}` : ''}`, { type: 'xp', picto: 'eclair', duree: 5600 });
    } else if (a.type === 'niveau') {
      if (a.origine === 'action') fileNiveaux.push(a);
      else annoncer(`Niveau ${a.a} atteint${a.rang !== a.rangAvant ? ` — rang ${a.rang}` : ''}.`, { type: 'niveau', picto: 'eclair', duree: 5600 });
    }
  }
  if (fileNiveaux.length && !calqueOuvert() && !niveauPrevu) {
    niveauPrevu = true;
    setTimeout(() => {
      niveauPrevu = false;
      if (calqueOuvert()) return;
      // Plusieurs niveaux d'un coup : une seule annonce, du premier au dernier.
      const premier = fileNiveaux[0];
      const final = fileNiveaux[fileNiveaux.length - 1];
      fileNiveaux.length = 0;
      montrerNiveau({ ...final, de: premier.de, rangAvant: premier.rangAvant });
    }, 700);
  }
}

/* ───────────────────────── Actions ───────────────────────── */

const couleurAxe = id => getComputedStyle(document.documentElement).getPropertyValue(`--axe-${id}`).trim() || '#5cc8ff';
const OR = '#f0c75e';

function animer(selecteur, classe) {
  const el = zones.vue.querySelector(selecteur);
  if (!el) return null;
  el.classList.add(classe);
  setTimeout(() => el.classList.remove(classe), 900);
  return el;
}

function ouvertureCoffre() {
  setTimeout(() => {
    sons.coffre();
    const coffre = animer('#coffre', 'vient-de-souvrir');
    if (coffre) {
      const p = centreDe(coffre.querySelector('.coffre-dessin'));
      eclats(p.x, p.y, OR, 24);
      flotteur(p.x, p.y - 30, `+${magasin.jeu.regles.coffre.xp} XP`, 'est-or');
    }
    annoncer('Coffre du jour ouvert.', { type: 'coffre', duree: 3200 });
  }, 380);
}

function allerA(onglet) {
  ui.onglet = onglet;
  rendre();
  zones.vue.scrollTop = 0;
  window.scrollTo(0, 0);
}

function reinitialiserConnexion() {
  ui.connexion = { ouverte: false, avance: false, occupe: false, erreur: '', champs: { depot: '', jeton: '', dossier: '', branche: '', api: '' } };
}

const actions = {
  onglet(el) {
    sons.touche();
    allerA(el.dataset.onglet);
  },
  jour(el) {
    ui.date = el.dataset.date === magasin.calcul.aujourdhui ? null : el.dataset.date;
    rendre();
  },
  aujourdhui() {
    ui.date = null;
    rendre();
  },
  semaine(el) {
    const c = contexteQuetes(ui);
    const lundi = M.ajouterJours(c.lundi, 7 * Number(el.dataset.sens));
    if (lundi < c.premierLundi || lundi > c.dernierLundi) return;
    let date = M.ajouterJours(lundi, M.jourSemaine(c.date) - 1);
    if (lundi === M.lundiDe(c.auj)) date = c.auj;
    if (date < magasin.jeu.debut) date = magasin.jeu.debut;
    ui.date = date === c.auj ? null : date;
    rendre();
  },
  quete(el) {
    const c = contexteQuetes(ui);
    if (!c.jour) return;
    const q = [...c.jour.quetes, ...c.jour.rattrapages, ...c.jour.bonus].find(x => x.id === el.dataset.id);
    if (!q) return;
    const centre = centreDe(el.querySelector('.quete-coche'));
    const r = basculerQuete(c.date, q);
    if (!r) return;
    if (r.faite) {
      animer(`.quete[data-id="${CSS.escape(q.id)}"]`, 'vient-detre-faite');
      eclats(centre.x, centre.y, couleurAxe(q.axe));
      flotteur(centre.x, centre.y - 20, `+${q.xp} XP`);
      sons.quete();
      if (r.coffreOuvert) ouvertureCoffre();
    } else {
      sons.annule();
      if (r.coffrePerdu) annoncer('Coffre refermé : il manque une quotidienne.', { duree: 2600 });
    }
  },
  hebdo(el) {
    const c = contexteQuetes(ui);
    const q = c.semaine.hebdo.find(x => x.id === el.dataset.id);
    if (!q) return;
    const centre = centreDe(el.querySelector('.quete-coche'));
    const r = basculerHebdo(c.lundi, q);
    if (!r) return;
    if (r.faite) {
      animer(`.quete[data-action="hebdo"][data-id="${CSS.escape(q.id)}"]`, 'vient-detre-faite');
      eclats(centre.x, centre.y, couleurAxe(q.axe), 22);
      flotteur(centre.x, centre.y - 20, `+${q.xp} XP`);
      sons.hebdo();
      annoncer(`Quête hebdomadaire accomplie : ${q.titre}.`, { duree: 3200 });
    } else {
      sons.annule();
    }
  },
  async etage(el) {
    const donjon = magasin.jeu.donjons.find(d => d.id === el.dataset.donjon);
    const etage = donjon && donjon.etages.find(e => e.id === el.dataset.id);
    if (!etage) return;
    const fait = !!etageFait(donjon.id, etage.id);
    const centre = centreDe(el.querySelector('.etage-repere'));
    const axe = M.axeDe(magasin.jeu, etage.axe);
    const ok = await confirmer(
      fait
        ? { titre: 'Annuler cet étage ?', texte: `« ${etage.titre} » ne sera plus compté (−${nombre(etage.xp)} XP).`, oui: 'Annuler l’étage', non: 'Le garder', picto: 'alerte' }
        : { titre: etage.boss ? 'Boss vaincu ?' : 'Étage franchi ?', texte: `« ${etage.titre} » : +${nombre(etage.xp)} XP ${axe.nom}.`, oui: etage.boss ? 'Boss vaincu' : 'Étage franchi', non: 'Pas encore', picto: etage.boss ? 'couronne' : 'donjons' },
    );
    if (!ok) return;
    const r = basculerEtage(donjon, etage, !fait);
    if (!r) return;
    if (r.faite) {
      eclats(centre.x, centre.y, etage.boss ? OR : couleurAxe(etage.axe), etage.boss ? 40 : 26);
      flotteur(centre.x, centre.y - 22, `+${nombre(etage.xp)} XP`, etage.boss ? 'est-or' : '');
      sons.coffre();
      annoncer(etage.boss ? `Boss vaincu : ${etage.titre}.` : `Étage franchi : ${etage.titre}.`, { type: 'coffre', duree: 4200 });
    } else {
      sons.annule();
    }
  },
  explorer() {
    const c = contexteQuetes(ui);
    if (!c.jour || !c.modifiable) return;
    ouvrirCalque(ficheExploration(c.date), { classe: 'calque-feuille' });
  },
  noeud(el) {
    const fiche = ficheNoeud(el.dataset.nom);
    if (fiche) ouvrirCalque(fiche, { classe: 'calque-feuille' });
  },
  domaine(el) {
    const nom = el.dataset.nom;
    if (ui.domaines.has(nom)) ui.domaines.delete(nom);
    else ui.domaines.add(nom);
    rendre();
  },
  temoin() {
    const s = magasin.sync.statut;
    if (magasin.config.mode !== 'git') return allerA('reglages');
    if (s === 'erreur') return allerA('reglages');
    synchroniser().then(() => {
      if (magasin.sync.statut === 'ok') annoncer('Données à jour.', { duree: 1800 });
      else if (magasin.sync.statut === 'horsligne') annoncer('Hors ligne. Tes coches partiront au retour du réseau.', { duree: 3200 });
    });
  },
  sync() {
    synchroniser().then(() => {
      if (magasin.sync.statut === 'ok') annoncer('Données à jour.', { duree: 1800 });
    });
  },
  bascule(el) {
    const cle = el.dataset.cle;
    sauverConfig({ [cle]: !magasin.config[cle] });
    reglerSons(magasin.config.sons);
    reglerAnimations(magasin.config.animations);
    if (cle === 'sons' && magasin.config.sons) sons.quete();
  },
  async demo() {
    await passerEnDemo();
    allerA('quetes');
    annoncer('Mode démo : des données d’exemple, rien n’est synchronisé.', { duree: 4200 });
  },
  async 'demo-neuve'() {
    await passerEnDemo({ neuf: true });
    ui.date = null;
    allerA('quetes');
  },
  async deconnecter() {
    const n = enAttente();
    const demo = magasin.config.mode === 'demo';
    const ok = await confirmer({
      titre: demo ? 'Quitter le mode démo ?' : 'Déconnecter cet appareil ?',
      texte: demo
        ? 'Les données d’exemple seront effacées de cet appareil.'
        : n
          ? `Attention : ${pluriel(n, 'fichier')} de coches n’${n > 1 ? 'ont' : 'a'} pas encore été envoyé${n > 1 ? 's' : ''}. Elles seront perdues.`
          : 'Le jeton et la copie locale seront effacés de cet appareil. Rien n’est supprimé dans le dépôt.',
      oui: demo ? 'Quitter la démo' : 'Déconnecter',
      picto: 'alerte',
    });
    if (!ok) return;
    deconnecter();
    reinitialiserConnexion();
    ui.date = null;
    ui.onglet = 'quetes';
    rendre(true);
  },
  'connexion-ouvrir'() {
    const c = magasin.config;
    ui.connexion = { ouverte: true, avance: true, occupe: false, erreur: '', champs: { depot: c.depot, jeton: '', dossier: c.dossier, branche: c.branche, api: c.api === API_GITHUB ? '' : c.api } };
    rendre(true);
  },
  'connexion-annuler'() {
    reinitialiserConnexion();
    rendre(true);
  },
  async 'vider-cache'() {
    if (!viderCacheLocal()) annoncer('Des coches attendent encore d’être envoyées : synchronise d’abord.', { duree: 3600 });
    else annoncer('Copie locale effacée : rechargement depuis le dépôt.', { duree: 2600 });
  },
  'calque-fermer'() {
    fermerCalque(false);
  },
  'calque-valider'() {
    fermerCalque(true);
  },
  aucune() {},
};

document.addEventListener('click', e => {
  const calque = document.getElementById('calque');
  if (e.target === calque && calque.dataset.fermable) return fermerCalque(false);
  const el = e.target instanceof Element ? e.target.closest('[data-action]') : null;
  if (!el || el.disabled) return;
  const action = actions[el.dataset.action];
  if (action) action(el, e);
});

document.addEventListener('submit', e => {
  const fx = e.target instanceof Element ? e.target.closest('[data-form="exploration"]') : null;
  if (!fx) return;
  e.preventDefault();
  const donnees = new FormData(fx);
  const choix = String(donnees.get('choix') || '');
  const sujet = String(donnees.get('sujet') || '').trim();
  const resume = String(donnees.get('resume') || '').trim();
  const erreur = fx.querySelector('.erreur');
  const dire = texte => {
    erreur.textContent = texte;
    erreur.hidden = false;
  };
  if (!choix) return dire('Choisis une des explorations, ou le choix libre.');
  if (choix === 'libre' && !sujet) return dire('Dis en quelques mots sur quoi porte ton choix libre.');
  const date = fx.dataset.date;
  const jour = magasin.calcul && magasin.calcul.jours.get(date);
  const quete = jour && jour.quetes.find(q => q.id === 'arbre');
  if (!quete || quete.faite) return fermerCalque(false);
  const option = optionsExploration(date).find(o => o.id === choix);
  const extra = { ex: choix, s: choix === 'libre' ? sujet : (option && option.ressource && option.ressource.titre) || (option && option.titre) || choix };
  if (option && option.noeud) extra.nd = option.noeud;
  if (resume) extra.r = resume;
  const r = basculerQuete(date, quete, extra);
  fermerCalque(true);
  if (!r) return;
  sons.quete();
  setTimeout(() => {
    const coche = zones.vue.querySelector('.quete[data-id="arbre"] .quete-coche');
    if (coche) {
      const p = centreDe(coche);
      eclats(p.x, p.y, couleurAxe('int'), 20);
      flotteur(p.x, p.y - 20, `+${quete.xp} XP`);
    }
  }, 60);
  annoncer('Exploration enregistrée. Le Système l’ajoutera à ton arbre.', { duree: 3600 });
  if (r.coffreOuvert) ouvertureCoffre();
});

document.addEventListener('submit', async e => {
  const form = e.target instanceof Element ? e.target.closest('[data-form="connexion"]') : null;
  if (!form) return;
  e.preventDefault();
  const c = ui.connexion;
  for (const champ of form.querySelectorAll('input[name]')) c.champs[champ.name] = champ.value;
  c.avance = !!form.querySelector('[data-repli="avance"]')?.open;
  c.occupe = true;
  c.erreur = '';
  rendre(true);
  try {
    await connecter({
      depot: c.champs.depot,
      jeton: c.champs.jeton || (magasin.config.mode === 'git' ? magasin.config.jeton : ''),
      dossier: c.champs.dossier,
      branche: c.champs.branche,
      api: c.champs.api || API_GITHUB,
    });
    reinitialiserConnexion();
    ui.date = null;
    ui.onglet = 'quetes';
    if (magasin.sync.statut === 'ok') annoncer('Appareil relié. Données chargées.', { duree: 3200 });
  } catch (err) {
    c.erreur = err && err.message ? err.message : String(err);
  }
  c.occupe = false;
  rendre(true);
});

document.addEventListener('input', e => {
  const champ = e.target;
  if (champ instanceof HTMLInputElement && champ.name && champ.closest('[data-form="connexion"]')) ui.connexion.champs[champ.name] = champ.value;
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && calqueOuvert() && document.getElementById('calque').dataset.fermable) return fermerCalque(false);
  const cible = e.target;
  if (cible instanceof HTMLInputElement || cible instanceof HTMLTextAreaElement || calqueOuvert() || e.ctrlKey || e.metaKey || e.altKey) return;
  const i = Number(e.key) - 1;
  if (Number.isInteger(i) && ONGLETS[i] && magasin.calcul) allerA(ONGLETS[i][0]);
});

/* ───────────────────────── Vie de l'appli ───────────────────────── */

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') rafraichir();
});
window.addEventListener('online', () => synchroniser());
window.addEventListener('pageshow', e => {
  if (e.persisted) rafraichir();
});
// Changement de jour pendant que l'appli est ouverte, et synchro régulière.
setInterval(() => {
  if (document.visibilityState !== 'visible' || !magasin.calcul) return;
  if (magasin.calcul.aujourdhui !== aujourdhui()) {
    ui.date = null;
    rafraichir();
  }
}, 60000);
setInterval(() => {
  if (document.visibilityState === 'visible' && magasin.config.mode === 'git') synchroniser();
}, 300000);

function installerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (local && !new URLSearchParams(location.search).has('sw')) return;
  const ouverture = Date.now();
  let dejaControle = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!dejaControle) {
      dejaControle = true;
      return;
    }
    // Nouvelle version installée : on recharge si l'appli vient d'être ouverte, sinon on prévient.
    if (Date.now() - ouverture < 8000 && !calqueOuvert()) location.reload();
    else annoncer('Nouvelle version installée. Elle sera active au prochain lancement.', { duree: 5200 });
  });
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

reglerSons(magasin.config.sons);
reglerAnimations(magasin.config.animations);
installerBulles();
abonner(() => rendre());
rendre();
demarrer().catch(e => {
  annoncer(`Démarrage impossible : ${e && e.message ? e.message : e}`, { type: 'erreur', duree: 8000 });
});
installerServiceWorker();
