/**
 * Calculs purs liés au chronométrage (testables hors navigateur).
 *
 * Les durées de présentation sont exprimées en NOMBRE D'IMAGES : un écran à 60 Hz ne peut
 * afficher un stimulus que pendant un multiple de 16,7 ms. Demander 50 ms revient à 3 images.
 */
import { ecartType, mediane } from '../moteur/statistiques';

export interface FrequenceAffichage {
  periodeMs: number;
  frequenceHz: number;
  gigueMs: number;
}

/** Estime la période d'affichage à partir d'horodatages successifs de requestAnimationFrame. */
export function frequenceDepuisHorodatages(horodatages: readonly number[]): FrequenceAffichage | null {
  if (horodatages.length < 3) return null;
  const deltas: number[] = [];
  for (let i = 1; i < horodatages.length; i++) deltas.push(horodatages[i]! - horodatages[i - 1]!);
  const periodeMs = mediane(deltas);
  if (!(periodeMs > 0)) return null;
  // On écarte les images manquées (deltas ≥ 1,5 période) pour estimer la gigue propre.
  const reguliers = deltas.filter((d) => d < periodeMs * 1.5);
  return {
    periodeMs,
    frequenceHz: 1000 / periodeMs,
    gigueMs: reguliers.length > 1 ? ecartType(reguliers) : 0,
  };
}

export function imagesPourDuree(dureeMs: number, periodeMs: number): number {
  return Math.max(1, Math.round(dureeMs / periodeMs));
}

export function dureePourImages(images: number, periodeMs: number): number {
  return images * periodeMs;
}

/** Écart entre la durée effectivement mesurée et la durée prévue (positif = affichage trop long). */
export function ecartAffichage(mesureeMs: number, images: number, periodeMs: number): number {
  return mesureeMs - dureePourImages(images, periodeMs);
}

/** Identifiant stable d'un appareil, dérivé de ses caractéristiques (aucune donnée personnelle). */
export function empreinteAppareil(parties: readonly (string | number)[]): string {
  let h = 2166136261;
  for (const c of parties.join('|')) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return `app-${(h >>> 0).toString(36)}`;
}
