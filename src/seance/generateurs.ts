/** Générateurs d'essais des exercices à choix rapide. Fonctions pures, testées. */
import { choisir, entier, melanger, type Alea } from '../moteur/alea';
import { COULEURS } from '../bilan/generateurs';
import type { EssaiChoixGenere, OptionChoix } from './composants/BlocChoix';
import * as N from './niveaux';
import type { ItemDiscrimination, ItemIntrus } from '../contenu/schemas';

const OPTIONS_MOT: OptionChoix[] = [
  { valeur: 'mot', libelle: 'Mot', touche: 'f' },
  { valeur: 'non-mot', libelle: 'Pas un mot', touche: 'j' },
];

export function essaiDecisionLexicale(niveau: number, alea: Alea, mots: readonly string[], pseudo: readonly string[]): EssaiChoixGenere {
  const estMot = alea() < 0.5;
  const texte = choisir(estMot ? mots : pseudo, alea);
  return { itemId: null, texte, options: OPTIONS_MOT, attendue: estMot ? 'mot' : 'non-mot', delaiMaxMs: N.decisionLexicale(niveau).delaiMaxMs };
}

export const SYMBOLES = ['◆', '●', '▲', '■', '★', '✚', '◗', '◖', '▼', '◉'];

/** Deux suites de symboles identiques ou différant d'un seul symbole (à position quelconque). */
export function essaiAppariement(niveau: number, alea: Alea): EssaiChoixGenere {
  const { longueur, delaiMaxMs } = N.appariement(niveau);
  const a = Array.from({ length: longueur }, () => choisir(SYMBOLES, alea));
  const b = [...a];
  const pareil = alea() < 0.5;
  if (!pareil) {
    const k = entier(alea, 0, longueur - 1);
    b[k] = choisir(SYMBOLES.filter((s) => s !== a[k]), alea);
  }
  return {
    texte: `${a.join(' ')}\n${b.join(' ')}`,
    taille: '2rem',
    options: [
      { valeur: 'pareil', libelle: 'Pareil', touche: 'f' },
      { valeur: 'different', libelle: 'Différent', touche: 'j' },
    ],
    attendue: pareil ? 'pareil' : 'different',
    delaiMaxMs,
  };
}

const LETTRES_GO = ['A', 'B', 'D', 'E', 'H', 'K', 'M', 'P', 'R', 'S', 'T', 'V'];

export function essaiGoNogo(niveau: number, alea: Alea): EssaiChoixGenere {
  const { delaiMaxMs, intervalleMs } = N.goNogo(niveau);
  const nogo = alea() < 0.2;
  return {
    texte: nogo ? 'X' : choisir(LETTRES_GO, alea),
    options: [{ valeur: 'go', libelle: 'Appuyer', touche: 'espace' }],
    attendue: nogo ? null : 'go',
    delaiMaxMs,
    intervalleMs,
  };
}

export function essaiStroop(niveau: number, alea: Alea): EssaiChoixGenere {
  const { delaiMaxMs, partConflit } = N.stroop(niveau);
  const encre = choisir(COULEURS, alea);
  const conflit = alea() < partConflit;
  const mot = conflit ? choisir(COULEURS.filter((c) => c.nom !== encre.nom), alea) : encre;
  return {
    texte: mot.nom.toUpperCase(),
    couleur: encre.valeur,
    options: COULEURS.map((c) => ({ valeur: c.nom, libelle: c.nom[0]!.toUpperCase() + c.nom.slice(1), touche: c.cle })),
    attendue: encre.nom,
    delaiMaxMs,
  };
}

const VOYELLES = ['A', 'E', 'I', 'U'];
const CONSONNES = ['G', 'K', 'M', 'R'];

/**
 * Alternance indicée en séquences AABB : la règle change tous les deux essais.
 * Règle « chiffre » : pair ou impair ; règle « lettre » : voyelle ou consonne.
 * Une même touche sert pour « pair » et « voyelle », l'autre pour « impair » et « consonne ».
 */
export function essaiAlternance(niveau: number, alea: Alea, index: number): EssaiChoixGenere {
  const regle = Math.floor(index / 2) % 2 === 0 ? 'chiffre' : 'lettre';
  const lettre = alea() < 0.5 ? choisir(VOYELLES, alea) : choisir(CONSONNES, alea);
  const chiffre = entier(alea, 2, 9);
  const gauche = regle === 'chiffre' ? chiffre % 2 === 0 : VOYELLES.includes(lettre);
  return {
    contexte: regle === 'chiffre' ? 'Le chiffre : pair ou impair ?' : 'La lettre : voyelle ou consonne ?',
    texte: `${chiffre}${lettre}`,
    options: [
      { valeur: 'gauche', libelle: 'Pair / voyelle', touche: 'f' },
      { valeur: 'droite', libelle: 'Impair / consonne', touche: 'j' },
    ],
    attendue: gauche ? 'gauche' : 'droite',
    delaiMaxMs: N.alternance(niveau).delaiMaxMs,
  };
}

/** Délai généreux des exercices lexicaux : la précision prime, pas la vitesse. */
export const DELAI_LEXICAL_MS = 20_000;

export function essaiDiscrimination(item: ItemDiscrimination, alea: Alea): EssaiChoixGenere {
  const options = melanger(item.options, alea).map((o, k) => ({ valeur: o, libelle: o, touche: String(k + 1) }));
  return {
    itemId: item.id,
    contexte: item.phrase.replace('___', '…'),
    texte: '',
    options,
    attendue: item.reponse,
    delaiMaxMs: DELAI_LEXICAL_MS,
    explication: item.explication,
  };
}

export function essaiIntrus(item: ItemIntrus, alea: Alea): EssaiChoixGenere {
  const options = melanger(item.mots, alea).map((o, k) => ({ valeur: o, libelle: o, touche: String(k + 1) }));
  return {
    itemId: item.id,
    contexte: 'Quel mot ne va pas avec les autres ?',
    texte: '',
    options,
    attendue: item.intrus,
    delaiMaxMs: DELAI_LEXICAL_MS,
    explication: item.explication,
  };
}

/** Flux n-back : environ 30 % de cibles, et quelques leurres à n − 1 pour éviter la simple familiarité. */
export function fluxNBack(n: number, longueur: number, alea: Alea): { lettre: string; cible: boolean }[] {
  const lettres = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'V'];
  const r: { lettre: string; cible: boolean }[] = [];
  for (let i = 0; i < longueur; i++) {
    if (i >= n && alea() < 0.3) {
      r.push({ lettre: r[i - n]!.lettre, cible: true });
      continue;
    }
    let l = choisir(lettres, alea);
    // un leurre n − 1 de temps en temps, mais jamais de cible involontaire
    if (i >= n - 1 && n > 1 && alea() < 0.1) l = r[i - (n - 1)]!.lettre;
    while (i >= n && l === r[i - n]!.lettre) l = choisir(lettres, alea);
    r.push({ lettre: l, cible: false });
  }
  return r;
}
