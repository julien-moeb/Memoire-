/** Cotations propres aux exercices de mémoire épisodique. Fonctions pures, testées. */
import { normaliser, sansAccents } from '../moteur/saisie-libre';

const cle = (s: string) => sansAccents(normaliser(s));

/**
 * Rappel libre d'un paragraphe : une idée clé est retrouvée si l'une de ses formes (séparées par « | »)
 * apparaît dans le texte rappelé. Les formes sont comparées sans accents ni casse, en tant que début de mot,
 * ce qui accepte les pluriels et les dérivés simples (« subvention » retrouve « subventions »).
 */
export function unitesRetrouvees(rappel: string, unites: readonly string[]): { retrouvees: string[]; manquees: string[] } {
  const texte = ` ${cle(rappel).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const retrouvees: string[] = [];
  const manquees: string[] = [];
  for (const u of unites) {
    const formes = u.split('|').map((f) => cle(f).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()).filter(Boolean);
    if (formes.some((f) => texte.includes(` ${f}`))) retrouvees.push(u.split('|')[0]!);
    else manquees.push(u.split('|')[0]!);
  }
  return { retrouvees, manquees };
}

export const STRATEGIES_ENCODAGE = [
  {
    id: 'categories',
    titre: 'Regrouper par catégories',
    texte: "Repérez les familles de mots (aliments, objets, lieux…) et mémorisez la liste par groupes. Au rappel, parcourez les catégories une à une.",
  },
  {
    id: 'histoire',
    titre: 'Relier par une histoire',
    texte: "Enchaînez les mots dans une petite histoire, même absurde, où chacun joue un rôle. Au rappel, racontez-vous l'histoire.",
  },
  {
    id: 'images',
    titre: 'Créer des images en interaction',
    texte: "Associez les mots deux par deux dans une image mentale vive où ils agissent l'un sur l'autre (une valise qui avale un citron).",
  },
] as const;

/** Stratégie du jour : rotation régulière, pour les exercer toutes. */
export function strategieDuJour(rang: number) {
  return STRATEGIES_ENCODAGE[rang % STRATEGIES_ENCODAGE.length]!;
}

/** Identifiant de la liste apprise à rappeler le lendemain : `<item>:<longueur>`. */
export const codeListe = (itemId: string, longueur: number) => `${itemId}:${longueur}`;
export function decoderListe(code: string): { itemId: string; longueur: number } {
  const [itemId, l] = code.split(':');
  return { itemId: itemId!, longueur: Number(l) || 15 };
}
