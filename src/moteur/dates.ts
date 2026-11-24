/** Dates calendaires locales au format AAAA-MM-JJ, indépendantes du fuseau UTC. */

export type DateLocale = string;

export function dateLocale(d: Date = new Date()): DateLocale {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${j}`;
}

export function versDate(s: DateLocale): Date {
  const [a, m, j] = s.split('-').map(Number);
  return new Date(a ?? 1970, (m ?? 1) - 1, j ?? 1);
}

export function ajouterJours(s: DateLocale, n: number): DateLocale {
  const d = versDate(s);
  d.setDate(d.getDate() + n);
  return dateLocale(d);
}

/** Nombre de jours calendaires de a vers b (positif si b est après a). */
export function ecartJours(a: DateLocale, b: DateLocale): number {
  return Math.round((versDate(b).getTime() - versDate(a).getTime()) / 86_400_000);
}

/** Date locale lisible, par exemple « 22 février 2027 ». */
export function formatDate(s: DateLocale): string {
  return versDate(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
