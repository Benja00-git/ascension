/* Ascension — magasin : données en mémoire, copie locale, synchronisation avec le dépôt.
 *
 * Qui écrit quoi dans le dossier des données :
 *   - le Système (Claude, côté PC)  → jeu.json, arbre.json   (l'appli ne fait que les lire)
 *   - l'appli (PC et iPhone)        → journal-AAAA-MM.json, etat.json
 * Chaque fichier n'a donc qu'un côté qui écrit : pas de conflit Git avec la synchro du vault.
 */
import * as M from './moteur.js';
import { DepotGithub, ErreurDepot, API_GITHUB } from './depot.js';

const CLE_CONFIG = 'ascension.config';
const CLE_VU = 'ascension.vu';
const cleDonnees = mode => (mode === 'demo' ? 'ascension.demo.donnees' : 'ascension.git.donnees');

const lire = (cle, defaut) => {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : defaut;
  } catch (e) {
    return defaut;
  }
};
const ecrire = (cle, valeur) => {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch (e) {
    /* stockage plein ou bloqué : l'appli continue en mémoire */
  }
};

const CONFIG_DEFAUT = { mode: null, depot: '', branche: '', dossier: '', jeton: '', api: API_GITHUB, sons: true, animations: true };

export const magasin = {
  config: { ...CONFIG_DEFAUT, ...lire(CLE_CONFIG, {}) },
  jeuBrut: null,
  jeu: null,
  arbre: null,
  etat: M.etatVide(),
  journaux: {},
  shas: {},
  sales: new Set(),
  annonces: {},
  calcul: null,
  simulation: null,
  sync: { statut: 'inactif', message: '', code: '', dernier: null, avertissement: '' },
  file: [], // événements à annoncer par l'interface : montée de niveau, succès, attribution
};

const revisions = {};
const ecouteurs = new Set();
let vu = lire(CLE_VU, {});

export function abonner(fn) {
  ecouteurs.add(fn);
  return () => ecouteurs.delete(fn);
}
function notifier() {
  for (const fn of ecouteurs) fn();
}

/* ───────────────────────── Temps ───────────────────────── */

export function maintenant() {
  return new Date();
}
export function aujourdhui() {
  if (magasin.simulation) return magasin.simulation;
  const bascule = magasin.jeu ? magasin.jeu.regles.heureBascule : M.REGLES_DEFAUT.heureBascule;
  return M.jourDeJeu(maintenant(), bascule);
}
const horodatage = () => Date.now();
const jjmm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/* ───────────────────────── Fichiers ───────────────────────── */

const NOM_ETAT = 'etat.json';
const nomJournal = mois => `journal-${mois}.json`;
const moisDuNom = nom => (/^journal-(\d{4}-\d{2})\.json$/.exec(nom) || [])[1] || null;
const estSysteme = nom => nom === 'jeu.json' || nom === 'arbre.json';
const estNotre = nom => nom === NOM_ETAT || !!moisDuNom(nom);

const trier = objet => Object.fromEntries(Object.keys(objet || {}).sort().map(cle => [cle, objet[cle]]));

/** Écriture stable (clés triées) : deux appareils produisent exactement le même fichier pour les mêmes données. */
function serialiserJournal(doc) {
  const lignes = ['{', ` "format": ${JSON.stringify(doc.format || 'ascension/journal@1')},`, ` "mois": ${JSON.stringify(doc.mois)},`, ' "jours": {'];
  const dates = Object.keys(doc.jours || {}).sort();
  dates.forEach((date, i) => {
    lignes.push(`  ${JSON.stringify(date)}: {`);
    const ids = Object.keys(doc.jours[date] || {}).sort();
    ids.forEach((id, k) => lignes.push(`   ${JSON.stringify(id)}: ${JSON.stringify(doc.jours[date][id])}${k < ids.length - 1 ? ',' : ''}`));
    lignes.push(`  }${i < dates.length - 1 ? ',' : ''}`);
  });
  lignes.push(' }', '}');
  return lignes.join('\n') + '\n';
}
function partieSaisie(etat) {
  const groupes = g => trier(Object.fromEntries(Object.entries(g || {}).map(([cle, v]) => [cle, trier(v)])));
  return { hebdo: groupes(etat.hebdo), donjons: groupes(etat.donjons), succes: trier(etat.succes) };
}
function serialiserEtat(etat) {
  return JSON.stringify({ format: etat.format || 'ascension/etat@1', ...partieSaisie(etat), resume: etat.resume || null }, null, 1) + '\n';
}
function serialiser(nom) {
  const mois = moisDuNom(nom);
  return mois ? serialiserJournal(magasin.journaux[mois] || M.journalVide(mois)) : serialiserEtat(magasin.etat);
}

function marquerSale(nom, annonce) {
  magasin.sales.add(nom);
  revisions[nom] = (revisions[nom] || 0) + 1;
  if (annonce) (magasin.annonces[nom] || (magasin.annonces[nom] = [])).push(annonce);
}

function sauver() {
  ecrire(cleDonnees(magasin.config.mode), {
    jeuBrut: magasin.jeuBrut,
    arbre: magasin.arbre,
    etat: magasin.etat,
    journaux: magasin.journaux,
    shas: magasin.shas,
    sales: [...magasin.sales],
    annonces: magasin.annonces,
    dernier: magasin.sync.dernier,
  });
}
function charger() {
  const d = lire(cleDonnees(magasin.config.mode), null);
  magasin.jeuBrut = (d && d.jeuBrut) || null;
  magasin.jeu = magasin.jeuBrut ? M.normaliserJeu(magasin.jeuBrut) : null;
  magasin.arbre = (d && d.arbre) || null;
  magasin.etat = (d && d.etat) || M.etatVide();
  magasin.journaux = (d && d.journaux) || {};
  magasin.shas = (d && d.shas) || {};
  magasin.sales = new Set((d && d.sales) || []);
  magasin.annonces = (d && d.annonces) || {};
  magasin.sync.dernier = (d && d.dernier) || null;
}
export function sauverConfig(modifs) {
  Object.assign(magasin.config, modifs || {});
  ecrire(CLE_CONFIG, magasin.config);
  notifier();
}

/* ───────────────────────── Calcul ───────────────────────── */

function calculer() {
  return M.calculer({ jeu: magasin.jeu, journaux: magasin.journaux, etat: magasin.etat, arbre: magasin.arbre, aujourdhui: aujourdhui() });
}

function recalculer(t = horodatage(), origine = 'sync') {
  if (!magasin.jeu) {
    magasin.calcul = null;
    return;
  }
  const jour = aujourdhui();
  let calcul = calculer();

  const dates = [];
  for (let i = 0; i < magasin.jeu.regles.joursModifiables; i++) dates.push(M.ajouterJours(jour, -i));

  // 1. Coffres : alignés sur les quêtes réellement faites, pour les jours encore modifiables.
  const mois = M.reconcilierCoffres(magasin.jeu, magasin.journaux, calcul.jours, dates, t);
  if (mois.length) {
    mois.forEach(m => marquerSale(nomJournal(m)));
    calcul = calculer();
  }

  // 2. Succès : inscrits une fois pour toutes dans etat.json.
  const nouveaux = calcul.succes.filter(s => s.nouveau);
  if (nouveaux.length) {
    if (!magasin.etat.succes) magasin.etat.succes = {};
    for (const s of nouveaux) {
      magasin.etat.succes[s.id] = { le: jour, t };
      magasin.file.push({ type: 'succes', titre: s.titre, texte: s.texte });
    }
    marquerSale(NOM_ETAT, nouveaux.map(s => `🏆 ${s.titre}`).join(', '));
    calcul = calculer();
  }

  // 3. Résumé pour le Système.
  const resume = M.construireResume(magasin.jeu, calcul);
  if (JSON.stringify(resume) !== JSON.stringify(magasin.etat.resume || null)) {
    magasin.etat.resume = resume;
    marquerSale(NOM_ETAT);
  }

  // 4. Ce que cet appareil n'a pas encore annoncé : niveaux et attributions du Système.
  const cle = magasin.config.mode || 'aucun';
  const dejaVu = vu[cle];
  if (!dejaVu) {
    vu[cle] = { niveau: calcul.niveau, attributions: magasin.jeu.attributions.length };
  } else {
    if (calcul.niveau > dejaVu.niveau) {
      magasin.file.push({ type: 'niveau', origine, de: dejaVu.niveau, a: calcul.niveau, rang: calcul.rang, rangAvant: M.rangPour(magasin.jeu.regles, dejaVu.niveau) });
    }
    dejaVu.niveau = calcul.niveau;
    const total = magasin.jeu.attributions.length;
    if (total > dejaVu.attributions) {
      for (const a of magasin.jeu.attributions.slice(dejaVu.attributions)) {
        if (a && Number.isFinite(a.xp)) magasin.file.push({ type: 'attribution', xp: a.xp, axe: a.axe, motif: a.motif || '' });
      }
    }
    dejaVu.attributions = total;
  }
  ecrire(CLE_VU, vu);

  magasin.calcul = calcul;
  sauver();
}

/** L'interface vide cette file après avoir affiché les annonces. */
export function prendreAnnonces() {
  const f = magasin.file;
  magasin.file = [];
  return f;
}

/* ───────────────────────── Actions du joueur ───────────────────────── */

function instantane() {
  const c = magasin.calcul;
  return c ? { xp: c.xp, niveau: c.niveau, rang: c.rang, axes: Object.fromEntries(c.axes.map(a => [a.id, a.niveau])) } : null;
}
function ecart(avant, date) {
  const c = magasin.calcul;
  const j = c.jours.get(date);
  return {
    xp: c.xp - avant.xp,
    niveauAvant: avant.niveau,
    niveau: c.niveau,
    axesMontes: c.axes.filter(a => a.niveau > (avant.axes[a.id] || 1)).map(a => ({ id: a.id, niveau: a.niveau })),
    coffre: !!(j && j.coffre),
  };
}

/** Coche ou décoche une quotidienne (ou un rattrapage) pour une date donnée. */
export function basculerQuete(date, quete, extra) {
  if (!magasin.jeu || !M.estModifiable(magasin.jeu, date, aujourdhui())) return null;
  const avant = instantane();
  const coffreAvant = !!(magasin.calcul.jours.get(date) || {}).coffre;
  const t = horodatage();
  const faite = !quete.faite;
  const mois = M.poserEntree(magasin.journaux, date, quete.id, faite ? M.entreeFaite(quete, t, extra) : M.entreeAnnulee(t));
  marquerSale(nomJournal(mois), `${faite ? '✅' : '↩️'} ${quete.titre}${faite && extra && extra.s ? ` — ${extra.s}` : ''} (${jjmm(date)})`);
  recalculer(t, 'action');
  planifierSync(2500);
  notifier();
  const e = ecart(avant, date);
  return { ...e, faite, coffreOuvert: e.coffre && !coffreAvant, coffrePerdu: !e.coffre && coffreAvant };
}

export function hebdoModifiable(lundi) {
  if (!magasin.jeu) return false;
  const jour = aujourdhui();
  const dimanche = M.ajouterJours(lundi, 6);
  if (lundi > jour || dimanche < magasin.jeu.debut) return false;
  return dimanche >= jour || M.estModifiable(magasin.jeu, dimanche, jour);
}

/** Coche ou décoche une quête hebdomadaire de la semaine qui commence le lundi donné. */
export function basculerHebdo(lundi, quete) {
  if (!hebdoModifiable(lundi)) return null;
  const avant = instantane();
  const semaine = M.semaineIso(lundi);
  const jour = aujourdhui();
  const dimanche = M.ajouterJours(lundi, 6);
  const le = jour < dimanche ? jour : dimanche;
  const t = horodatage();
  const faite = !quete.faite;
  if (!magasin.etat.hebdo) magasin.etat.hebdo = {};
  const groupe = magasin.etat.hebdo[semaine] || (magasin.etat.hebdo[semaine] = {});
  groupe[quete.id] = faite ? M.entreeFaite(quete, t, { le, ...(quete.boss ? { boss: 1 } : {}) }) : M.entreeAnnulee(t);
  marquerSale(NOM_ETAT, `${faite ? '✅' : '↩️'} ${quete.titre} (semaine ${semaine.slice(6)})`);
  recalculer(t, 'action');
  planifierSync(2500);
  notifier();
  return { ...ecart(avant, jour), faite };
}

/** Valide ou annule un étage de donjon. */
export function basculerEtage(donjon, etage, faite) {
  if (!magasin.jeu || donjon.statut !== 'ouvert' || !etage.axe) return null;
  const avant = instantane();
  const jour = aujourdhui();
  const t = horodatage();
  if (!magasin.etat.donjons) magasin.etat.donjons = {};
  const groupe = magasin.etat.donjons[donjon.id] || (magasin.etat.donjons[donjon.id] = {});
  groupe[etage.id] = faite ? M.entreeFaite(etage, t, { le: jour, ...(etage.boss ? { boss: 1 } : {}) }) : M.entreeAnnulee(t);
  marquerSale(NOM_ETAT, `${faite ? '🏰' : '↩️'} ${donjon.nom} — ${etage.titre}`);
  recalculer(t, 'action');
  planifierSync(2500);
  notifier();
  return { ...ecart(avant, jour), faite };
}

export function etageFait(donjonId, etageId) {
  const g = (magasin.etat.donjons || {})[donjonId] || {};
  return M.estFaite(g[etageId]) ? g[etageId] : null;
}

/* ───────────────────────── Synchronisation ───────────────────────── */

let enCours = false;
let aRefaire = false;
let minuterie = null;

function majSync(statut, extra) {
  Object.assign(magasin.sync, { statut, message: '', code: '' }, extra || {});
  notifier();
}

export function planifierSync(delai = 0) {
  if (magasin.config.mode !== 'git') return;
  clearTimeout(minuterie);
  minuterie = setTimeout(() => synchroniser(), delai);
}

function integrer(nom, texte, sha) {
  let distant;
  try {
    distant = JSON.parse(texte);
  } catch (e) {
    throw new ErreurDepot('json', `${nom} n'est pas un JSON valide : le fichier est ignoré tant qu'il n'est pas corrigé.`);
  }
  if (nom === 'jeu.json') {
    const probleme = M.validerJeu(distant);
    if (probleme) throw new ErreurDepot('json', probleme);
    magasin.jeuBrut = distant;
    magasin.jeu = M.normaliserJeu(distant);
  } else if (nom === 'arbre.json') {
    magasin.arbre = distant;
  } else if (nom === NOM_ETAT) {
    const fusion = M.fusionnerEtat(magasin.etat, distant);
    const pareil = JSON.stringify(partieSaisie(fusion)) === JSON.stringify(partieSaisie(distant));
    fusion.resume = distant.resume || null; // recalculé ensuite : s'il diffère, le fichier redevient « à envoyer »
    magasin.etat = fusion;
    if (pareil) magasin.sales.delete(nom);
    else marquerSale(nom);
  } else {
    const mois = moisDuNom(nom);
    const fusion = M.fusionnerJournal(magasin.journaux[mois], distant);
    if (!fusion.mois) fusion.mois = mois;
    const pareil = serialiserJournal(fusion) === serialiserJournal({ ...distant, mois: distant.mois || mois });
    magasin.journaux[mois] = fusion;
    if (pareil) magasin.sales.delete(nom);
    else marquerSale(nom);
  }
  magasin.shas[nom] = sha;
}

function messageCommit(nom) {
  const annonces = magasin.annonces[nom] || [];
  if (annonces.length) {
    const visibles = annonces.slice(-4).join(', ');
    return `⚔️ Ascension · ${visibles}${annonces.length > 4 ? ` (+${annonces.length - 4})` : ''}`;
  }
  if (nom === NOM_ETAT && magasin.calcul) return `⚔️ Ascension · statut : niveau ${magasin.calcul.niveau}, ${magasin.calcul.xp} XP`;
  return '⚔️ Ascension · synchronisation';
}

async function pousser(depot, nom) {
  for (let essai = 0; essai < 4; essai++) {
    const revision = revisions[nom] || 0;
    try {
      const { sha } = await depot.ecrire(nom, serialiser(nom), magasin.shas[nom], messageCommit(nom));
      magasin.shas[nom] = sha;
      if ((revisions[nom] || 0) === revision) {
        magasin.sales.delete(nom);
        delete magasin.annonces[nom];
      }
      sauver();
      return;
    } catch (e) {
      if (!(e instanceof ErreurDepot) || e.code !== 'conflit') throw e;
      // Un autre appareil a écrit entre-temps : on relit, on fusionne, on réessaie.
      let distant = null;
      try {
        distant = await depot.lireFichier(nom);
      } catch (e2) {
        if (!(e2 instanceof ErreurDepot) || e2.code !== 'introuvable') throw e2;
      }
      if (distant) integrer(nom, distant.texte, distant.sha);
      else delete magasin.shas[nom];
      marquerSale(nom);
      recalculer();
    }
  }
  throw new ErreurDepot('conflit', `Impossible d'enregistrer ${nom} : le fichier change sans arrêt. Nouvel essai à la prochaine synchronisation.`);
}

export async function synchroniser() {
  if (magasin.config.mode !== 'git') return;
  if (enCours) {
    aRefaire = true;
    return;
  }
  enCours = true;
  aRefaire = false;
  clearTimeout(minuterie);
  majSync('encours', { avertissement: magasin.sync.avertissement });
  let avertissement = '';
  try {
    const depot = new DepotGithub(magasin.config);
    const liste = await depot.lister();
    const distants = new Map(liste.map(f => [f.nom, f.sha]));

    for (const f of liste) {
      if (!(estSysteme(f.nom) || estNotre(f.nom)) || magasin.shas[f.nom] === f.sha) continue;
      const texte = await depot.lireBlob(f.sha);
      try {
        integrer(f.nom, texte, f.sha);
      } catch (e) {
        if (!(e instanceof ErreurDepot) || e.code !== 'json') throw e;
        avertissement = e.message;
        if (estNotre(f.nom)) magasin.sales.delete(f.nom); // on n'écrase pas un fichier qu'on n'a pas pu lire
      }
    }
    // Un de nos fichiers a disparu du dépôt : il sera recréé.
    for (const nom of Object.keys(magasin.shas)) {
      if (!distants.has(nom)) {
        delete magasin.shas[nom];
        if (estNotre(nom)) marquerSale(nom);
      }
    }
    if (!magasin.jeu) throw new ErreurDepot('introuvable', avertissement || 'jeu.json est absent du dossier des données : le Système doit le déposer.');

    recalculer();
    notifier();

    const aEnvoyer = [...magasin.sales].filter(estNotre).sort((a, b) => Number(a === NOM_ETAT) - Number(b === NOM_ETAT) || a.localeCompare(b));
    for (const nom of aEnvoyer) await pousser(depot, nom);

    magasin.sync.dernier = Date.now();
    sauver();
    majSync(avertissement ? 'erreur' : 'ok', { message: avertissement, code: avertissement ? 'json' : '', avertissement });
  } catch (e) {
    sauver();
    if (e instanceof ErreurDepot && e.code === 'reseau') majSync('horsligne', { message: e.message, code: e.code });
    else majSync('erreur', { message: e instanceof ErreurDepot ? e.message : `Erreur inattendue : ${e && e.message ? e.message : e}`, code: e instanceof ErreurDepot ? e.code : 'inconnu' });
  } finally {
    enCours = false;
    if (aRefaire || (magasin.sync.statut === 'ok' && [...magasin.sales].some(estNotre))) planifierSync(1500);
  }
}

export function enAttente() {
  return magasin.config.mode === 'git' ? [...magasin.sales].filter(estNotre).length : 0;
}

/* ───────────────────────── Connexion, démo, démarrage ───────────────────────── */

/** Vérifie les réglages de connexion, trouve le dossier des données si besoin, puis les enregistre. */
export async function connecter({ depot, jeton, dossier, branche, api }) {
  const d = new DepotGithub({ depot, jeton, dossier, branche, api });
  if (!/^[^/\s]+\/[^/\s]+$/.test(d.depot)) throw new ErreurDepot('saisie', 'Le dépôt s’écrit « propriétaire/nom », par exemple « moi/mon-depot ».');
  if (!d.jeton) throw new ErreurDepot('saisie', 'Colle ton jeton d’accès GitHub.');
  if (!d.dossier) d.dossier = await d.decouvrir();
  const liste = await d.lister();
  if (!liste.some(f => f.nom === 'jeu.json')) throw new ErreurDepot('introuvable', `Aucun jeu.json dans le dossier « ${d.dossier} ».`);

  const change = magasin.config.mode !== 'git' || magasin.config.depot !== d.depot || magasin.config.dossier !== d.dossier || magasin.config.api !== d.api;
  Object.assign(magasin.config, { mode: 'git', depot: d.depot, jeton: d.jeton, dossier: d.dossier, branche: d.branche, api: d.api });
  ecrire(CLE_CONFIG, magasin.config);
  if (change) {
    try {
      localStorage.removeItem(cleDonnees('git'));
    } catch (e) {
      /* rien */
    }
    delete vu.git;
  }
  charger();
  recalculer();
  notifier();
  await synchroniser();
  return d.dossier;
}

export function deconnecter() {
  try {
    localStorage.removeItem(cleDonnees('git'));
    localStorage.removeItem(cleDonnees('demo'));
  } catch (e) {
    /* rien */
  }
  vu = {};
  ecrire(CLE_VU, vu);
  magasin.config = { ...CONFIG_DEFAUT, sons: magasin.config.sons, animations: magasin.config.animations };
  ecrire(CLE_CONFIG, magasin.config);
  charger();
  magasin.calcul = null;
  magasin.sync = { statut: 'inactif', message: '', code: '', dernier: null, avertissement: '' };
  notifier();
}

function aleatoire(graine) {
  let s = graine >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mode démo : un jeu d'exemple, rangé à part, jamais synchronisé. */
export async function passerEnDemo({ neuf = false } = {}) {
  magasin.config.mode = 'demo';
  ecrire(CLE_CONFIG, magasin.config);
  if (neuf) {
    try {
      localStorage.removeItem(cleDonnees('demo'));
    } catch (e) {
      /* rien */
    }
    delete vu.demo;
  }
  charger();
  if (!magasin.jeuBrut) {
    const [jeu, arbre] = await Promise.all([fetch('demo/jeu.json').then(r => r.json()), fetch('demo/arbre.json').then(r => r.json())]);
    const jour = aujourdhui();
    const recul = Number(jeu.debutRelatif || -12);
    jeu.debut = M.ajouterJours(jour, recul);
    // Les semaines d'exemple (« S-1 », « S0 ») deviennent de vraies semaines.
    const hebdo = {};
    for (const [cle, liste] of Object.entries(jeu.hebdo || {})) {
      const decalage = Number(cle.replace('S', ''));
      hebdo[M.semaineIso(M.ajouterJours(M.lundiDe(jour), decalage * 7))] = liste;
    }
    jeu.hebdo = hebdo;
    const explorations = {};
    for (const [cle, liste] of Object.entries(jeu.explorations || {})) {
      const decalage = Number(cle.replace('S', ''));
      explorations[M.semaineIso(M.ajouterJours(M.lundiDe(jour), decalage * 7))] = liste;
    }
    jeu.explorations = explorations;
    (jeu.attributions || []).forEach(a => {
      a.le = M.ajouterJours(jour, Number(a.ilYA || 0) * -1);
      delete a.ilYA;
    });
    magasin.jeuBrut = jeu;
    magasin.jeu = M.normaliserJeu(jeu);
    magasin.arbre = arbre;
    magasin.etat = M.etatVide();
    magasin.journaux = {};

    // Un passé plausible : la plupart des quêtes faites, deux jours creux.
    const hasard = aleatoire(20261116);
    const t0 = horodatage() - 86400000 * 30;
    for (let d = jeu.debut; d < jour; d = M.ajouterJours(d, 1)) {
      const creux = M.ecartJours(jeu.debut, d) === 4;
      for (const q of M.quetesRegulieres(magasin.jeu, d)) {
        if (!creux && hasard() < 0.82) M.poserEntree(magasin.journaux, d, q.id, M.entreeFaite(q, t0));
      }
    }
    const toutes = [];
    for (let d = jeu.debut; d < jour; d = M.ajouterJours(d, 1)) toutes.push(d);
    M.reconcilierCoffres(magasin.jeu, magasin.journaux, M.chronologie(magasin.jeu, magasin.journaux, jour), toutes, t0);
    const semainePassee = M.semaineIso(M.ajouterJours(M.lundiDe(jour), -7));
    for (const q of magasin.jeu.hebdo[semainePassee] || []) {
      if (q.boss) continue;
      (magasin.etat.hebdo[semainePassee] || (magasin.etat.hebdo[semainePassee] = {}))[q.id] = M.entreeFaite(q, t0, { le: M.ajouterJours(M.lundiDe(jour), -2) });
    }
    const ouvert = magasin.jeu.donjons.find(x => x.statut === 'ouvert');
    if (ouvert && ouvert.etages[0]) {
      magasin.etat.donjons[ouvert.id] = { [ouvert.etages[0].id]: M.entreeFaite(ouvert.etages[0], t0, { le: M.ajouterJours(jour, -3) }) };
    }
    magasin.shas = {};
    magasin.sales = new Set();
    // Les succès du passé de démonstration sont inscrits sans être annoncés un par un.
    for (const s of calculer().succes) if (s.nouveau) magasin.etat.succes[s.id] = { le: jour, t: t0 };
  }
  recalculer();
  magasin.file = [];
  magasin.sync = { statut: 'demo', message: '', code: '', dernier: null, avertissement: '' };
  notifier();
}

/** Date simulée (tests et démo uniquement) : jamais avec le vrai GitHub. */
function lireSimulation() {
  const date = new URLSearchParams(location.search).get('date');
  const autorise = magasin.config.mode === 'demo' || (magasin.config.mode === 'git' && magasin.config.api !== API_GITHUB);
  return autorise && /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : null;
}

export async function demarrer() {
  magasin.simulation = lireSimulation();
  if (magasin.config.mode === 'demo') {
    await passerEnDemo();
  } else if (magasin.config.mode === 'git') {
    charger();
    recalculer();
    magasin.file = [];
    notifier();
    synchroniser();
  } else {
    notifier();
  }
}

/** À appeler quand l'appli revient au premier plan ou que le jour a pu changer. */
export function rafraichir() {
  if (!magasin.jeu) return;
  recalculer();
  notifier();
  planifierSync(300);
}

export function viderCacheLocal() {
  if (enAttente()) return false;
  try {
    localStorage.removeItem(cleDonnees(magasin.config.mode));
  } catch (e) {
    /* rien */
  }
  charger();
  magasin.calcul = null;
  notifier();
  if (magasin.config.mode === 'git') synchroniser();
  return true;
}
