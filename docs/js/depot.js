/* Ascension — accès au dépôt GitHub par l'API REST, directement depuis le navigateur.
 * Le jeton n'est envoyé qu'à l'adresse de l'API (api.github.com par défaut).
 */

export const API_GITHUB = 'https://api.github.com';

export class ErreurDepot extends Error {
  /** code : reseau | jeton | droits | limite | introuvable | conflit | invalide | serveur | json | saisie */
  constructor(code, message, statut) {
    super(message);
    this.name = 'ErreurDepot';
    this.code = code;
    this.statut = statut || 0;
  }
}

const encodeur = new TextEncoder();
const decodeur = new TextDecoder();

export function versBase64(texte) {
  const octets = encodeur.encode(texte);
  let binaire = '';
  for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000));
  return btoa(binaire);
}
export function depuisBase64(b64) {
  const binaire = atob(String(b64 || '').replace(/\s+/g, ''));
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return decodeur.decode(octets);
}

const encoderChemin = chemin => chemin.split('/').filter(Boolean).map(encodeURIComponent).join('/');

export function nettoyerDepot(saisie) {
  return String(saisie || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');
}

export class DepotGithub {
  constructor({ depot, branche, dossier, jeton, api } = {}) {
    this.depot = nettoyerDepot(depot);
    this.branche = String(branche || '').trim();
    this.dossier = String(dossier || '').trim().replace(/^\/+|\/+$/g, '');
    this.jeton = String(jeton || '').trim();
    this.api = String(api || API_GITHUB).trim().replace(/\/+$/, '');
  }

  get base() {
    const [proprietaire, nom] = this.depot.split('/');
    return `${this.api}/repos/${encodeURIComponent(proprietaire || '')}/${encodeURIComponent(nom || '')}`;
  }

  async requete(methode, chemin, corps) {
    const arret = new AbortController();
    const minuterie = setTimeout(() => arret.abort(), 25000);
    let reponse;
    try {
      reponse = await fetch(this.base + chemin, {
        method: methode,
        cache: 'no-store',
        signal: arret.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.jeton}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(corps ? { 'Content-Type': 'application/json' } : {}),
        },
        body: corps ? JSON.stringify(corps) : undefined,
      });
    } catch (e) {
      throw new ErreurDepot('reseau', 'Connexion impossible : pas de réseau, ou GitHub ne répond pas.');
    } finally {
      clearTimeout(minuterie);
    }
    if (reponse.ok) return reponse.status === 204 ? null : reponse.json();

    let message = '';
    try {
      message = (await reponse.json()).message || '';
    } catch (e) {
      /* réponse sans corps JSON */
    }
    const s = reponse.status;
    if (s === 401) throw new ErreurDepot('jeton', 'Jeton refusé : il est faux, expiré ou révoqué.', s);
    if (s === 403 || s === 429) {
      if (s === 429 || reponse.headers.get('x-ratelimit-remaining') === '0' || /rate limit/i.test(message)) {
        throw new ErreurDepot('limite', 'GitHub demande de patienter (trop de requêtes). Nouvel essai plus tard.', s);
      }
      throw new ErreurDepot('droits', 'Accès refusé : le jeton doit avoir la permission « Contents : Read and write » sur ce dépôt.', s);
    }
    if (s === 404) throw new ErreurDepot('introuvable', 'Introuvable : vérifie le nom du dépôt, le dossier, et que le jeton donne bien accès à ce dépôt.', s);
    if (s === 409 || (s === 422 && /sha/i.test(message))) throw new ErreurDepot('conflit', 'Le fichier a changé entre-temps.', s);
    if (s === 422) throw new ErreurDepot('invalide', `GitHub a refusé la requête : ${message || 'requête invalide'}.`, s);
    if (s >= 500) throw new ErreurDepot('serveur', `GitHub est indisponible pour l'instant (erreur ${s}).`, s);
    throw new ErreurDepot('serveur', `Réponse inattendue de GitHub (${s}) ${message}`.trim(), s);
  }

  /** Fichiers du dossier des données : [{ nom, sha }]. */
  async lister() {
    const ref = this.branche ? `?ref=${encodeURIComponent(this.branche)}` : '';
    const liste = await this.requete('GET', `/contents/${encoderChemin(this.dossier)}${ref}`);
    if (!Array.isArray(liste)) throw new ErreurDepot('introuvable', 'Le dossier des données indiqué est un fichier.');
    return liste.filter(e => e.type === 'file').map(e => ({ nom: e.name, sha: e.sha }));
  }

  /** Contenu d'un fichier à partir de son empreinte (sha) telle que donnée par lister(). */
  async lireBlob(sha) {
    const blob = await this.requete('GET', `/git/blobs/${encodeURIComponent(sha)}`);
    return depuisBase64(blob.content);
  }

  /** Contenu actuel d'un fichier du dossier des données : { texte, sha }. */
  async lireFichier(nom) {
    const ref = this.branche ? `?ref=${encodeURIComponent(this.branche)}` : '';
    const f = await this.requete('GET', `/contents/${encoderChemin(`${this.dossier}/${nom}`)}${ref}`);
    return { texte: depuisBase64(f.content), sha: f.sha };
  }

  /** Crée ou remplace un fichier (un commit). `sha` = empreinte connue du fichier, absente s'il est nouveau. */
  async ecrire(nom, texte, sha, message) {
    const corps = { message, content: versBase64(texte) };
    if (sha) corps.sha = sha;
    if (this.branche) corps.branch = this.branche;
    const r = await this.requete('PUT', `/contents/${encoderChemin(`${this.dossier}/${nom}`)}`, corps);
    return { sha: r.content.sha };
  }

  /** Cherche dans le dépôt le dossier qui contient le jeu.json d'Ascension. */
  async decouvrir() {
    const info = await this.requete('GET', '');
    const branche = this.branche || info.default_branch;
    const arbre = await this.requete('GET', `/git/trees/${encodeURIComponent(branche)}?recursive=1`);
    const candidats = (arbre.tree || [])
      .filter(e => e.type === 'blob' && /(^|\/)jeu\.json$/.test(e.path))
      .sort((a, b) => Number(/ascension/i.test(b.path)) - Number(/ascension/i.test(a.path)) || a.path.length - b.path.length);
    for (const c of candidats.slice(0, 5)) {
      try {
        const doc = JSON.parse(depuisBase64((await this.requete('GET', `/git/blobs/${c.sha}`)).content));
        if (String(doc.format || '').startsWith('ascension/jeu')) return c.path.replace(/\/?jeu\.json$/, '');
      } catch (e) {
        /* candidat illisible : on passe au suivant */
      }
    }
    throw new ErreurDepot('introuvable', 'Aucun fichier jeu.json d’Ascension dans ce dépôt. Le Système doit d’abord y déposer les données du jeu.');
  }
}
