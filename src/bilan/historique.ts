/** Lecture et organisation des bilans enregistrés. */
import type { Base } from '../stockage/db';
import type { Bilan } from '../stockage/types';
import { ajouterJours, type DateLocale } from '../moteur/dates';
import { scoresIndicatifs } from './protocole';

export const FORMES = ['A', 'B', 'C', 'D'] as const;
export const INTERVALLE_BILAN_JOURS = 91;

export interface BilanComplet {
  groupe: string;
  forme: Bilan['forme'];
  date: DateLocale;
  parties: Bilan[];
  metriques: Record<string, number>;
  complet: boolean;
}

export function regrouper(bilans: readonly Bilan[]): BilanComplet[] {
  const groupes = new Map<string, Bilan[]>();
  for (const b of bilans) groupes.set(b.groupe, [...(groupes.get(b.groupe) ?? []), b]);
  return [...groupes.entries()]
    .map(([groupe, parties]) => {
      const tri = [...parties].sort((a, b) => a.partie - b.partie);
      return {
        groupe,
        forme: tri[0]!.forme,
        date: tri[0]!.date,
        parties: tri,
        metriques: Object.assign({}, ...tri.map((p) => p.metriques)) as Record<string, number>,
        complet: tri.some((p) => p.partie === 1) && tri.some((p) => p.partie === 2),
      };
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Forme suivante : rotation A, B, C, D selon le nombre de bilans complets. */
export function formeSuivante(groupes: readonly BilanComplet[]): Bilan['forme'] {
  return FORMES[groupes.filter((g) => g.complet).length % FORMES.length]!;
}

export function prochainBilanConseille(groupes: readonly BilanComplet[]): DateLocale | null {
  const dernier = [...groupes].reverse().find((g) => g.complet);
  return dernier ? ajouterJours(dernier.date, INTERVALLE_BILAN_JOURS) : null;
}

export function scoresDuBilan(b: BilanComplet) {
  return scoresIndicatifs(b.metriques);
}

export async function lireBilans(db: Base | null): Promise<BilanComplet[]> {
  if (!db) return [];
  return regrouper(await db.getAll('bilans'));
}
