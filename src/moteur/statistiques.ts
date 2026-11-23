/** Statistiques descriptives et intra-individuelles. Aucune norme de population n'est utilisée. */
import { ecartJours, type DateLocale } from './dates';

export function moyenne(v: readonly number[]): number {
  if (v.length === 0) return NaN;
  return v.reduce((s, x) => s + x, 0) / v.length;
}

/** Écart-type d'échantillon (dénominateur n − 1). */
export function ecartType(v: readonly number[]): number {
  if (v.length < 2) return NaN;
  const m = moyenne(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

export function mediane(v: readonly number[]): number {
  if (v.length === 0) return NaN;
  const t = [...v].sort((a, b) => a - b);
  const mil = Math.floor(t.length / 2);
  return t.length % 2 ? t[mil]! : (t[mil - 1]! + t[mil]!) / 2;
}

/** Sens d'une métrique : « haut » si une valeur élevée est meilleure (mots produits), « bas » sinon (temps). */
export type Sens = 'haut' | 'bas';

export interface OptionsZ {
  sens: Sens;
  /** Plancher absolu de l'écart-type, dans l'unité de la métrique. */
  plancherAbsolu?: number;
  /** Plancher relatif : fraction de |moyenne de référence| (5 % par défaut). */
  plancherRelatif?: number;
}

/**
 * Écart à la ligne de base personnelle (« z interne »), orienté pour que positif = mieux.
 * Le plancher évite des valeurs extrêmes quand les séances de référence sont très régulières.
 * Renvoie null si la référence compte moins de 3 valeurs.
 */
export function zInterne(valeur: number, reference: readonly number[], options: OptionsZ): number | null {
  if (reference.length < 3) return null;
  const m = moyenne(reference);
  const sd = ecartType(reference);
  const plancher = Math.max(options.plancherAbsolu ?? 0, (options.plancherRelatif ?? 0.05) * Math.abs(m));
  const sdEff = Math.max(sd, plancher);
  if (!(sdEff > 0)) return null;
  const z = (valeur - m) / sdEff;
  return options.sens === 'haut' ? z : -z;
}

export interface Point {
  date: DateLocale;
  valeur: number;
}

/**
 * Moyenne mobile sur `fenetreJours` jours CALENDAIRES (et non sur les n dernières séances) :
 * pour chaque date observée, moyenne des valeurs des dates comprises dans [date − (fenêtre − 1), date].
 */
export function moyenneMobile(points: readonly Point[], fenetreJours = 7): Point[] {
  const tries = [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const dates = [...new Set(tries.map((p) => p.date))];
  return dates.map((d) => {
    const fenetre = tries.filter((p) => {
      const e = ecartJours(p.date, d);
      return e >= 0 && e < fenetreJours;
    });
    return { date: d, valeur: moyenne(fenetre.map((p) => p.valeur)) };
  });
}

function rangs(v: readonly number[]): number[] {
  const indexes = v.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x);
  const r = new Array<number>(v.length);
  let k = 0;
  while (k < indexes.length) {
    let fin = k;
    while (fin + 1 < indexes.length && indexes[fin + 1]!.x === indexes[k]!.x) fin++;
    const rangMoyen = (k + fin) / 2 + 1;
    for (let j = k; j <= fin; j++) r[indexes[j]!.i] = rangMoyen;
    k = fin + 1;
  }
  return r;
}

function pearson(x: readonly number[], y: readonly number[]): number | null {
  const mx = moyenne(x);
  const my = moyenne(y);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < x.length; i++) {
    num += (x[i]! - mx) * (y[i]! - my);
    dx += (x[i]! - mx) ** 2;
    dy += (y[i]! - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/** Corrélation de rangs de Spearman (ex aequo traités par rang moyen). */
export function spearman(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length) throw new Error('Les deux séries doivent avoir la même longueur');
  if (x.length < 3) return null;
  return pearson(rangs(x), rangs(y));
}

/** Seuil en deçà duquel l'application n'affiche aucune corrélation avec le contexte. */
export const SEANCES_MIN_CORRELATION = 30;

export function correlationAffichable(nombreSeances: number): boolean {
  return nombreSeances >= SEANCES_MIN_CORRELATION;
}

/**
 * Pourcentage du maximum possible (POMP), borné entre 0 et 100.
 * Sert uniquement au radar indicatif du premier bilan.
 */
export function pourcentageDuMaximum(valeur: number, min: number, max: number, sens: Sens = 'haut'): number {
  if (max === min) return NaN;
  const p = ((valeur - min) / (max - min)) * 100;
  const oriente = sens === 'haut' ? p : 100 - p;
  return Math.min(100, Math.max(0, oriente));
}
