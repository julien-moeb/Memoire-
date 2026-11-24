/** Génération reproductible des essais des épreuves procédurales du bilan. */
import { choisir, entier, melanger, type Alea } from '../moteur/alea';

export interface EssaiGenere<S = string> {
  condition: string;
  stimulus: S;
  /** Valeur de la réponse attendue ; null = ne pas répondre (no-go). */
  attendue: string | null;
}

/** Évite plus de `max` répétitions consécutives d'une même condition. */
function limiterRepetitions<T extends { condition: string }>(t: T[], alea: Alea, max = 3): T[] {
  for (let essai = 0; essai < 50; essai++) {
    let ok = true;
    for (let i = max; i < t.length; i++) {
      if (t.slice(i - max, i + 1).every((x) => x.condition === t[i]!.condition)) {
        ok = false;
        break;
      }
    }
    if (ok) return t;
    t = melanger(t, alea);
  }
  return t;
}

export function essaisDecisionLexicale(mots: readonly string[], pseudoMots: readonly string[], alea: Alea): EssaiGenere[] {
  const t = [
    ...mots.map((m) => ({ condition: 'mot', stimulus: m, attendue: 'mot' })),
    ...pseudoMots.map((m) => ({ condition: 'non-mot', stimulus: m, attendue: 'non-mot' })),
  ];
  return limiterRepetitions(melanger(t, alea), alea);
}

const LETTRES_GO = ['A', 'B', 'D', 'E', 'H', 'K', 'M', 'P', 'R', 'S', 'T', 'V'];

export function essaisGoNoGo(n: number, proportionNoGo: number, alea: Alea): EssaiGenere[] {
  const nNoGo = Math.round(n * proportionNoGo);
  const t: EssaiGenere[] = [
    ...Array.from({ length: n - nNoGo }, () => ({ condition: 'go', stimulus: choisir(LETTRES_GO, alea), attendue: 'go' })),
    ...Array.from({ length: nNoGo }, () => ({ condition: 'nogo', stimulus: 'X', attendue: null })),
  ];
  return limiterRepetitions(melanger(t, alea), alea, 2);
}

export const COULEURS = [
  { nom: 'rouge', valeur: '#d32f2f', cle: 'd' },
  { nom: 'vert', valeur: '#2e7d32', cle: 'f' },
  { nom: 'bleu', valeur: '#1565c0', cle: 'j' },
  { nom: 'jaune', valeur: '#c79100', cle: 'k' },
] as const;

export interface StimulusStroop {
  mot: string;
  encre: string;
}

export function essaisStroop(n: number, alea: Alea): EssaiGenere<StimulusStroop>[] {
  const t: EssaiGenere<StimulusStroop>[] = [];
  for (let i = 0; i < n; i++) {
    const encre = choisir(COULEURS, alea);
    const congruent = i < n / 2;
    const mot = congruent ? encre : choisir(COULEURS.filter((c) => c.nom !== encre.nom), alea);
    t.push({
      condition: congruent ? 'congruent' : 'incongruent',
      stimulus: { mot: mot.nom.toUpperCase(), encre: encre.valeur },
      attendue: encre.nom,
    });
  }
  return limiterRepetitions(melanger(t, alea), alea);
}

export interface StimulusAlternance {
  lettre: string;
  chiffre: number;
  position: 'haut' | 'bas';
}

const VOYELLES = ['A', 'E', 'I', 'U'];
const CONSONNES = ['G', 'K', 'M', 'R'];

/**
 * Paradigme des séquences alternées (AABB…) : la position change toutes les deux épreuves,
 * de sorte que la moitié des essais sont des changements de tâche, prévisibles.
 */
export function essaisAlternance(n: number, alea: Alea): EssaiGenere<StimulusAlternance>[] {
  const t: EssaiGenere<StimulusAlternance>[] = [];
  for (let i = 0; i < n; i++) {
    const position = Math.floor(i / 2) % 2 === 0 ? 'haut' : 'bas';
    const lettre = alea() < 0.5 ? choisir(VOYELLES, alea) : choisir(CONSONNES, alea);
    const chiffre = entier(alea, 2, 9);
    const attendue = position === 'haut' ? (chiffre % 2 === 0 ? 'pair' : 'impair') : VOYELLES.includes(lettre) ? 'voyelle' : 'consonne';
    t.push({ condition: i % 2 === 0 ? 'changement' : 'repetition', stimulus: { lettre, chiffre, position }, attendue });
  }
  // Les réponses « pair » et « voyelle » partagent la même touche, « impair » et « consonne » l'autre.
  if (t[0]) t[0] = { ...t[0], condition: 'premier' };
  return t;
}

export function essaisParite(n: number, alea: Alea): EssaiGenere<number>[] {
  return Array.from({ length: n }, () => {
    const c = entier(alea, 1, 9);
    return { condition: 'parite', stimulus: c, attendue: c % 2 === 0 ? 'pair' : 'impair' };
  });
}

/** Indices des essais (0-based) pendant lesquels un éclair périphérique apparaît. */
export function eclairs(n: number, nombre: number, alea: Alea): number[] {
  return melanger(Array.from({ length: n - 2 }, (_, i) => i + 1), alea).slice(0, nombre).sort((a, b) => a - b);
}

export function sequenceChiffres(longueur: number, alea: Alea): string[] {
  const r: string[] = [];
  while (r.length < longueur) {
    const c = String(entier(alea, 1, 9));
    if (r.at(-1) !== c) r.push(c);
  }
  return r;
}

const LETTRES_FLUX = ['B', 'F', 'H', 'J', 'K', 'L', 'M', 'Q', 'R', 'S', 'T', 'X'];

/** Mise à jour : flux de longueur imprévisible (6 à 12 lettres). */
export function fluxMiseAJour(alea: Alea): string[] {
  const n = entier(alea, 6, 12);
  const r: string[] = [];
  while (r.length < n) {
    const l = choisir(LETTRES_FLUX, alea);
    if (r.at(-1) !== l) r.push(l);
  }
  return r;
}

/** Double décision : forme centrale et position périphérique (8 positions, à 45°). */
export interface EssaiDoubleDecision {
  forme: 'voiture' | 'camion';
  position: number;
}

export function essaisDoubleDecision(n: number, alea: Alea): EssaiDoubleDecision[] {
  return Array.from({ length: n }, () => ({ forme: alea() < 0.5 ? 'voiture' : 'camion', position: entier(alea, 0, 7) }));
}
