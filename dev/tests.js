/* Tests du moteur de jeu — à ouvrir dans le navigateur : http://localhost:8765/dev/tests.html */
import * as M from '../docs/js/moteur.js';

const resultats = [];
function test(nom, fn) {
  try {
    fn();
    resultats.push({ nom, ok: true });
  } catch (e) {
    resultats.push({ nom, ok: false, erreur: e.message });
  }
}
function egal(obtenu, attendu, quoi = '') {
  const a = JSON.stringify(obtenu);
  const b = JSON.stringify(attendu);
  if (a !== b) throw new Error(`${quoi} attendu ${b}, obtenu ${a}`);
}
function vrai(v, quoi = '') {
  if (!v) throw new Error(`${quoi} devrait être vrai`);
}

const R = M.REGLES_DEFAUT;

const JEU = M.normaliserJeu({
  format: 'ascension/jeu@1',
  debut: '2026-11-16',
  quotidiennes: [
    { id: 'mouvement', titre: 'Mouvement', axe: 'for', rang: 'E' },
    { id: 'arbre', titre: 'Arbre', axe: 'int', rang: 'E' },
    { id: 'rapport', titre: 'Rapport', axe: 'vol', rang: 'E' },
  ],
  tournantes: [
    { id: 'couvre-feu', jour: 1, titre: 'Couvre-feu', axe: 'vit', rang: 'E' },
    { id: 'signal', jour: 2, titre: 'Signal', axe: 'cha', rang: 'E' },
    { id: 'gammes', jour: 3, titre: 'Gammes', axe: 'dex', rang: 'E' },
    { id: 'cuisine', jour: 4, titre: 'Cuisine', axe: 'vit', rang: 'D' },
    { id: 'rencontre', jour: 5, titre: 'Rencontre', axe: 'cha', rang: 'D' },
    { id: 'atelier', jour: 6, titre: 'Atelier', axe: 'dex', rang: 'D' },
    { id: 'conseil', jour: 7, titre: 'Conseil', axe: 'vol', rang: 'D' },
  ],
  hebdo: { '2026-W47': [{ id: 'eveil', titre: 'Éveil', axe: 'int', rang: 'C' }, { id: 'pas', titre: 'Premiers pas', axe: 'for', rang: 'C' }] },
  donjons: [{ id: 'd1', nom: 'Donjon', statut: 'ouvert', etages: [{ id: 'e1', titre: 'Étage 1', rang: 'B', axe: 'vol' }, { id: 'boss', titre: 'Boss', rang: 'S', axe: 'vol', boss: true }] }],
  attributions: [{ le: '2026-11-18', axe: 'int', xp: 25, motif: 'Nœud → Pousse' }],
});

/** Coche toutes les quêtes normales d'un jour, sauf celles listées. */
function jouer(journaux, date, sauf = [], t = 1000) {
  for (const q of M.quetesRegulieres(JEU, date)) {
    if (!sauf.includes(q.id)) M.poserEntree(journaux, date, q.id, M.entreeFaite(q, t));
  }
}
function coffres(journaux, jusqua) {
  const dates = [];
  for (let d = JEU.debut; d <= jusqua; d = M.ajouterJours(d, 1)) dates.push(d);
  M.reconcilierCoffres(JEU, journaux, M.chronologie(JEU, journaux, jusqua), dates, 2000);
}

test('Barème des niveaux (tableau du cadre)', () => {
  egal([2, 3, 4, 5, 10, 20, 30, 40, 50].map(n => M.seuilNiveau(R, n)), [10, 53, 140, 279, 1951, 11722, 32341, 65850, 113886]);
  egal([2, 3, 4, 5, 10, 20].map(n => M.seuilNiveau(R, n, 6)), [2, 9, 23, 46, 325, 1954]);
});
test('Niveau à partir de l’XP', () => {
  egal([0, 9, 10, 52, 53, 96, 140, 1951].map(x => M.niveauPour(R, x)), [1, 1, 2, 2, 3, 3, 4, 10]);
  egal([0, 1, 2, 9, 30].map(x => M.niveauPour(R, x, 6)), [1, 1, 2, 3, 4]);
});
test('Rangs E → S', () => {
  egal([1, 9, 10, 19, 20, 30, 40, 49, 50, 80].map(n => M.rangPour(R, n)), ['E', 'E', 'D', 'D', 'C', 'B', 'A', 'A', 'S', 'S']);
  egal(M.rangSuivant(R, 3), { rang: 'D', niveau: 10, xp: 1951 });
  egal(M.rangSuivant(R, 55), null);
});
test('Dates et semaines ISO', () => {
  egal(M.jourSemaine('2026-11-16'), 1);
  egal(M.jourSemaine('2026-11-22'), 7);
  egal(M.semaineIso('2026-11-16'), '2026-W47');
  egal(M.semaineIso('2026-11-22'), '2026-W47');
  egal(M.semaineIso('2026-11-23'), '2026-W48');
  egal(M.semaineIso('2027-01-01'), '2026-W53');
  egal(M.semaineIso('2027-01-04'), '2027-W01');
  egal(M.lundiDe('2026-11-19'), '2026-11-16');
  egal(M.ajouterJours('2026-11-30', 1), '2026-12-01');
  egal(M.ecartJours('2026-11-15', '2026-11-16'), 1);
});
test('Le jour de jeu bascule à 4 h', () => {
  egal(M.jourDeJeu(new Date(2026, 10, 17, 3, 59), 4), '2026-11-16');
  egal(M.jourDeJeu(new Date(2026, 10, 17, 4, 0), 4), '2026-11-17');
  egal(M.jourDeJeu(new Date(2026, 10, 16, 23, 30), 4), '2026-11-16');
});
test('Quêtes du jour : 3 fixes + la tournante', () => {
  egal(M.quetesRegulieres(JEU, '2026-11-16').map(q => q.id), ['mouvement', 'arbre', 'rapport', 'couvre-feu']);
  egal(M.quetesRegulieres(JEU, '2026-11-22').map(q => q.id), ['mouvement', 'arbre', 'rapport', 'conseil']);
  egal(M.quetesRegulieres(JEU, '2026-11-19').map(q => q.xp), [10, 10, 10, 25]);
});
test('Avant le début : rien', () => {
  const c = M.calculer({ jeu: JEU, journaux: {}, etat: M.etatVide(), arbre: null, aujourdhui: '2026-11-15' });
  egal([c.commence, c.joursAvantDebut, c.jours.size, c.xp, c.niveau], [false, 1, 0, 25, 2]);
});
test('Journée parfaite : coffre et XP', () => {
  const j = {};
  jouer(j, '2026-11-16');
  coffres(j, '2026-11-16');
  const c = M.calculer({ jeu: { ...JEU, attributions: [] }, journaux: j, etat: M.etatVide(), arbre: null, aujourdhui: '2026-11-16' });
  const jour = c.jours.get('2026-11-16');
  egal([jour.faites, jour.total, jour.coffre, jour.xp], [4, 4, true, 55]);
  egal([c.xp, c.niveau, c.rang], [55, 3, 'E']);
  egal(Object.fromEntries(c.axes.map(a => [a.id, a.xp])), { for: 10, vit: 10, int: 10, vol: 25, cha: 0, dex: 0 });
  egal(c.axes.find(a => a.id === 'vol').niveau, 4);
});
test('Quête ratée → rattrapage le lendemain, sur le même axe', () => {
  const j = {};
  jouer(j, '2026-11-16', ['couvre-feu', 'mouvement']);
  const jours = M.chronologie(JEU, j, '2026-11-17');
  egal(jours.get('2026-11-16').coffreMerite, false);
  egal(jours.get('2026-11-17').rattrapages.map(r => [r.id, r.xp]), [['rattrapage-for', 10], ['rattrapage-vit', 10]]);
  // un rattrapage non fait n'en crée pas d'autre
  jouer(j, '2026-11-17');
  egal(M.chronologie(JEU, j, '2026-11-18').get('2026-11-18').rattrapages.length, 0);
});
test('Mode survie : 3 jours vides pour y entrer, 3 jours actifs pour en sortir', () => {
  const j = {};
  jouer(j, '2026-11-16');
  // 17, 18, 19 : rien
  let jours = M.chronologie(JEU, j, '2026-11-20');
  egal([17, 18, 19, 20].map(d => jours.get(`2026-11-${d}`).survie), [false, false, false, true]);
  const s = jours.get('2026-11-20');
  egal([s.quetes.map(q => q.id), s.bonus.length, s.rattrapages.length, s.coffrePossible], [['rapport'], 3, 0, false]);
  // 20, 21 actifs, 22 vide, puis 23, 24, 25 actifs → sortie le 26
  const rapport = JEU.quotidiennes[2];
  for (const d of ['2026-11-20', '2026-11-21', '2026-11-23', '2026-11-24', '2026-11-25']) M.poserEntree(j, d, 'rapport', M.entreeFaite(rapport, 1));
  jours = M.chronologie(JEU, j, '2026-11-27');
  egal([21, 22, 23, 24, 25, 26, 27].map(d => jours.get(`2026-11-${d}`).survie), [true, true, true, true, true, false, false]);
  egal(jours.get('2026-11-25').sortieSurvie, true);
  egal(jours.get('2026-11-26').rattrapages.length, 0, 'pas de rattrapage au lendemain du mode survie :');
  // une quête bonus compte aussi comme jour actif
  const j2 = {};
  jouer(j2, '2026-11-16');
  M.poserEntree(j2, '2026-11-20', 'mouvement', M.entreeFaite(JEU.quotidiennes[0], 1));
  egal(M.chronologie(JEU, j2, '2026-11-20').get('2026-11-20').actif, true);
});
test('Série : le jour en cours ne la casse pas', () => {
  const j = {};
  for (const d of ['2026-11-16', '2026-11-17', '2026-11-18']) jouer(j, d);
  coffres(j, '2026-11-18');
  let c = M.calculer({ jeu: JEU, journaux: j, etat: M.etatVide(), arbre: null, aujourdhui: '2026-11-19' });
  egal([c.compteurs.serie, c.compteurs.serieCoffres, c.compteurs.coffres], [3, 3, 3]);
  c = M.calculer({ jeu: JEU, journaux: j, etat: M.etatVide(), arbre: null, aujourdhui: '2026-11-20' });
  egal([c.compteurs.serie, c.compteurs.serieRecord], [0, 3]);
});
test('Décocher retire le coffre', () => {
  const j = {};
  jouer(j, '2026-11-16');
  coffres(j, '2026-11-16');
  M.poserEntree(j, '2026-11-16', 'arbre', M.entreeAnnulee(3000));
  coffres(j, '2026-11-16');
  const jour = M.chronologie(JEU, j, '2026-11-16').get('2026-11-16');
  egal([jour.faites, jour.coffre, jour.xp], [3, false, 30]);
});
test('Hebdomadaires, donjons et attributions du Système', () => {
  const etat = M.etatVide();
  etat.hebdo['2026-W47'] = { eveil: M.entreeFaite(JEU.hebdo['2026-W47'][0], 5, { le: '2026-11-18' }) };
  etat.donjons.d1 = { e1: M.entreeFaite(JEU.donjons[0].etages[0], 6, { le: '2026-11-19' }) };
  const c = M.calculer({ jeu: JEU, journaux: {}, etat, arbre: null, aujourdhui: '2026-11-20' });
  egal(c.xp, 50 + 100 + 25);
  egal([c.semaine.hebdoFaites, c.semaine.hebdo.length, c.semaine.xpTotal, c.semaine.xp.int, c.semaine.xp.vol], [1, 2, 175, 75, 100]);
  egal(c.compteurs.etages, 1);
  egal(c.paliers.map(p => p.niveau), [2, 3, 4]);
});
test('Fusion entre appareils : la saisie la plus récente gagne', () => {
  const a = { mois: '2026-11', jours: { '2026-11-16': { mouvement: { f: 1, t: 10, x: 10, a: 'for', n: 'M' }, arbre: { f: 1, t: 10, x: 10, a: 'int', n: 'A' } } } };
  const b = { mois: '2026-11', jours: { '2026-11-16': { mouvement: { f: 0, t: 20 }, rapport: { f: 1, t: 5, x: 10, a: 'vol', n: 'R' } }, '2026-11-17': { arbre: { f: 1, t: 30, x: 10, a: 'int', n: 'A' } } } };
  const f = M.fusionnerJournal(a, b);
  egal(Object.keys(f.jours), ['2026-11-16', '2026-11-17']);
  egal([f.jours['2026-11-16'].mouvement.f, f.jours['2026-11-16'].arbre.f, f.jours['2026-11-16'].rapport.f], [0, 1, 1]);
  egal(Object.keys(f.jours['2026-11-16']), ['arbre', 'mouvement', 'rapport'], 'clés triées :');
  egal(M.fusionnerJournal(b, a), f, 'fusion symétrique :');
  const e1 = { hebdo: { W: { q: { f: 1, t: 1 } } }, donjons: {}, succes: { s: { le: '2026-11-18' } } };
  const e2 = { hebdo: { W: { q: { f: 0, t: 2 } } }, donjons: {}, succes: { s: { le: '2026-11-17' }, u: { le: '2026-11-19' } } };
  const fe = M.fusionnerEtat(e1, e2);
  egal([fe.hebdo.W.q.f, fe.succes.s.le, !!fe.succes.u], [0, '2026-11-17', true]);
});
test('Succès : débloqués puis acquis', () => {
  const j = {};
  jouer(j, '2026-11-16');
  coffres(j, '2026-11-16');
  const c = M.calculer({ jeu: JEU, journaux: j, etat: M.etatVide(), arbre: null, aujourdhui: '2026-11-16' });
  const obtenus = c.succes.filter(s => s.obtenu).map(s => s.id);
  vrai(obtenus.includes('premier-pas') && obtenus.includes('premier-coffre'), 'premier pas et premier coffre');
  vrai(!obtenus.includes('serie-3'), 'pas encore la série de 3');
  const etat = M.etatVide();
  etat.succes['serie-7'] = { le: '2026-11-10' };
  const c2 = M.calculer({ jeu: JEU, journaux: {}, etat, arbre: null, aujourdhui: '2026-11-16' });
  egal(c2.succes.find(s => s.id === 'serie-7').obtenu, '2026-11-10');
});
test('Quête remplacée : l’ancienne reste comptée', () => {
  const jeu2 = M.normaliserJeu({ debut: '2026-11-16', quotidiennes: [{ id: 'neuve', titre: 'Neuve', axe: 'for', rang: 'E', depuis: '2026-11-18' }, { id: 'vieille', titre: 'Vieille', axe: 'for', rang: 'E', jusqua: '2026-11-17' }] });
  egal(M.quetesRegulieres(jeu2, '2026-11-17').map(q => q.id), ['vieille']);
  egal(M.quetesRegulieres(jeu2, '2026-11-18').map(q => q.id), ['neuve']);
  const j = {};
  M.poserEntree(j, '2026-11-18', 'disparue', { f: 1, t: 1, x: 10, a: 'int', n: 'Quête disparue' });
  const jour = M.chronologie(jeu2, j, '2026-11-18').get('2026-11-18');
  egal([jour.archives.length, jour.xp, jour.actif], [1, 10, true]);
});
test('Jours modifiables : 7 jours, jamais avant le début ni dans le futur', () => {
  egal(['2026-11-15', '2026-11-16', '2026-11-22', '2026-11-23'].map(d => M.estModifiable(JEU, d, '2026-11-22')), [false, true, true, false]);
  egal(M.estModifiable(JEU, '2026-11-16', '2026-11-23'), false);
  egal(M.estModifiable(JEU, '2026-11-17', '2026-11-23'), true);
});
test('Résumé pour le Système', () => {
  const j = {};
  jouer(j, '2026-11-16', ['couvre-feu']);
  const c = M.calculer({ jeu: JEU, journaux: j, etat: M.etatVide(), arbre: null, aujourdhui: '2026-11-17' });
  const r = M.construireResume(JEU, c);
  egal([r.niveau, r.xp, r.modeSurvie, r.rattrapagesDuJour, r.semaine.quotidiennes, r.semaine.id], [3, 55, false, ['vit'], '3/8', '2026-W47']);
});

test('Explorations : 2 à approfondir + 1 à explorer, tirage tournant, consommées sautées', () => {
  const A = n => ({ id: `a${n}`, type: 'approfondir', titre: `A${n}` });
  const X = n => ({ id: `x${n}`, type: 'explorer', titre: `X${n}` });
  const jeu = { ...JEU, explorations: { '2026-W47': [A(0), A(1), A(2), A(3), A(4), X(0), X(1)] } };
  const ids = (journaux, d) => M.explorationsDuJour(jeu, journaux, d).options.map(o => o.id);
  egal(ids({}, '2026-11-16'), ['a0', 'a1', 'x0']);
  egal(ids({}, '2026-11-17'), ['a2', 'a3', 'x1']);
  egal(ids({}, '2026-11-18'), ['a4', 'a0', 'x0']);
  const j = {};
  M.poserEntree(j, '2026-11-16', 'arbre', M.entreeFaite(JEU.quotidiennes[1], 1, { ex: 'a1', s: 'A1' }));
  egal(ids(j, '2026-11-16'), ['a0', 'a1', 'x0'], 'le jour même, rien ne bouge :');
  egal(ids(j, '2026-11-17'), ['a3', 'a4', 'x1'], 'le lendemain, a1 est sauté :');
  egal(M.explorationsDuJour(jeu, {}, '2026-11-23'), null, 'pas de réservoir la semaine suivante :');
  const vus = M.explorationsConsommees({ ...jeu, attributions: [{ exploration: '2026-11-16', xp: 10 }] }, j);
  egal(vus.map(v => [v.id, v.integree]), [['a1', true]]);
});

const ok = resultats.filter(r => r.ok).length;
document.title = `${ok === resultats.length ? 'OK' : 'ÉCHEC'} ${ok}/${resultats.length}`;
const liste = document.getElementById('resultats');
for (const r of resultats) {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? '✅' : '❌'} ${r.nom}${r.ok ? '' : ' — ' + r.erreur}`;
  liste.appendChild(li);
}
document.getElementById('bilan').textContent = document.title;
