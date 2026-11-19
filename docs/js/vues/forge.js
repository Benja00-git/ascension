/* Écran « Forge » : composer une séance, la suivre série par série, garder le carnet et les records. */
import * as F from '../forge.js';
import { PAR_ID, MATERIELS, EXERCICES } from '../exercices.js';
import { magasin, carnetForge } from '../magasin.js';
import { h, icone, dateMoyenne, dateLongue, nombre, pluriel } from '../ui.js';

const kg = v => `${String(Math.round(v * 100) / 100).replace('.', ',')} kg`;
const MAT = Object.fromEntries([['corps', 'Poids du corps'], ...MATERIELS.map(m => [m.id, m.nom])]);

export function chrono(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`;
}

function jeton(action, cle, val, actif, contenu) {
  return h`<button type="button" class="jeton ${actif ? 'est-actif' : ''}" data-action="${action}" data-cle="${cle}" data-val="${val}" aria-pressed="${actif ? 'true' : 'false'}">${contenu}</button>`;
}

/* ───────────────────────── Préparer ───────────────────────── */

function blocReglages() {
  const p = magasin.forge.prefs;
  const type = F.typeDe(p.type);
  return h`<section class="bloc forge-reglages">
    <h2 class="bloc-titre">Nouvelle séance</h2>
    <div class="groupe">
      <p class="choix-legende">Type d’entraînement</p>
      <div class="jetons">${F.TYPES.map(t => jeton('forge-pref', 'type', t.id, p.type === t.id, `${t.emoji} ${t.nom}`))}</div>
    </div>
    ${type.muscu
      ? h`<div class="groupe">
          <p class="choix-legende">Objectif</p>
          <div class="jetons">${F.OBJECTIFS.map(o => jeton('forge-pref', 'objectif', o.id, p.objectif === o.id, h`${o.nom} <small>${o.detail}</small>`))}</div>
        </div>`
      : ''}
    <div class="groupe">
      <p class="choix-legende">Matériel disponible <em>(le poids du corps est toujours compté)</em></p>
      <div class="jetons">${MATERIELS.map(m => jeton('forge-materiel', 'materiel', m.id, p.materiel.includes(m.id), `${m.emoji} ${m.nom}`))}</div>
    </div>
    <div class="groupe">
      <p class="choix-legende">Durée</p>
      <div class="jetons">${F.DUREES.map(d => jeton('forge-pref', 'duree', d, Number(p.duree) === d, `${d} min`))}</div>
    </div>
    <button class="bouton bouton-plein bouton-large" data-action="forge-proposer">${icone('eclair')} ${magasin.forge.proposition ? 'Recomposer la séance' : 'Composer la séance'}</button>
  </section>`;
}

const ROLES = { echauffement: 'Échauffement', principal: 'Séance', calme: 'Retour au calme' };

function ligneProposition(p, i, seances) {
  const ex = PAR_ID.get(p.id);
  if (!ex) return '';
  const avant = ex.mode === 'reps' ? F.derniereFois(seances, p.id) : null;
  const c = F.conseil(ex, p.cible, avant);
  return h`<li class="prop">
    <div class="prop-corps">
      <strong>${ex.nom}</strong>
      <span class="prop-meta">${ex.zone} · ${MAT[ex.mat]}</span>
      <span class="prop-cible">${F.texteCible(p.cible, ex.uni)}</span>
      ${avant ? h`<span class="prop-avant">Dernière fois : ${F.texteSeries(avant.series)}${c && c.monter ? h` · <b>essaie ${kg(c.kg)}</b>` : ''}</span>` : ''}
    </div>
    <button class="bouton-rond prop-changer" data-action="forge-changer" data-i="${i}" aria-label="Remplacer ${ex.nom}" data-bulle="Autre exercice">${icone('sync')}</button>
  </li>`;
}

function blocProposition() {
  const pr = magasin.forge.proposition;
  if (!pr) return '';
  const seances = carnetForge();
  const type = F.typeDe(pr.type);
  const groupes = ['echauffement', 'principal', 'calme']
    .map(role => ({ role, items: pr.plan.map((p, i) => ({ p, i })).filter(x => x.p.role === role) }))
    .filter(g => g.items.length);
  return h`<section class="bloc forge-proposition">
    <h2 class="bloc-titre">${type.emoji} ${type.nom} <span class="bloc-compte">≈ ${Math.round(F.dureePlan(pr.plan) / 60)} min</span></h2>
    <p class="bloc-note">${type.muscu ? `${F.objectifDe(pr.objectif).nom} · ` : ''}${pr.materiel.length ? pr.materiel.map(m => MAT[m]).join(', ') : 'Poids du corps'}. Le bouton ${'⟳'} remplace un exercice.</p>
    ${groupes.map(g => h`<p class="prop-groupe">${ROLES[g.role]}</p><ul class="props">${g.items.map(x => ligneProposition(x.p, x.i, seances))}</ul>`)}
    <div class="dialogue-actions">
      <button class="bouton bouton-discret" data-action="forge-proposer">Autre proposition</button>
      <button class="bouton bouton-plein" data-action="forge-commencer">Commencer</button>
    </div>
  </section>`;
}

function blocCarnet(seances) {
  if (!seances.length) return h`<section class="bloc"><h2 class="bloc-titre">Carnet</h2><p class="vide">Tes séances terminées s’inscriront ici, avec les exercices et les charges.</p></section>`;
  const semaine = seances.filter(s => s.debut >= Date.now() - 7 * 86400000);
  return h`<section class="bloc forge-carnet">
    <h2 class="bloc-titre">Carnet <span class="bloc-compte">${pluriel(semaine.length, 'séance')} sur 7 jours</span></h2>
    <ul class="raccourcis">${seances.slice(0, 12).map(s => {
      const t = F.typeDe(s.type);
      const v = F.volume(s);
      return h`<li><button class="raccourci" data-action="forge-fiche" data-id="${s.id}">
        <span class="raccourci-emoji">${t.emoji}</span>
        <span class="raccourci-corps"><strong>${t.nom}</strong><span>${dateMoyenne(s.date)} · ${s.duree} min · ${pluriel(s.exercices.length, 'exercice')}${v ? ` · ${nombre(v)} kg` : ''}</span></span>
        <span class="raccourci-compte">${icone('droite')}</span>
      </button></li>`;
    })}</ul>
  </section>`;
}

function blocRecords(seances) {
  const r = F.records(seances).slice(0, 8);
  if (!r.length) return '';
  return h`<section class="bloc">
    <h2 class="bloc-titre">${icone('trophee')} Records</h2>
    <ul class="seances">${r.map(x => h`<li><span>${x.nom}</span><strong>${x.r} × ${kg(x.kg)}</strong></li>`)}</ul>
  </section>`;
}

/* ───────────────────────── Séance en cours ───────────────────────── */

function ligneSerie(e, ex, x, i, k) {
  const champ = (nom, valeur, unite, mode) =>
    h`<label class="serie-champ ${unite.length > 4 ? 'est-long' : ''}"><input type="text" inputmode="${mode}" autocomplete="off" name="${nom}" value="${valeur ?? ''}" data-forge-serie data-i="${i}" data-k="${k}" aria-label="${unite} série ${k + 1}"><span>${unite}</span></label>`;
  return h`<li class="serie ${x.ok ? 'est-faite' : ''}">
    <span class="serie-n">${k + 1}</span>
    ${e.cible.secs
      ? champ('s', x.s, 's', 'numeric')
      : h`${champ('r', x.r, ex.uni ? 'rép./côté' : 'rép.', 'numeric')}${ex.charge ? champ('kg', x.kg, 'kg', 'decimal') : ''}`}
    <button class="serie-ok" data-action="forge-serie" data-i="${i}" data-k="${k}" aria-pressed="${x.ok ? 'true' : 'false'}" aria-label="Série ${k + 1} ${x.ok ? 'faite' : 'à valider'}">${icone('coche')}</button>
  </li>`;
}

function carteExo(e, i, seances) {
  const ex = PAR_ID.get(e.id);
  if (!ex) return '';
  const faites = e.series.filter(x => x.ok).length;
  const avant = ex.mode === 'reps' ? F.derniereFois(seances, e.id) : null;
  const c = F.conseil(ex, e.cible, avant);
  return h`<section class="bloc exo ${faites && faites === e.series.length ? 'est-fini' : ''}" id="exo-${i}">
    <div class="exo-tete">
      <div>
        <p class="exo-role">${ROLES[e.role] || 'Ajouté'} · ${ex.zone}</p>
        <h3 class="exo-nom">${ex.nom}</h3>
      </div>
      <span class="bloc-compte">${faites}/${e.series.length}</span>
    </div>
    <p class="exo-cible">${F.texteCible(e.cible, ex.uni)}${avant ? h` · dernière fois ${F.texteSeries(avant.series)}` : ''}${c && c.monter ? h` · <b>monte à ${kg(c.kg)}</b>` : ''}</p>
    <details class="exo-consigne"><summary>Comment faire</summary><p>${ex.consigne}</p></details>
    <ul class="series">${e.series.map((x, k) => ligneSerie(e, ex, x, i, k))}</ul>
    <div class="exo-actions">
      <button class="bouton-texte" data-action="forge-serie-plus" data-i="${i}">+ Série</button>
      ${e.series.length > 1 ? h`<button class="bouton-texte" data-action="forge-serie-moins" data-i="${i}">− Série</button>` : ''}
      <button class="bouton-texte bouton-texte-discret" data-action="forge-retirer" data-i="${i}">Retirer</button>
    </div>
  </section>`;
}

export function minuteur() {
  const r = magasin.forge.encours && magasin.forge.encours.repos;
  if (!r || !r.fin || r.fin <= Date.now()) return '';
  return h`<div class="minuteur" role="timer" aria-live="off">
    <span class="minuteur-libelle">Repos</span>
    <strong class="minuteur-temps" data-minuteur>${chrono(r.fin - Date.now())}</strong>
    <button class="bouton-texte" data-action="forge-repos-plus">+15 s</button>
    <button class="bouton bouton-discret" data-action="forge-repos-fin">Passer</button>
  </div>`;
}

function vueSeance() {
  const s = magasin.forge.encours;
  const t = F.typeDe(s.type);
  const seances = carnetForge();
  const total = s.exos.reduce((n, e) => n + e.series.length, 0);
  const faites = s.exos.reduce((n, e) => n + e.series.filter(x => x.ok).length, 0);
  return h`<div class="page page-forge en-seance">
    <section class="forge-tete">
      <div>
        <p class="balise">[SYSTÈME] Séance en cours</p>
        <h2 class="forge-titre">${t.emoji} ${t.nom}</h2>
      </div>
      <div class="forge-compteurs">
        <strong data-chrono="${s.debut}">${chrono(Date.now() - s.debut)}</strong>
        <span>${faites}/${total} séries</span>
      </div>
      <div class="jauge"><div class="jauge-plein" style="width:${total ? ((faites / total) * 100).toFixed(1) : 0}%"></div></div>
    </section>
    <div class="exos">${s.exos.map((e, i) => carteExo(e, i, seances))}</div>
    <button class="bouton bouton-discret bouton-large" data-action="forge-ajout">+ Ajouter un exercice</button>
    <div class="dialogue-actions forge-fin">
      <button class="bouton bouton-discret" data-action="forge-abandonner">Abandonner</button>
      <button class="bouton bouton-plein" data-action="forge-terminer">Terminer la séance</button>
    </div>
    ${minuteur()}
  </div>`;
}

export function vueForge() {
  if (magasin.forge.encours) return vueSeance();
  const seances = carnetForge();
  return h`<div class="page page-forge">
    <section class="message-systeme"><p><span class="balise">[SYSTÈME]</span> La Forge. Choisis ta séance : le Système compose l’entraînement et tient ton carnet.</p></section>
    <div class="colonnes">
      <div class="colonne">${blocReglages()}${blocProposition()}</div>
      <div class="colonne">${blocCarnet(seances)}${blocRecords(seances)}</div>
    </div>
  </div>`;
}

/* ───────────────────────── Feuilles ───────────────────────── */

export function ficheSeanceForge(id) {
  const s = carnetForge().find(x => x.id === id);
  if (!s) return null;
  const t = F.typeDe(s.type);
  const v = F.volume(s);
  return h`<div class="feuille fenetre forge-fiche" role="dialog" aria-modal="true" aria-labelledby="ff-titre">
    <button type="button" class="bouton-rond feuille-fermer" data-action="calque-fermer" aria-label="Fermer">${icone('fermer')}</button>
    <p class="balise">[SYSTÈME]</p>
    <h2 id="ff-titre" class="fiche-titre">${t.emoji} ${t.nom}</h2>
    <p class="fiche-niveau">${dateLongue(s.date)} · ${s.duree} min · ${pluriel(F.nbSeries(s), 'série')}${v ? ` · ${nombre(v)} kg soulevés` : ''}${s.objectif ? ` · ${F.objectifDe(s.objectif).nom}` : ''}</p>
    <ul class="seances">${s.exercices.map(e => h`<li><span>${(PAR_ID.get(e.id) || {}).nom || e.nom}</span><strong>${F.texteSeries(e.series)}</strong></li>`)}</ul>
    <div class="dialogue-actions">
      <button class="bouton bouton-discret" data-action="forge-supprimer" data-id="${s.id}">Supprimer</button>
      <button class="bouton bouton-plein" data-action="calque-fermer">Fermer</button>
    </div>
  </div>`;
}

export function ficheAjout() {
  const s = magasin.forge.encours;
  const dispo = F.disponible(s.materiel);
  const deja = new Set(s.exos.map(e => e.id));
  const zones = new Map();
  for (const e of EXERCICES) {
    if (!dispo.has(e.mat) || deja.has(e.id) || e.motif === 'echauffement') continue;
    if (!zones.has(e.zone)) zones.set(e.zone, []);
    zones.get(e.zone).push(e);
  }
  return h`<div class="feuille fenetre forge-ajout" role="dialog" aria-modal="true" aria-labelledby="fa-titre">
    <button type="button" class="bouton-rond feuille-fermer" data-action="calque-fermer" aria-label="Fermer">${icone('fermer')}</button>
    <h2 id="fa-titre" class="fiche-titre">Ajouter un exercice</h2>
    ${[...zones.entries()].map(([zone, liste]) => h`<p class="prop-groupe">${zone}</p><ul class="ajouts">${liste.map(e => h`<li><button class="ajout" data-action="forge-ajouter" data-id="${e.id}"><strong>${e.nom}</strong><span>${MAT[e.mat]}</span></button></li>`)}</ul>`)}
  </div>`;
}

export function ficheBilan(seance, battus) {
  const t = F.typeDe(seance.type);
  const v = F.volume(seance);
  return h`<div class="fenetre dialogue forge-bilan" role="dialog" aria-modal="true" aria-labelledby="fb-titre">
    <p class="balise">[SYSTÈME]</p>
    <h2 id="fb-titre" class="dialogue-titre">Séance forgée</h2>
    <p class="dialogue-texte">${t.emoji} ${t.nom} · ${seance.duree} min · ${pluriel(F.nbSeries(seance), 'série')}${v ? ` · ${nombre(v)} kg soulevés` : ''}.</p>
    ${battus.length ? h`<ul class="seances">${battus.map(b => h`<li><span>${icone('trophee')} ${b.nom}</span><strong>${b.r} × ${kg(b.kg)}</strong></li>`)}</ul>` : ''}
    <div class="dialogue-actions"><button class="bouton bouton-plein" data-action="calque-fermer" data-foyer>Continuer</button></div>
  </div>`;
}
