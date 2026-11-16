#!/usr/bin/env python3
"""Convertit l'Arbre de la connaissance du vault en arbre.json pour l'appli Ascension.

Lit le frontmatter (type, domaine, parent, prerequis, maitrise, revision) de chaque note
de l'arbre et écrit la liste à plat que l'appli sait afficher. Seuls les noms et les niveaux
sortent des notes : jamais leur contenu.

Usage :
    py -X utf8 outils/arbre_vers_json.py --vault "C:/…/Second Brain" [--sortie chemin/arbre.json]

Par défaut, la sortie va dans le dossier des données du jeu, à l'intérieur du vault.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import unicodedata

import yaml

DOSSIER_ARBRE = "30 - Ressources/Arbre de la connaissance"
DOSSIER_DONNEES = "20 - Zones de vie/Ascension/donnees"
EMOJIS = {
    "Finance & Économie": "💰",
    "Corps & Santé": "🏃",
    "Esprit & Relations": "🧘",
    "Arts & Art de vivre": "🎨",
    "Jeux & Stratégie": "🎮",
    "Monde & Société": "🌍",
}
ORDRE_DOMAINES = list(EMOJIS)


def nfc(texte):
    return unicodedata.normalize("NFC", str(texte or "")).strip()


def lien(valeur):
    """« [[Nom]] » ou « [[Nom|alias]] » → « Nom »."""
    if not valeur:
        return None
    m = re.match(r"^\s*\[\[([^\]|#]+)", str(valeur))
    return nfc(m.group(1) if m else valeur) or None


def frontmatter(chemin):
    with open(chemin, encoding="utf-8") as f:
        texte = f.read()
    if not texte.startswith("---"):
        return None
    fin = texte.find("\n---", 3)
    if fin < 0:
        return None
    try:
        return yaml.safe_load(texte[3:fin]) or {}
    except yaml.YAMLError as e:
        print(f"  ! frontmatter illisible : {chemin} ({e})", file=sys.stderr)
        return None


def date_iso(valeur):
    if isinstance(valeur, (dt.date, dt.datetime)):
        return valeur.strftime("%Y-%m-%d")
    texte = str(valeur or "").strip()
    return texte if re.match(r"^\d{4}-\d{2}-\d{2}$", texte) else None


def lire_arbre(vault):
    racine = os.path.join(vault, *DOSSIER_ARBRE.split("/"))
    if not os.path.isdir(racine):
        sys.exit(f"Dossier introuvable : {racine}")
    elements = []
    for dossier, _, fichiers in os.walk(racine):
        for nom in sorted(fichiers):
            if not nom.lower().endswith(".md"):
                continue
            fm = frontmatter(os.path.join(dossier, nom))
            if not fm or fm.get("type") not in ("domaine", "branche", "noeud"):
                continue
            element = {"nom": nfc(nom[:-3]), "type": fm["type"]}
            if fm["type"] == "domaine":
                element["emoji"] = EMOJIS.get(element["nom"], "🌿")
            else:
                element["domaine"] = lien(fm.get("domaine"))
                element["parent"] = lien(fm.get("parent")) or element["domaine"]
            if fm["type"] == "noeud":
                try:
                    element["maitrise"] = max(0, min(5, int(fm.get("maitrise") or 0)))
                except (TypeError, ValueError):
                    element["maitrise"] = 0
                element["prerequis"] = [lien(p) for p in (fm.get("prerequis") or []) if lien(p)]
                revision = date_iso(fm.get("revision"))
                if revision:
                    element["revision"] = revision
            elements.append(element)
    rang = {"domaine": 0, "branche": 1, "noeud": 2}
    ordre = {d: i for i, d in enumerate(ORDRE_DOMAINES)}
    elements.sort(key=lambda e: (ordre.get(e["nom"] if e["type"] == "domaine" else e.get("domaine"), 99), rang[e["type"]], e["nom"].casefold()))
    return elements


def main():
    analyse = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analyse.add_argument("--vault", required=True, help="dossier racine du vault Obsidian")
    analyse.add_argument("--sortie", help="fichier à écrire (défaut : dossier des données du jeu dans le vault)")
    options = analyse.parse_args()

    elements = lire_arbre(options.vault)
    noms = {e["nom"] for e in elements}
    for e in elements:
        for cle in ("domaine", "parent"):
            if e.get(cle) and e[cle] not in noms:
                print(f"  ! {e['nom']} : {cle} « {e[cle]} » introuvable dans l'arbre", file=sys.stderr)

    sortie = options.sortie or os.path.join(options.vault, *DOSSIER_DONNEES.split("/"), "arbre.json")
    document = {
        "format": "ascension/arbre@1",
        "genere": dt.datetime.now().strftime("%Y-%m-%dT%H:%M"),
        "noeuds": elements,
    }
    nouveau = json.dumps(document, ensure_ascii=False, indent=1) + "\n"
    # On ne réécrit pas le fichier (ni ne crée de commit) si seule la date de génération changerait.
    if os.path.isfile(sortie):
        with open(sortie, encoding="utf-8") as f:
            try:
                ancien = json.load(f)
            except json.JSONDecodeError:
                ancien = None
        if ancien and ancien.get("noeuds") == elements:
            print(f"arbre.json déjà à jour ({len(elements)} éléments).")
            return
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    with open(sortie, "w", encoding="utf-8", newline="\n") as f:
        f.write(nouveau)
    compte = {t: sum(1 for e in elements if e["type"] == t) for t in ("domaine", "branche", "noeud")}
    print(f"arbre.json écrit : {compte['domaine']} domaines, {compte['branche']} branches, {compte['noeud']} nœuds → {sortie}")


if __name__ == "__main__":
    main()
