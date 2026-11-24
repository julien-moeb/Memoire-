/** Accès au contenu d'entraînement, regroupé par type (les items réservés au bilan en sont exclus). */
import { seriesDeType } from '../contenu/chargeur';

export const definitions = () => seriesDeType('definition-mot').flatMap((s) => s.items.map((i) => ({ ...i, paquet: s.id })));
export const discriminations = () => seriesDeType('discrimination').flatMap((s) => s.items);
export const intrus = () => seriesDeType('intrus').flatMap((s) => s.items);
export const registres = () => seriesDeType('registre').flatMap((s) => s.items);
export const traits = () => seriesDeType('traits').flatMap((s) => s.items);
export const listes = () => seriesDeType('liste-memoire').flatMap((s) => s.items);
export const paragraphes = () => seriesDeType('paragraphe').flatMap((s) => s.items);
export const fluences = () => seriesDeType('fluence').flatMap((s) => s.items.filter((i) => !i.reserveBilan));
export const cartesLexique = () => seriesDeType('carte-lexique').flatMap((s) => s.items.map((i) => ({ ...i, paquet: s.id, theme: s.theme })));

export function motsDecision() {
  const s = seriesDeType('decision-lexicale');
  return { mots: s.flatMap((x) => x.mots), pseudoMots: s.flatMap((x) => x.pseudoMots) };
}
