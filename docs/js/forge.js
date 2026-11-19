/* Ascension — la Forge : composition des séances de renforcement, de gainage et d'étirements, et carnet d'entraînement.
 * Fonctions pures : aucun accès au DOM, au réseau ni au stockage. */
import { EXERCICES, PAR_ID } from './exercices.js';

export const TYPES = [
  { id: 'complet', nom: 'Renforcement complet', emoji: '💪', muscu: true },
  { id: 'haut', nom: 'Haut du corps', emoji: '🦾', muscu: true },
  { id: 'bas', nom: 'Bas du corps', emoji: '🦵', muscu: true },
  { id: 'gainage', nom: 'Gainage et dos', emoji: '🧱' },
  { id: 'etirements', nom: 'Étirements et mobilité', emoji: '🧘' },
];
export const OBJECTIFS = [
  { id: 'muscle', nom: 'Volume', detail: '8 à 12 répétitions', series: 3, reps: [8, 12], repos: 90 },
  { id: 'force', nom: 'Force', detail: '4 à 6 répétitions, lourd', series: 4, reps: [4, 6], repos: 150 },
  { id: 'endurance', nom: 'Tonus', detail: '15 à 20 répétitions', series: 3, reps: [15, 20], repos: 45 },
];
export const DUREES = [15, 30, 45, 60];
export const typeDe = id => TYPES.find(t => t.id === id) || TYPES[0];
export const objectifDe = id => OBJECTIFS.find(o => o.id === id) || OBJECTIFS[0];

/** L'ordre des cases à remplir pour chaque type de séance (les étirements visent des zones). */
const MODELES = {
  complet: ['squat', 'pousser_h', 'charniere', 'tirer_h', 'pousser_v', 'fente', 'tirer_v', 'gainage', 'epaules', 'biceps', 'triceps', 'mollet', 'gainage_lat'],
  haut: ['pousser_h', 'tirer_v', 'pousser_v', 'tirer_h', 'dips', 'epaules', 'biceps', 'triceps', 'posture', 'pecto_iso', 'gainage'],
  bas: ['squat', 'charniere', 'fente', 'ischio', 'fessier', 'quad', 'mollet', 'gainage', 'gainage_lat'],
  gainage: ['gainage', 'lombaires', 'gainage_lat', 'posture', 'gainage', 'rotation', 'lombaires', 'tirer_h', 'gainage_lat', 'decompression'],
  etirements: ['ischios', 'hanches', 'dos', 'pectoraux', 'quadriceps', 'fessiers', 'epaules', 'thoracique', 'mollets', 'lombaires', 'adducteurs', 'cou'],
};
const RETOUR_AU_CALME = { complet: ['ischios', 'pectoraux'], haut: ['pectoraux', 'epaules'], bas: ['quadriceps', 'fessiers'], gainage: ['dos', 'hanches'] };
const PREFERENCE_MATERIEL = { salle: 4, halteres: 3, chaise: 3, elastique: 2, corps: 1 };

/** Le matériel réellement utilisable : le poids du corps toujours ; une salle a aussi des haltères et une station de dips. */
export function disponible(materiel) {
  const d = new Set(['corps', ...(materiel || [])]);
  if (d.has('salle')) ['halteres', 'chaise'].forEach(m => d.add(m));
  return d;
}

export function hasard(graine) {
  let s = graine >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Séries, répétitions (ou secondes) et repos d'un exercice dans une séance. */
export function prescription(ex, type, objectif) {
  if (ex.motif === 'echauffement') return { series: 1, secs: ex.uni ? 30 : 45, repos: 0 };
  if (ex.motif === 'etirement') return { series: 2, secs: ex.uni ? 30 : 45, repos: 10 };
  if (ex.mode === 'temps') return { series: 3, secs: type === 'gainage' ? 40 : 30, repos: 45 };
  if (type === 'gainage') return { series: 3, reps: [10, 15], repos: 45 };
  const o = objectifDe(objectif);
  if (o.id === 'endurance') return { series: 3, reps: [15, 20], repos: 45 };
  if (!ex.charge) return { series: 3, reps: o.id === 'force' ? [6, 10] : [10, 15], repos: o.id === 'force' ? 120 : 75 };
  if (!ex.base) return { series: 3, reps: o.id === 'force' ? [8, 10] : [10, 15], repos: o.id === 'force' ? 90 : 60 };
  return { series: o.series, reps: o.reps, repos: o.repos };
}

/** Durée estimée d'un exercice, en secondes. */
export function dureeEstimee(ex, cible) {
  const cotes = ex.uni ? 2 : 1;
  const travail = cible.secs ? cible.secs * cotes : (cible.reps ? cible.reps[1] : 10) * 3 * cotes;
  const transition = ex.motif === 'etirement' || ex.motif === 'echauffement' ? 10 : 45;
  return cible.series * (travail + cible.repos) + transition;
}
export const dureePlan = plan => plan.reduce((n, p) => n + dureeEstimee(PAR_ID.get(p.id) || {}, p.cible), 0);

function candidats(cle, dispo, deja, etirement) {
  return EXERCICES.filter(e => dispo.has(e.mat) && !deja.has(e.id) && (etirement ? e.motif === 'etirement' && e.etire === cle : e.motif === cle));
}

/** Les exercices déjà faits récemment pèsent plus : refaire les mêmes, c'est pouvoir progresser. */
function poids(ex, type, recents) {
  const p = TYPES.find(t => t.id === type && t.muscu) ? PREFERENCE_MATERIEL[ex.mat] || 1 : 1;
  return p * (recents.has(ex.id) ? 1.6 : 1);
}

function tirer(liste, type, recents, alea) {
  const total = liste.reduce((n, e) => n + poids(e, type, recents), 0);
  let r = alea() * total;
  for (const e of liste) {
    r -= poids(e, type, recents);
    if (r <= 0) return e;
  }
  return liste[liste.length - 1];
}

const entree = (ex, role, type, objectif) => ({ id: ex.id, role, cible: prescription(ex, type, objectif) });

/** Compose une séance : échauffement, cases du modèle tant que le temps le permet, retour au calme.
 *  seances = le carnet (pour privilégier les exercices récents). */
export function composer({ type, objectif, materiel, duree, seances = [], graine = 1 }) {
  const t = typeDe(type).id;
  const dispo = disponible(materiel);
  const alea = hasard(graine);
  const budget = (duree || 30) * 60;
  const recents = new Set(seances.slice(0, 6).flatMap(s => (s.exercices || []).map(e => e.id)));
  const deja = new Set();
  const plan = [];
  const ajouter = (ex, role) => {
    deja.add(ex.id);
    const e = entree(ex, role, t, objectif);
    plan.push(e);
    return e;
  };

  const echauffement = t !== 'etirements' && duree >= 30;
  if (echauffement) {
    for (let i = 0; i < 3; i++) {
      const c = candidats('echauffement', dispo, deja, false);
      if (c.length) ajouter(c[Math.floor(alea() * c.length)], 'echauffement');
    }
  }
  const calme = t !== 'etirements' && duree >= 45 ? RETOUR_AU_CALME[t] : [];
  const reserve = calme.length * 100;

  const etirement = t === 'etirements';
  for (const cle of MODELES[t]) {
    let c = candidats(cle, dispo, deja, etirement);
    if (typeDe(t).muscu) {
      // En musculation, le matériel passe avant le poids du corps, et le sauté reste pour le tonus.
      if (objectif !== 'endurance') c = c.filter(e => !e.explosif);
      if (c.some(e => e.mat !== 'corps')) c = c.filter(e => e.mat !== 'corps');
    }
    if (!c.length) continue;
    const ex = tirer(c, t, recents, alea);
    const cible = prescription(ex, t, objectif);
    const principaux = plan.filter(p => p.role === 'principal').length;
    if (principaux >= 3 && dureePlan(plan) + dureeEstimee(ex, cible) + reserve > budget) continue;
    ajouter(ex, 'principal');
  }
  for (const cle of calme) {
    const c = candidats(cle, dispo, deja, true);
    if (c.length) ajouter(c[Math.floor(alea() * c.length)], 'calme');
  }
  // Du temps en trop : une série de plus sur les premiers exercices.
  const principaux = plan.filter(p => p.role === 'principal');
  for (let tour = 0; tour < 2; tour++) {
    for (const p of principaux) {
      const ex = PAR_ID.get(p.id);
      const plus = dureeEstimee(ex, { ...p.cible, series: 1 });
      if (p.cible.series < 5 && dureePlan(plan) + plus <= budget) p.cible = { ...p.cible, series: p.cible.series + 1 };
    }
  }
  return plan;
}

/** Remplace l'exercice n° i par le suivant possible sur la même case (null s'il n'y en a pas d'autre). */
export function remplacer(plan, i, { type, objectif, materiel }) {
  const actuel = PAR_ID.get(plan[i].id);
  if (!actuel) return null;
  const dispo = disponible(materiel);
  const autres = new Set(plan.filter((_, k) => k !== i).map(p => p.id));
  const etirement = actuel.motif === 'etirement';
  const liste = EXERCICES.filter(e => dispo.has(e.mat) && !autres.has(e.id) && (etirement ? e.motif === 'etirement' && e.etire === actuel.etire : e.motif === actuel.motif));
  if (liste.length < 2) return null;
  const suivant = liste[(liste.findIndex(e => e.id === actuel.id) + 1) % liste.length];
  const copie = plan.slice();
  copie[i] = entree(suivant, plan[i].role, typeDe(type).id, objectif);
  return copie;
}

/* ───────────────────────── Carnet ───────────────────────── */

/** Toutes les séances du carnet (sans les supprimées), de la plus récente à la plus ancienne. */
export function carnet(entrainements) {
  const liste = [];
  for (const doc of Object.values(entrainements || {})) {
    for (const s of Object.values((doc && doc.seances) || {})) if (s && !s.supprimee) liste.push(s);
  }
  return liste.sort((a, b) => (b.debut || 0) - (a.debut || 0));
}

export const estimation1RM = (kg, r) => (kg > 0 && r > 0 ? kg * (1 + Math.min(r, 15) / 30) : 0);
export const volume = s => (s.exercices || []).reduce((n, e) => n + (e.series || []).reduce((m, x) => m + (x.kg || 0) * (x.r || 0), 0), 0);
export const nbSeries = s => (s.exercices || []).reduce((n, e) => n + (e.series || []).length, 0);

/** La dernière fois qu'un exercice a été fait : { date, series } ou null. */
export function derniereFois(seances, id) {
  for (const s of seances) {
    const e = (s.exercices || []).find(x => x.id === id);
    if (e && e.series && e.series.length) return { date: s.date, series: e.series };
  }
  return null;
}

/** La meilleure série (estimation du maximum sur une répétition) : { kg, r, date } ou null. */
export function meilleure(seances, id) {
  let best = null;
  for (const s of seances) {
    const e = (s.exercices || []).find(x => x.id === id);
    for (const x of (e && e.series) || []) {
      const v = estimation1RM(x.kg, x.r);
      if (v > 0 && (!best || v > best.v)) best = { kg: x.kg, r: x.r, date: s.date, v };
    }
  }
  return best;
}

/** Les records personnels : la meilleure série de chaque exercice chargé. */
export function records(seances) {
  const ids = new Set(seances.flatMap(s => (s.exercices || []).map(e => e.id)));
  return [...ids]
    .map(id => ({ id, nom: (PAR_ID.get(id) || {}).nom || id, ...meilleure(seances, id) }))
    .filter(r => r.v)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.v - a.v));
}

const PAS_CHARGE = { halteres: 2, salle: 2.5 };
/** Charge conseillée : celle de la dernière fois, ou un cran au-dessus si toutes les séries ont atteint le haut de la fourchette. */
export function conseil(ex, cible, derniere) {
  if (!derniere || !ex.charge) return null;
  const charges = derniere.series.map(x => x.kg || 0);
  const kg = Math.max(...charges);
  if (!kg) return null;
  const haut = cible.reps ? cible.reps[1] : Infinity;
  const toutes = derniere.series.length >= cible.series && derniere.series.every(x => (x.r || 0) >= haut);
  return toutes ? { kg: kg + (PAS_CHARGE[ex.mat] || 1), monter: true } : { kg, monter: false };
}

/** Prépare la séance en cours à partir du plan : séries préremplies avec la dernière fois. */
export function lancer(plan, { id, date, debut, type, objectif, materiel, duree }, seances) {
  return {
    id,
    date,
    debut,
    type,
    objectif: typeDe(type).muscu ? objectif : null,
    materiel: [...(materiel || [])],
    duree,
    exos: plan.map(p => {
      const ex = PAR_ID.get(p.id);
      const avant = derniereFois(seances, p.id);
      const c = conseil(ex, p.cible, avant);
      const series = [];
      for (let k = 0; k < p.cible.series; k++) {
        const prec = avant && avant.series[Math.min(k, avant.series.length - 1)];
        series.push(
          p.cible.secs
            ? { s: p.cible.secs, ok: false }
            : { r: prec && prec.r && !(c && c.monter) ? prec.r : p.cible.reps[0], kg: ex.charge ? (c ? c.kg : prec && prec.kg) || '' : undefined, ok: false },
        );
      }
      return { id: p.id, role: p.role, cible: p.cible, series };
    }),
    repos: null,
  };
}

/** Ajoute une série à un exercice de la séance en cours (copie de la précédente). */
export function serieDePlus(exo) {
  const der = exo.series[exo.series.length - 1];
  return der ? { ...der, ok: false } : exo.cible.secs ? { s: exo.cible.secs, ok: false } : { r: exo.cible.reps ? exo.cible.reps[0] : 10, kg: '', ok: false };
}

const nombreOuRien = v => {
  const n = Number(String(v ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};

/** La séance terminée, telle qu'enregistrée dans le carnet : seulement les séries validées. */
export function cloturer(encours, fin, t) {
  const exercices = encours.exos
    .map(e => {
      const ex = PAR_ID.get(e.id) || {};
      const series = e.series
        .filter(x => x.ok)
        .map(x => (e.cible.secs ? { s: nombreOuRien(x.s) || e.cible.secs } : { r: nombreOuRien(x.r), ...(ex.charge && nombreOuRien(x.kg) ? { kg: nombreOuRien(x.kg) } : {}) }));
      return { id: e.id, nom: ex.nom || e.id, series };
    })
    .filter(e => e.series.length);
  return {
    id: encours.id,
    date: encours.date,
    debut: encours.debut,
    fin,
    duree: Math.max(1, Math.round((fin - encours.debut) / 60000)),
    type: encours.type,
    objectif: encours.objectif || null,
    materiel: encours.materiel,
    exercices,
    t,
  };
}

/** Les records battus par une séance par rapport au carnet d'avant. */
export function recordsBattus(seance, avant) {
  return seance.exercices
    .map(e => {
      const nouveau = meilleure([seance], e.id);
      const ancien = meilleure(avant, e.id);
      return nouveau && ancien && nouveau.v > ancien.v + 0.01 ? { id: e.id, nom: e.nom, kg: nouveau.kg, r: nouveau.r } : null;
    })
    .filter(Boolean);
}

/** Fusion entre appareils : pour chaque séance, la version la plus récente gagne. */
export function fusionnerEntrainements(local, distant) {
  if (!local) return distant;
  if (!distant) return local;
  const seances = {};
  const ids = [...new Set([...Object.keys(local.seances || {}), ...Object.keys(distant.seances || {})])].sort();
  for (const id of ids) {
    const a = (local.seances || {})[id];
    const b = (distant.seances || {})[id];
    seances[id] = !a ? b : !b ? a : (b.t || 0) >= (a.t || 0) ? b : a;
  }
  return { format: distant.format || local.format, mois: distant.mois || local.mois, seances };
}

export const entrainementsVides = mois => ({ format: 'ascension/entrainements@1', mois, seances: {} });

/** Résumé d'une série pour l'affichage : « 10 × 22,5 kg », « 12 », « 45 s ». */
export function texteSerie(x) {
  if (x.s) return `${x.s} s`;
  const kg = x.kg ? ` × ${String(x.kg).replace('.', ',')} kg` : '';
  return `${x.r || 0}${kg}`;
}
/** « 3 × 10 · 20 kg » quand toutes les séries sont pareilles, sinon la liste. */
export function texteSeries(series) {
  if (!series || !series.length) return '';
  const pareilles = series.every(x => x.r === series[0].r && x.kg === series[0].kg && x.s === series[0].s);
  if (pareilles) {
    const x = series[0];
    if (x.s) return `${series.length} × ${x.s} s`;
    return `${series.length} × ${x.r}${x.kg ? ` · ${String(x.kg).replace('.', ',')} kg` : ''}`;
  }
  return series.map(texteSerie).join(', ');
}
export function texteCible(c, uni) {
  const travail = c.secs ? `${c.secs} s` : `${c.reps[0]}-${c.reps[1]} rép.`;
  const repos = c.repos ? ` · repos ${c.repos >= 60 ? `${Math.floor(c.repos / 60)} min${c.repos % 60 ? ` ${c.repos % 60}` : ''}` : `${c.repos} s`}` : '';
  return `${c.series} × ${travail}${uni ? ' par côté' : ''}${repos}`;
}
