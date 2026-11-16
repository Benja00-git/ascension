#!/usr/bin/env python3
"""Serveur de développement d'Ascension.

- Port 8765 : les fichiers du projet (l'appli est sous /docs/), servis sans cache.
- Port 8766 : une imitation locale de l'API GitHub (lecture et écriture des contenus
  d'un dépôt), pour tester la synchronisation sans jeton ni réseau.
  Le « dépôt » est un simple dossier du disque.

Usage :
    py dev/serveur.py [--depot DOSSIER] [--port 8765] [--port-api 8766]

Jeton accepté par l'imitation : jeton-de-test
Dans l'appli : Réglages → Avancé → Adresse de l'API = http://localhost:8766
"""
import argparse
import base64
import hashlib
import json
import os
import secrets
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
JETON = "jeton-de-test"
TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
}


def sous(base, relatif):
    """Chemin absolu sous `base`, ou None si `relatif` tente d'en sortir."""
    cible = os.path.abspath(os.path.join(base, *[p for p in relatif.split("/") if p]))
    if cible != base and not cible.startswith(base + os.sep):
        return None
    return cible


class Statique(BaseHTTPRequestHandler):
    server_version = "AscensionDev/1"

    def log_message(self, *_):
        pass

    def do_GET(self):
        chemin = unquote(urlparse(self.path).path)
        if chemin in ("", "/"):
            self.send_response(302)
            self.send_header("Location", "/docs/")
            self.end_headers()
            return
        cible = sous(RACINE, chemin)
        if cible and os.path.isdir(cible):
            if not chemin.endswith("/"):
                self.send_response(301)
                self.send_header("Location", chemin + "/")
                self.end_headers()
                return
            cible = os.path.join(cible, "index.html")
        if not cible or not os.path.isfile(cible):
            self.send_error(404)
            return
        with open(cible, "rb") as f:
            corps = f.read()
        self.send_response(200)
        self.send_header("Content-Type", TYPES.get(os.path.splitext(cible)[1].lower(), "application/octet-stream"))
        self.send_header("Content-Length", str(len(corps)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(corps)

    do_HEAD = do_GET


def sha_blob(octets):
    return hashlib.sha1(b"blob %d\x00" % len(octets) + octets).hexdigest()


class FauxGithub(BaseHTTPRequestHandler):
    """Imite le sous-ensemble de l'API REST GitHub dont l'appli se sert."""

    server_version = "FauxGithub/1"
    depot = ""
    journal = []      # requêtes reçues, pour les vérifications
    pannes = []       # statuts à renvoyer aux prochaines requêtes
    latence = 0.0

    def log_message(self, *_):
        pass

    # -- utilitaires ---------------------------------------------------------
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Expose-Headers", "ETag, Link, Location, Retry-After, X-RateLimit-Remaining")

    def _json(self, statut, corps):
        octets = json.dumps(corps, ensure_ascii=False).encode("utf-8")
        self.send_response(statut)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(octets)))
        self.send_header("X-RateLimit-Remaining", "4999")
        self.end_headers()
        self.wfile.write(octets)

    def _autorise(self):
        if self.headers.get("Authorization", "") != f"Bearer {JETON}":
            self._json(401, {"message": "Bad credentials"})
            return False
        return True

    def _fichier(self, relatif):
        return sous(self.depot, relatif)

    def _entree(self, chemin_abs, relatif):
        nom = os.path.basename(chemin_abs)
        if os.path.isdir(chemin_abs):
            return {"type": "dir", "name": nom, "path": relatif, "sha": hashlib.sha1(relatif.encode()).hexdigest(), "size": 0}
        with open(chemin_abs, "rb") as f:
            octets = f.read()
        return {"type": "file", "name": nom, "path": relatif, "sha": sha_blob(octets), "size": len(octets)}

    def _tous_les_fichiers(self):
        for dossier, _, fichiers in os.walk(self.depot):
            for nom in fichiers:
                absolu = os.path.join(dossier, nom)
                yield absolu, os.path.relpath(absolu, self.depot).replace(os.sep, "/")

    def _avant(self, methode):
        if self.latence:
            time.sleep(self.latence)
        url = urlparse(self.path)
        FauxGithub.journal.append({"methode": methode, "chemin": unquote(url.path)})
        return url

    # -- méthodes HTTP -------------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept, X-GitHub-Api-Version, If-None-Match")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        url = self._avant("GET")
        chemin = unquote(url.path)
        requete = parse_qs(url.query)

        # Points d'entrée réservés aux tests
        if chemin == "/__test/journal":
            return self._json(200, FauxGithub.journal)
        if chemin == "/__test/vider":
            FauxGithub.journal.clear()
            FauxGithub.pannes.clear()
            return self._json(200, {"ok": True})
        if chemin == "/__test/panne":
            statut = int(requete.get("statut", ["500"])[0])
            fois = int(requete.get("fois", ["1"])[0])
            FauxGithub.pannes.extend([statut] * fois)
            FauxGithub.journal.pop()
            return self._json(200, {"pannes": FauxGithub.pannes})

        if FauxGithub.pannes:
            statut = FauxGithub.pannes.pop(0)
            return self._json(statut, {"message": f"Panne simulée ({statut})"})
        if not self._autorise():
            return
        morceaux = [m for m in chemin.split("/") if m]
        if len(morceaux) < 3 or morceaux[0] != "repos":
            return self._json(404, {"message": "Not Found"})
        reste = morceaux[3:]

        if not reste:
            return self._json(200, {"full_name": "/".join(morceaux[1:3]), "default_branch": "main", "private": True, "permissions": {"pull": True, "push": True}})

        if reste[0] == "contents":
            relatif = "/".join(reste[1:])
            absolu = self._fichier(relatif)
            if not absolu or not os.path.exists(absolu):
                return self._json(404, {"message": "Not Found"})
            if os.path.isdir(absolu):
                liste = [self._entree(os.path.join(absolu, n), (relatif + "/" + n).lstrip("/")) for n in sorted(os.listdir(absolu))]
                return self._json(200, liste)
            entree = self._entree(absolu, relatif)
            with open(absolu, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            entree["encoding"] = "base64"
            entree["content"] = "\n".join(b64[i:i + 60] for i in range(0, len(b64), 60)) + "\n"
            return self._json(200, entree)

        if reste[:2] == ["git", "blobs"] and len(reste) == 3:
            for absolu, _ in self._tous_les_fichiers():
                with open(absolu, "rb") as f:
                    octets = f.read()
                if sha_blob(octets) == reste[2]:
                    b64 = base64.b64encode(octets).decode()
                    contenu = "\n".join(b64[i:i + 60] for i in range(0, len(b64), 60)) + "\n"
                    return self._json(200, {"sha": reste[2], "size": len(octets), "encoding": "base64", "content": contenu})
            return self._json(404, {"message": "Not Found"})

        if reste[:2] == ["git", "trees"] and len(reste) == 3:
            arbre = []
            for absolu, relatif in self._tous_les_fichiers():
                with open(absolu, "rb") as f:
                    arbre.append({"path": relatif, "mode": "100644", "type": "blob", "sha": sha_blob(f.read())})
            return self._json(200, {"sha": "0" * 40, "tree": sorted(arbre, key=lambda e: e["path"]), "truncated": False})

        return self._json(404, {"message": "Not Found"})

    def do_PUT(self):
        url = self._avant("PUT")
        chemin = unquote(url.path)
        longueur = int(self.headers.get("Content-Length", "0"))
        brut = self.rfile.read(longueur) if longueur else b"{}"
        if FauxGithub.pannes:
            statut = FauxGithub.pannes.pop(0)
            return self._json(statut, {"message": f"Panne simulée ({statut})"})
        if not self._autorise():
            return
        morceaux = [m for m in chemin.split("/") if m]
        if len(morceaux) < 5 or morceaux[0] != "repos" or morceaux[3] != "contents":
            return self._json(404, {"message": "Not Found"})
        try:
            corps = json.loads(brut.decode("utf-8"))
            octets = base64.b64decode(corps["content"])
            message = corps["message"]
        except Exception:
            return self._json(422, {"message": "Invalid request."})
        relatif = "/".join(morceaux[4:])
        absolu = self._fichier(relatif)
        if not absolu:
            return self._json(404, {"message": "Not Found"})
        existe = os.path.isfile(absolu)
        if existe:
            with open(absolu, "rb") as f:
                actuel = sha_blob(f.read())
            if not corps.get("sha"):
                return self._json(422, {"message": "Invalid request.\n\n\"sha\" wasn't supplied."})
            if corps["sha"] != actuel:
                return self._json(409, {"message": f"{relatif} does not match {corps['sha']}"})
        elif corps.get("sha"):
            return self._json(409, {"message": f"{relatif} does not match {corps['sha']}"})
        os.makedirs(os.path.dirname(absolu), exist_ok=True)
        with open(absolu, "wb") as f:
            f.write(octets)
        FauxGithub.journal[-1]["message"] = message
        self._json(200 if existe else 201, {
            "content": {"name": os.path.basename(absolu), "path": relatif, "sha": sha_blob(octets), "size": len(octets)},
            "commit": {"sha": secrets.token_hex(20), "message": message},
        })


def main():
    analyse = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    analyse.add_argument("--depot", default=os.path.join(RACINE, "dev", "depot-test"), help="dossier qui joue le rôle du dépôt GitHub")
    analyse.add_argument("--port", type=int, default=8765)
    analyse.add_argument("--port-api", type=int, default=8766)
    analyse.add_argument("--latence", type=float, default=0.0, help="délai simulé de l'API, en secondes")
    options = analyse.parse_args()

    FauxGithub.depot = os.path.abspath(options.depot)
    FauxGithub.latence = options.latence
    os.makedirs(FauxGithub.depot, exist_ok=True)

    api = ThreadingHTTPServer(("127.0.0.1", options.port_api), FauxGithub)
    threading.Thread(target=api.serve_forever, daemon=True).start()
    site = ThreadingHTTPServer(("127.0.0.1", options.port), Statique)
    print(f"Appli        : http://localhost:{options.port}/docs/", flush=True)
    print(f"Faux GitHub  : http://localhost:{options.port_api}   (jeton : {JETON})", flush=True)
    print(f"Faux dépôt   : {FauxGithub.depot}", flush=True)
    try:
        site.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
