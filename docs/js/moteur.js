/* Ascension — moteur de jeu.
 * Fonctions pures : aucun accès au DOM, au réseau ni au stockage.
 * Tout ce qui rapporte de l'XP est un « fait » daté, avec sa valeur figée
 * au moment où il est enregistré (x = XP, a = axe, n = intitulé).
 */

export const ORDRE_RANGS = ['E', 'D', 'C', 'B', 'A', 'S'];

export const AXES_DEFAUT = [
  { id: 'for', nom: 'Physique', stat: 'FOR', emoji: '💪' },
  { id: 'vit', nom: 'Vitalité', stat: 'VIT', emoji: '❤️' },
  { id: 'int', nom: 'Intelligence', stat: 'INT', emoji: '🧠' },
  { id: 'vol', nom: 'Mental', stat: 'VOL', emoji: '🧘' },
  { id: 'cha', nom: 'Social', stat: 'CHA', emoji: '🤝' },
  { id: 'dex', nom: 'Création', stat: 'DEX', emoji: '🎨' },
];

export const REGLES_DEFAUT = {
  courbe: { base: 10, exposant: 2.4 },
  xpRangs: { E: 10, D: 25, C: 50, B: 100, A: 250, S: 1000 },
  paliersRang: { E: 1, D: 10, C: 20, B: 30, A: 40, S: 50 },
  coffre: { xp: 15, axe: 'vol' },
  rattrapage: { rang: 'E' },
  survie: { joursRates: 3, joursReussis: 3, quete: 'rapport' },
  heureBascule: 4,
  joursModifiables: 7,
};

export const NIVEAUX_ARBRE = [
  { niveau: 0, icone: '⚪', nom: 'Disponible', etat: 'rien encore', xp: 0, exigence: '' },
  { niveau: 1, icone: '🌰', nom: 'Graine', etat: 'découvert', xp: 10, exigence: 'Une source consommée et liée à la note.' },
  { niveau: 2, icone: '🌱', nom: 'Pousse', etat: 'compris', xp: 25, exigence: 'Un résumé avec tes mots (définition + 3 points clés) ou un mini-quiz réussi 3/3.' },
  { niveau: 3, icone: '🌿', nom: 'Rameau', etat: 'appliqué', xp: 50, exigence: 'Une preuve d’usage réel : séance, partie, décision, exercice, projet.' },
  { niveau: 4, icone: '🌳', nom: 'Arbre', etat: 'maîtrisé', xp: 100, exigence: 'Un quiz de 5 questions réussi (≥ 4/5), sans relire, au moins 30 jours après le niveau 2.' },
  { niveau: 5, icone: '🍎', nom: 'Fruit', etat: 'transmis', xp: 250, exigence: 'Expliqué ou transmis : exposé, formation, article.' },
];

/* ───────────────────────── Dates (chaînes AAAA-MM-JJ) ───────────────────────── */

export function versDate(iso) {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, j));
}
export function versIso(d) {
  return d.toISOString().slice(0, 10);
}
export function ajouterJours(iso, n) {
  const d = versDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return versIso(d);
}
/** Nombre de jours de a vers b (positif si b est après a). */
export function ecartJours(a, b) {
  return Math.round((versDate(b) - versDate(a)) / 86400000);
}
/** 1 = lundi … 7 = dimanche. */
export function jourSemaine(iso) {
  const j = versDate(iso).getUTCDay();
  return j === 0 ? 7 : j;
}
export function lundiDe(iso) {
  return ajouterJours(iso, 1 - jourSemaine(iso));
}
/** Semaine ISO : « 2026-W47 ». */
export function semaineIso(iso) {
  const jeudi = versDate(ajouterJours(iso, 4 - jourSemaine(iso)));
  const premier = Date.UTC(jeudi.getUTCFullYear(), 0, 1);
  const n = Math.ceil(((jeudi - premier) / 86400000 + 1) / 7);
  return `${jeudi.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}
export function numeroSemaine(iso) {
  return Number(semaineIso(iso).slice(6));
}
export function moisDe(iso) {
  return iso.slice(0, 7);
}
/** Le « jour de jeu » : la journée ne bascule qu'à l'heure indiquée (4 h par défaut),
 *  pour qu'un rapport du soir coché à 0 h 30 compte pour la veille. */
export function jourDeJeu(maintenant = new Date(), heureBascule = 4) {
  const d = new Date(maintenant.getTime() - heureBascule * 3600000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ───────────────────────── Niveaux et rangs ───────────────────────── */

/** XP cumulée pour atteindre un niveau. diviseur = 6 pour un axe. */
export function seuilNiveau(regles, niveau, diviseur = 1) {
  const { base, exposant } = regles.courbe;
  return Math.round((base * Math.pow(Math.max(0, niveau - 1), exposant)) / diviseur);
}
export function niveauPour(regles, xp, diviseur = 1) {
  let n = 1;
  while (n < 999 && seuilNiveau(regles, n + 1, diviseur) <= xp) n++;
  return n;
}
export function rangPour(regles, niveau) {
  let rang = 'E';
  for (const r of ORDRE_RANGS) if (niveau >= regles.paliersRang[r]) rang = r;
  return rang;
}
export function rangSuivant(regles, niveau) {
  const i = ORDRE_RANGS.indexOf(rangPour(regles, niveau));
  if (i < 0 || i >= ORDRE_RANGS.length - 1) return null;
  const rang = ORDRE_RANGS[i + 1];
  return { rang, niveau: regles.paliersRang[rang], xp: seuilNiveau(regles, regles.paliersRang[rang]) };
}
export function progression(regles, xp, diviseur = 1) {
  const niveau = niveauPour(regles, xp, diviseur);
  const bas = seuilNiveau(regles, niveau, diviseur);
  const haut = seuilNiveau(regles, niveau + 1, diviseur);
  const requis = Math.max(1, haut - bas);
  return { xp, niveau, bas, haut, ratio: Math.min(1, Math.max(0, (xp - bas) / requis)) };
}

/* ───────────────────────── Configuration du jeu ───────────────────────── */

function fusionRegles(defaut, propres) {
  const r = {};
  for (const [cle, val] of Object.entries(defaut)) {
    const p = propres ? propres[cle] : undefined;
    if (val && typeof val === 'object' && !Array.isArray(val)) r[cle] = { ...val, ...(p && typeof p === 'object' ? p : {}) };
    else r[cle] = p === undefined || p === null ? val : p;
  }
  return r;
}

/** Complète un jeu.json avec les valeurs par défaut et calcule l'XP de chaque quête d'après son rang. */
export function normaliserJeu(brut) {
  const jeu = brut && typeof brut === 'object' ? brut : {};
  const regles = fusionRegles(REGLES_DEFAUT, jeu.regles);
  const axes = Array.isArray(jeu.axes) && jeu.axes.length ? jeu.axes : AXES_DEFAUT;
  const quete = q => ({ ...q, xp: Number.isFinite(q.xp) ? q.xp : regles.xpRangs[q.rang] ?? 0 });
  return {
    format: jeu.format || '',
    nom: jeu.nom || 'Ascension',
    debut: jeu.debut || null,
    maj: jeu.maj || null,
    annonce: jeu.annonce || null,
    regles,
    axes,
    quotidiennes: (jeu.quotidiennes || []).map(quete),
    tournantes: (jeu.tournantes || []).map(quete),
    hebdo: Object.fromEntries(Object.entries(jeu.hebdo || {}).map(([s, l]) => [s, (l || []).map(quete)])),
    donjons: (jeu.donjons || []).map(d => ({ ...d, etages: (d.etages || []).map(quete) })),
    attributions: Array.isArray(jeu.attributions) ? jeu.attributions : [],
    succes: Array.isArray(jeu.succes) ? jeu.succes : [],
  };
}

export function validerJeu(brut) {
  if (!brut || typeof brut !== 'object') return 'jeu.json est vide ou illisible.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(brut.debut || '')) return 'jeu.json : la date « debut » (AAAA-MM-JJ) manque.';
  if (!Array.isArray(brut.quotidiennes) || !brut.quotidiennes.length) return 'jeu.json : aucune quête quotidienne.';
  for (const q of [...brut.quotidiennes, ...(brut.tournantes || [])]) {
    if (!q.id || !q.titre || !q.axe) return `jeu.json : une quête n'a pas d'« id », de « titre » ou d'« axe » (${q.titre || q.id || '?'}).`;
  }
  return null;
}

export function axeDe(jeu, id) {
  return jeu.axes.find(a => a.id === id) || { id, nom: id || '—', stat: (id || '?').toUpperCase(), emoji: '◆' };
}

const enVigueur = (q, date) => (!q.depuis || q.depuis <= date) && (!q.jusqua || date <= q.jusqua);

/** Les quotidiennes « normales » d'une date : les fixes + la tournante du jour. */
export function quetesRegulieres(jeu, date) {
  const jour = jourSemaine(date);
  return [
    ...jeu.quotidiennes.filter(q => enVigueur(q, date)).map(q => ({ ...q, type: 'fixe' })),
    ...jeu.tournantes.filter(q => q.jour === jour && enVigueur(q, date)).map(q => ({ ...q, type: 'tournante' })),
  ];
}

/* ───────────────────────── Documents : journal et état ───────────────────────── */

export function journalVide(mois) {
  return { format: 'ascension/journal@1', mois, jours: {} };
}
export function etatVide() {
  return { format: 'ascension/etat@1', hebdo: {}, donjons: {}, succes: {}, resume: null };
}
export const estFaite = e => !!e && e.f === 1;

export function entreesDuJour(journaux, date) {
  const doc = journaux[moisDe(date)];
  return (doc && doc.jours && doc.jours[date]) || {};
}
/** Écrit une entrée dans le journal du mois (créé au besoin). Renvoie le mois touché. */
export function poserEntree(journaux, date, id, entree) {
  const mois = moisDe(date);
  const doc = journaux[mois] || (journaux[mois] = journalVide(mois));
  if (!doc.jours) doc.jours = {};
  const jour = doc.jours[date] || (doc.jours[date] = {});
  jour[id] = entree;
  return mois;
}
export const entreeFaite = (quete, t, extra) => ({ f: 1, t, x: quete.xp, a: quete.axe, n: quete.titre, ...(extra || {}) });
export const entreeAnnulee = t => ({ f: 0, t });

/* Fusion entre appareils : pour chaque quête de chaque jour, la saisie la plus récente gagne. */
function plusRecente(a, b) {
  if (!a) return b;
  if (!b) return a;
  const ta = a.t || 0;
  const tb = b.t || 0;
  if (ta !== tb) return tb > ta ? b : a;
  return (b.f || 0) > (a.f || 0) ? b : a;
}
function fusionCartes(a = {}, b = {}) {
  const r = {};
  for (const cle of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) r[cle] = plusRecente(a[cle], b[cle]);
  return r;
}
export function fusionnerJournal(local, distant) {
  if (!local) return distant;
  if (!distant) return local;
  const jours = {};
  const dates = [...new Set([...Object.keys(local.jours || {}), ...Object.keys(distant.jours || {})])].sort();
  for (const d of dates) jours[d] = fusionCartes((local.jours || {})[d], (distant.jours || {})[d]);
  return { format: distant.format || local.format, mois: distant.mois || local.mois, jours };
}
export function fusionnerEtat(local, distant) {
  if (!local) return distant;
  if (!distant) return local;
  const groupes = (a = {}, b = {}) => {
    const r = {};
    for (const cle of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) r[cle] = fusionCartes(a[cle], b[cle]);
    return r;
  };
  const succes = {};
  for (const id of new Set([...Object.keys(local.succes || {}), ...Object.keys(distant.succes || {})])) {
    const a = (local.succes || {})[id];
    const b = (distant.succes || {})[id];
    succes[id] = !a ? b : !b ? a : (b.le || '') < (a.le || '') ? b : a; // la date la plus ancienne reste
  }
  return {
    format: distant.format || local.format,
    hebdo: groupes(local.hebdo, distant.hebdo),
    donjons: groupes(local.donjons, distant.donjons),
    succes,
    resume: local.resume || distant.resume || null,
  };
}

/* ───────────────────────── Chronologie jour par jour ───────────────────────── */

/** Reconstitue chaque jour depuis le début : quêtes proposées, rattrapages, mode survie, coffre. */
export function chronologie(jeu, journaux, jusqua) {
  const jours = new Map();
  if (!jeu.debut || !jusqua || jusqua < jeu.debut) return jours;
  const { survie: rs, rattrapage, coffre: rc, xpRangs } = jeu.regles;
  let survie = false;
  let rates = 0;
  let reussis = 0;
  let precedent = null;

  for (let d = jeu.debut; d <= jusqua; d = ajouterJours(d, 1)) {
    const entrees = entreesDuJour(journaux, d);
    const regulieres = quetesRegulieres(jeu, d);
    let quetes = regulieres;
    let bonus = [];
    const rattrapages = [];

    if (survie) {
      const garde = regulieres.find(q => q.id === rs.quete) || regulieres[0];
      quetes = garde ? [{ ...garde, type: 'survie' }] : [];
      bonus = regulieres.filter(q => q !== garde).map(q => ({ ...q, type: 'bonus' }));
    } else if (precedent && !precedent.survie) {
      const axesVus = new Set();
      for (const q of precedent.quetes) {
        if (q.faite || axesVus.has(q.axe)) continue;
        axesVus.add(q.axe);
        rattrapages.push({
          id: `rattrapage-${q.axe}`,
          type: 'rattrapage',
          axe: q.axe,
          rang: rattrapage.rang,
          xp: xpRangs[rattrapage.rang] ?? 10,
          titre: `Rattrapage — ${axeDe(jeu, q.axe).nom}`,
          detail: `10 minutes de plus sur cet axe. Hier, « ${q.titre} » n'a pas été accomplie.`,
          origine: q.titre,
        });
      }
    }

    const marquer = q => ({ ...q, faite: estFaite(entrees[q.id]), entree: entrees[q.id] || null });
    quetes = quetes.map(marquer);
    bonus = bonus.map(marquer);
    const rattr = rattrapages.map(marquer);
    const connus = new Set(['coffre', ...quetes.map(q => q.id), ...bonus.map(q => q.id), ...rattr.map(q => q.id)]);
    const archives = Object.entries(entrees)
      .filter(([id, e]) => estFaite(e) && !connus.has(id))
      .map(([id, e]) => ({ id, type: 'archive', titre: e.n || id, axe: e.a, xp: e.x || 0, rang: null, faite: true, entree: e }));

    const faites = quetes.filter(q => q.faite).length;
    const actif = [...quetes, ...bonus, ...rattr, ...archives].some(q => q.faite);
    const coffrePossible = !survie && quetes.length > 0;
    const xp = Object.values(entrees).reduce((s, e) => s + (estFaite(e) ? e.x || 0 : 0), 0);

    const jour = {
      date: d,
      survie,
      survieJour: survie ? reussis + 1 : 0, // « jour n sur 3 » pour sortir du mode survie
      quetes,
      rattrapages: rattr,
      bonus,
      archives,
      faites,
      total: quetes.length,
      actif,
      coffrePossible,
      coffreMerite: coffrePossible && faites === quetes.length,
      coffre: estFaite(entrees.coffre),
      coffreXp: rc.xp,
      xp,
    };
    jours.set(d, jour);

    if (!survie) {
      rates = actif ? 0 : rates + 1;
      if (rates >= rs.joursRates) {
        survie = true;
        reussis = 0;
      }
    } else {
      reussis = actif ? reussis + 1 : 0;
      if (reussis >= rs.joursReussis) {
        survie = false;
        rates = 0;
        jour.sortieSurvie = true;
      }
    }
    precedent = jour;
  }
  return jours;
}

/** Aperçu d'un jour futur (ou d'avant le début) : seulement les quêtes normales, non cochables. */
export function apercuJour(jeu, date) {
  return quetesRegulieres(jeu, date).map(q => ({ ...q, faite: false, entree: null, apercu: true }));
}

/** Aligne l'entrée « coffre » des jours donnés sur les quêtes réellement faites. Renvoie les mois modifiés. */
export function reconcilierCoffres(jeu, journaux, jours, dates, t) {
  const touches = new Set();
  const { coffre } = jeu.regles;
  for (const date of dates) {
    const j = jours.get(date);
    if (!j) continue;
    if (j.coffreMerite && !j.coffre) {
      touches.add(poserEntree(journaux, date, 'coffre', { f: 1, t, x: coffre.xp, a: coffre.axe, n: 'Coffre du jour' }));
    } else if (!j.coffreMerite && j.coffre) {
      touches.add(poserEntree(journaux, date, 'coffre', entreeAnnulee(t)));
    }
  }
  return [...touches];
}

/* ───────────────────────── XP : tous les faits ───────────────────────── */

export function tousLesFaits(jeu, journaux, etat) {
  const faits = [];
  for (const doc of Object.values(journaux)) {
    for (const [date, entrees] of Object.entries((doc && doc.jours) || {})) {
      for (const [id, e] of Object.entries(entrees || {})) {
        if (!estFaite(e)) continue;
        const type = id === 'coffre' ? 'coffre' : id.startsWith('rattrapage-') ? 'rattrapage' : 'quotidienne';
        faits.push({ le: date, t: e.t || 0, type, id, titre: e.n || id, axe: e.a || null, xp: e.x || 0 });
      }
    }
  }
  for (const [semaine, quetes] of Object.entries((etat && etat.hebdo) || {})) {
    for (const [id, e] of Object.entries(quetes || {})) {
      if (estFaite(e)) faits.push({ le: e.le || '', t: e.t || 0, type: 'hebdo', id, semaine, titre: e.n || id, axe: e.a || null, xp: e.x || 0, boss: !!e.boss });
    }
  }
  for (const [donjon, etages] of Object.entries((etat && etat.donjons) || {})) {
    for (const [id, e] of Object.entries(etages || {})) {
      if (estFaite(e)) faits.push({ le: e.le || '', t: e.t || 0, type: 'donjon', id, donjon, titre: e.n || id, axe: e.a || null, xp: e.x || 0, boss: !!e.boss });
    }
  }
  jeu.attributions.forEach((a, i) => {
    if (!a || !Number.isFinite(a.xp)) return;
    faits.push({ le: a.le || jeu.debut || '', t: i, type: a.type || 'systeme', id: `attribution-${i}`, titre: a.motif || 'Attribution du Système', axe: a.axe || null, xp: a.xp });
  });
  faits.sort((a, b) => (a.le < b.le ? -1 : a.le > b.le ? 1 : a.t - b.t));
  return faits;
}

/* ───────────────────────── Succès cachés ───────────────────────── */

export const SUCCES = [
  { id: 'premier-pas', titre: 'Premier pas', texte: 'Une première quête accomplie.', test: c => c.quetes >= 1 },
  { id: 'premier-coffre', titre: 'Butin du jour', texte: 'Un premier coffre ouvert.', test: c => c.coffres >= 1 },
  { id: 'serie-3', titre: 'Trois jours debout', texte: 'Trois jours de suite avec au moins une quête.', test: c => c.serieRecord >= 3 },
  { id: 'serie-7', titre: 'Semaine sans faille', texte: 'Sept jours de suite avec au moins une quête.', test: c => c.serieRecord >= 7 },
  { id: 'serie-30', titre: 'Trente jours sans mode survie', texte: 'Trente jours d’affilée sans que le mode survie se déclenche.', test: c => c.sansSurvieRecord >= 30 },
  { id: 'coffres-7', titre: 'Sept coffres d’affilée', texte: 'Une semaine complète de journées parfaites.', test: c => c.serieCoffresRecord >= 7 },
  { id: 'dette-reglee', titre: 'Dette réglée', texte: 'Une première quête de rattrapage accomplie.', test: c => c.rattrapages >= 1 },
  { id: 'revenu-de-loin', titre: 'Revenu de loin', texte: 'Sorti du mode survie.', test: c => c.sortiesSurvie >= 1 },
  { id: 'semaine-pleine', titre: 'Semaine pleine', texte: 'Toutes les quêtes hebdomadaires d’une même semaine.', test: c => c.semainesPleines >= 1 },
  { id: 'cent-quetes', titre: 'Centurion', texte: 'Cent quêtes accomplies.', test: c => c.quetes >= 100 },
  { id: 'niveau-5', titre: 'Cinquième palier', texte: 'Niveau 5 atteint.', test: c => c.niveau >= 5 },
  { id: 'equilibre', titre: 'Équilibre', texte: 'Les six axes au niveau 3 ou plus.', test: c => c.axeMin >= 3 },
  { id: 'rang-d', titre: 'Rang D', texte: 'Niveau 10 atteint : le rang E est derrière toi.', test: c => c.niveau >= c.paliers.D },
  { id: 'rang-c', titre: 'Rang C', texte: 'Niveau 20 atteint.', test: c => c.niveau >= c.paliers.C },
  { id: 'rang-b', titre: 'Rang B', texte: 'Niveau 30 atteint.', test: c => c.niveau >= c.paliers.B },
  { id: 'rang-a', titre: 'Rang A', texte: 'Niveau 40 atteint.', test: c => c.niveau >= c.paliers.A },
  { id: 'rang-s', titre: 'Rang S', texte: 'Niveau 50 atteint. Le sommet.', test: c => c.niveau >= c.paliers.S },
  { id: 'premier-etage', titre: 'Premier étage', texte: 'Un premier étage de donjon franchi.', test: c => c.etages >= 1 },
  { id: 'tombeur-de-boss', titre: 'Tombeur de boss', texte: 'Un premier boss de donjon vaincu.', test: c => c.boss >= 1 },
  { id: 'dix-arbres', titre: 'Dix nœuds au niveau Arbre', texte: 'Dix nœuds maîtrisés dans l’Arbre de la connaissance.', test: c => c.noeudsMaitrises >= 10 },
];

/* ───────────────────────── Calcul d'ensemble ───────────────────────── */

export function resumeSemaine(jeu, jours, faits, etat, lundi) {
  const semaine = semaineIso(lundi);
  const dimanche = ajouterJours(lundi, 6);
  let faites = 0;
  let total = 0;
  let coffres = 0;
  for (let i = 0; i < 7; i++) {
    const j = jours.get(ajouterJours(lundi, i));
    if (!j) continue;
    faites += j.faites;
    total += j.total;
    if (j.coffre) coffres++;
  }
  const xp = Object.fromEntries(jeu.axes.map(a => [a.id, 0]));
  let xpTotal = 0;
  for (const f of faits) {
    if (f.le < lundi || f.le > dimanche) continue;
    if (f.axe in xp) xp[f.axe] += f.xp;
    xpTotal += f.xp;
  }
  const liste = jeu.hebdo[semaine] || [];
  const faitesHebdo = (etat && etat.hebdo && etat.hebdo[semaine]) || {};
  const hebdo = liste.map(q => ({ ...q, faite: estFaite(faitesHebdo[q.id]), entree: faitesHebdo[q.id] || null }));
  return { semaine, lundi, dimanche, faites, total, coffres, xp, xpTotal, hebdo, hebdoFaites: hebdo.filter(q => q.faite).length };
}

/** Le calcul complet : tout ce que l'interface affiche découle de ce résultat. */
export function calculer({ jeu, journaux, etat, arbre, aujourdhui }) {
  const regles = jeu.regles;
  const commence = !!jeu.debut && aujourdhui >= jeu.debut;
  const jours = chronologie(jeu, journaux, aujourdhui);
  const faits = tousLesFaits(jeu, journaux, etat);

  // XP par axe et total
  const axesXp = Object.fromEntries(jeu.axes.map(a => [a.id, 0]));
  let xp = 0;
  const paliers = [];
  let niveauCourant = 1;
  for (const f of faits) {
    if (f.axe in axesXp) axesXp[f.axe] += f.xp;
    xp += f.xp;
    const n = niveauPour(regles, xp);
    if (n > niveauCourant) {
      paliers.push({ le: f.le, niveau: n, rang: rangPour(regles, n), rangAvant: rangPour(regles, niveauCourant) });
      niveauCourant = n;
    }
  }
  const global = progression(regles, xp);
  const axes = jeu.axes.map(a => ({ ...a, ...progression(regles, axesXp[a.id], 6) }));

  // Séries
  let serie = 0;
  let serieRecord = 0;
  let serieCoffres = 0;
  let serieCoffresRecord = 0;
  let sansSurvie = 0;
  let sansSurvieRecord = 0;
  let sortiesSurvie = 0;
  let coffres = 0;
  let joursActifs = 0;
  for (const j of jours.values()) {
    const enCours = j.date === aujourdhui;
    if (j.actif) serie++;
    else if (!enCours) serie = 0;
    serieRecord = Math.max(serieRecord, serie);
    if (j.coffre) serieCoffres++;
    else if (!enCours) serieCoffres = 0;
    serieCoffresRecord = Math.max(serieCoffresRecord, serieCoffres);
    sansSurvie = j.survie ? 0 : sansSurvie + 1;
    sansSurvieRecord = Math.max(sansSurvieRecord, sansSurvie);
    if (j.sortieSurvie) sortiesSurvie++;
    if (j.coffre) coffres++;
    if (j.actif) joursActifs++;
  }

  const quetes = faits.filter(f => f.type === 'quotidienne' || f.type === 'rattrapage' || f.type === 'hebdo').length;
  const rattrapages = faits.filter(f => f.type === 'rattrapage').length;
  const etages = faits.filter(f => f.type === 'donjon').length;
  const boss = faits.filter(f => f.type === 'donjon' && f.boss).length;

  let semainesPleines = 0;
  for (const [semaine, liste] of Object.entries(jeu.hebdo)) {
    const obligatoires = liste.filter(q => !q.boss);
    const f = (etat && etat.hebdo && etat.hebdo[semaine]) || {};
    if (obligatoires.length && obligatoires.every(q => estFaite(f[q.id]))) semainesPleines++;
  }
  const noeuds = (arbre && arbre.noeuds) || [];
  const noeudsMaitrises = noeuds.filter(n => (n.maitrise || 0) >= 4).length;

  const compteurs = {
    quetes,
    coffres,
    rattrapages,
    etages,
    boss,
    joursActifs,
    joursJoues: jours.size,
    serie,
    serieRecord,
    serieCoffres,
    serieCoffresRecord,
    sansSurvie,
    sansSurvieRecord,
    sortiesSurvie,
    semainesPleines,
    noeudsMaitrises,
    niveau: global.niveau,
    axeMin: Math.min(...axes.map(a => a.niveau)),
    paliers: regles.paliersRang,
  };

  // Succès : ceux déjà inscrits dans l'état restent acquis ; les autres se débloquent quand leur condition est vraie.
  const inscrits = (etat && etat.succes) || {};
  const succes = SUCCES.map(s => {
    const acquis = inscrits[s.id];
    const vrai = commence && s.test(compteurs);
    return { id: s.id, titre: s.titre, texte: s.texte, obtenu: acquis ? acquis.le || aujourdhui : vrai ? aujourdhui : null, nouveau: !acquis && vrai };
  });
  for (const s of jeu.succes) {
    if (s && s.id && s.titre) succes.push({ id: `systeme-${s.id}`, titre: s.titre, texte: s.texte || s.description || '', obtenu: s.le || aujourdhui, nouveau: false, systeme: true });
  }

  const jourCourant = jours.get(aujourdhui) || null;
  const lundi = lundiDe(aujourdhui);
  return {
    aujourdhui,
    commence,
    joursAvantDebut: jeu.debut && !commence ? ecartJours(aujourdhui, jeu.debut) : 0,
    jours,
    jour: jourCourant,
    faits,
    paliers,
    xp,
    niveau: global.niveau,
    rang: rangPour(regles, global.niveau),
    rangSuivant: rangSuivant(regles, global.niveau),
    global,
    axes,
    compteurs,
    survie: !!(jourCourant && jourCourant.survie),
    succes,
    semaine: resumeSemaine(jeu, jours, faits, etat, lundi),
    semainePrecedente: jeu.debut && ajouterJours(lundi, -1) >= jeu.debut ? resumeSemaine(jeu, jours, faits, etat, ajouterJours(lundi, -7)) : null,
  };
}

/** Résumé écrit dans etat.json : ce que le Système (Claude) lit pour le bilan du dimanche. */
export function construireResume(jeu, calcul) {
  const s = sem =>
    sem && {
      id: sem.semaine,
      quotidiennes: `${sem.faites}/${sem.total}`,
      coffres: sem.coffres,
      hebdo: `${sem.hebdoFaites}/${sem.hebdo.length}`,
      xp: { ...sem.xp, total: sem.xpTotal },
    };
  const j = calcul.jour;
  return {
    jour: calcul.aujourdhui,
    niveau: calcul.niveau,
    rang: calcul.rang,
    xp: calcul.xp,
    xpNiveauSuivant: calcul.global.haut,
    axes: Object.fromEntries(calcul.axes.map(a => [a.id, { xp: a.xp, niveau: a.niveau, suivant: a.haut }])),
    serie: calcul.compteurs.serie,
    serieRecord: calcul.compteurs.serieRecord,
    coffres: calcul.compteurs.coffres,
    quetes: calcul.compteurs.quetes,
    modeSurvie: calcul.survie,
    rattrapagesDuJour: j ? j.rattrapages.map(r => r.axe) : [],
    succes: calcul.succes.filter(x => x.obtenu).map(x => x.titre),
    semaine: s(calcul.semaine),
    semainePrecedente: s(calcul.semainePrecedente),
  };
}

/** Jours encore modifiables : aujourd'hui et les jours précédents, dans la limite fixée par les règles. */
export function estModifiable(jeu, date, aujourdhui) {
  if (!jeu.debut || date < jeu.debut || date > aujourdhui) return false;
  return ecartJours(date, aujourdhui) < jeu.regles.joursModifiables;
}
