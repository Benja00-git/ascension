# Ascension — la Fenêtre du Système

Un tableau de bord de vie façon RPG : quêtes quotidiennes et hebdomadaires, XP, niveaux, rangs de E à S, six statistiques, donjons (projets découpés en étages) et un arbre de la connaissance. Une appli web installable sur PC et iPhone, sans serveur ni compte : les données vivent dans un dépôt GitHub privé, et chaque coche devient un commit.

## Fonctionnement

```
dépôt GitHub privé (dossier des données)
 ├─ jeu.json            ← écrit par le maître du jeu : règles, quêtes, donjons, attributions d'XP
 ├─ arbre.json          ← écrit par le maître du jeu : nœuds de connaissance et leur niveau
 ├─ journal-AAAA-MM.json ← écrit par l'appli : quêtes cochées jour par jour
 ├─ entrainements-AAAA-MM.json ← écrit par l'appli : carnet de la Forge (séances, séries, charges)
 └─ etat.json           ← écrit par l'appli : hebdomadaires, étages, succès, résumé
```

- L'appli parle directement à l'API REST de GitHub avec un jeton à accès limité (*fine-grained*, permission « Contents : Read and write » sur un seul dépôt). Le jeton reste dans le navigateur de l'appareil.
- Chaque fichier n'a qu'un seul côté qui l'écrit, ce qui évite les conflits Git.
- Sans réseau, les coches attendent sur l'appareil. Si deux appareils écrivent en même temps, l'appli relit, fusionne (la saisie la plus récente gagne) et réessaie.
- Tout le reste se calcule sur l'appareil : XP, niveaux, coffre du jour, rattrapages, mode survie, séries, succès.

## Installation

1. Publier le dossier `docs/` (par exemple GitHub Pages : branche `main`, dossier `/docs`).
2. Créer un jeton *fine-grained* limité au dépôt des données, permission **Contents : Read and write**.
3. Ouvrir l'appli, saisir `propriétaire/dépôt` et le jeton. Le dossier des données est détecté tout seul (le fichier `jeu.json` au format `ascension/jeu@1`).
4. Sur iPhone : Safari → Partager → « Sur l'écran d'accueil », puis relier l'appareil **depuis l'icône** (elle a son propre stockage).

Un mode démo permet d'essayer sans dépôt.

## Format de `jeu.json`

```json
{
  "format": "ascension/jeu@1",
  "debut": "2026-11-16",
  "quotidiennes": [{ "id": "mouvement", "titre": "Bouger vingt minutes", "axe": "for", "rang": "E" }],
  "tournantes": [{ "id": "gammes", "jour": 3, "titre": "Gammes", "axe": "dex", "rang": "E" }],
  "hebdo": { "2026-W47": [{ "id": "eveil", "titre": "…", "axe": "int", "rang": "C" }] },
  "donjons": [{ "id": "route", "nom": "…", "statut": "ouvert", "etages": [{ "id": "e1", "titre": "…", "rang": "B", "axe": "for" }] }],
  "attributions": [{ "le": "2026-11-22", "axe": "int", "xp": 25, "motif": "…" }]
}
```

Axes : `for`, `vit`, `int`, `vol`, `cha`, `dex`. Rangs de quête : E (10 XP), D (25), C (50), B (100), A (250), S (1000). Les blocs facultatifs `regles`, `axes`, `annonce` et `succes` ont des valeurs par défaut (voir `docs/js/moteur.js`). Pour remplacer une quête sans perdre l'XP passée : `"jusqua"` sur l'ancienne, `"depuis"` sur la nouvelle.

## Développement

```bash
py -X utf8 dev/serveur.py
```

- http://localhost:8765/docs/ — l'appli. Le serveur imite aussi l'API GitHub sur le port 8766 (jeton `jeton-de-test`, dépôt = le dossier `dev/depot-test/`) : dans l'appli, Réglages → Avancé → Adresse de l'API = `http://localhost:8766`.
- http://localhost:8765/dev/tests.html — tests du moteur de jeu.
- `py -X utf8 dev/icones.py` régénère les icônes (Pillow).
- `outils/arbre_vers_json.py` convertit un arbre de notes Markdown (frontmatter `type`, `parent`, `maitrise`…) en `arbre.json`.

Aucune dépendance, aucune étape de compilation : HTML, CSS et modules JavaScript natifs.

**Publier une modification** : augmenter `VERSION` dans `docs/sw.js` à chaque changement du code. Le service worker sert l'appli depuis son cache (elle s'ouvre ainsi sans réseau) ; sans nouvelle version, les appareils garderaient l'ancienne.
