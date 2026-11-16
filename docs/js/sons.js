/* Ascension — petits sons synthétisés (aucun fichier audio). Coupés par le mode silencieux de l'iPhone. */
let contexte = null;
let actifs = true;

export function reglerSons(v) {
  actifs = !!v;
}

function note(frequence, debut, duree, { type = 'triangle', volume = 0.07 } = {}) {
  if (!actifs) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!contexte) contexte = new Ctx();
    if (contexte.state === 'suspended') contexte.resume();
    const t = contexte.currentTime + debut;
    const osc = contexte.createOscillator();
    const gain = contexte.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequence, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    osc.connect(gain).connect(contexte.destination);
    osc.start(t);
    osc.stop(t + duree + 0.03);
  } catch (e) {
    /* pas de son : sans importance */
  }
}

export const sons = {
  quete() {
    note(659, 0, 0.13);
    note(988, 0.07, 0.2);
  },
  annule() {
    note(330, 0, 0.14, { type: 'sine', volume: 0.05 });
  },
  hebdo() {
    [523, 784, 1047].forEach((f, i) => note(f, i * 0.07, 0.24));
  },
  coffre() {
    [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.085, 0.32));
    note(1568, 0.36, 0.5, { type: 'sine', volume: 0.05 });
  },
  niveau() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.095, 0.55, { volume: 0.08 }));
    note(196, 0, 0.9, { type: 'sine', volume: 0.06 });
  },
  succes() {
    [784, 988, 1175, 1568].forEach((f, i) => note(f, i * 0.07, 0.3, { type: 'sine', volume: 0.06 }));
  },
  touche() {
    note(520, 0, 0.05, { type: 'sine', volume: 0.03 });
  },
};
