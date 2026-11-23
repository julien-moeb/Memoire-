/** Normalisation et comparaison des réponses tapées librement. */

export interface OptionsNormalisation {
  ignorerAccents?: boolean;
  /** Retire un article initial (le, la, l', les, un, une, des). */
  retirerArticle?: boolean;
}

const ARTICLES = /^(?:l'|le |la |les |un |une |des |du |de la |de l')/;

export function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function normaliser(saisie: string, options: OptionsNormalisation = {}): string {
  let s = saisie
    .normalize('NFC')
    .replace(/[’‘ʼ]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?]+$/u, '');
  if (options.retirerArticle) s = s.replace(ARTICLES, '').trim();
  if (options.ignorerAccents) s = sansAccents(s);
  return s;
}

/** Deux formes normalisées sont équivalentes si elles ne diffèrent que par un pluriel simple en -s ou -x. */
export function equivalentes(a: string, b: string): boolean {
  if (a === b) return true;
  const pluriel = (x: string, y: string) => x.length > 2 && (y === `${x}s` || y === `${x}x`);
  return pluriel(a, b) || pluriel(b, a);
}

export function correspond(saisie: string, attendues: readonly string[], options: OptionsNormalisation = {}): boolean {
  const opts = { retirerArticle: true, ...options };
  const s = normaliser(saisie, opts);
  if (!s) return false;
  return attendues.some((a) => equivalentes(s, normaliser(a, opts)));
}

export interface ResultatDeduplication {
  uniques: string[];
  doublons: string[];
}

/** Déduplication en fluence : accents ignorés, pluriels simples rapprochés, ordre de production conservé. */
export function dedupliquer(mots: readonly string[]): ResultatDeduplication {
  const vus: string[] = [];
  const uniques: string[] = [];
  const doublons: string[] = [];
  for (const mot of mots) {
    const n = normaliser(mot, { ignorerAccents: true });
    if (!n) continue;
    if (vus.some((v) => equivalentes(v, n))) doublons.push(mot);
    else {
      vus.push(n);
      uniques.push(mot);
    }
  }
  return { uniques, doublons };
}

export interface SaisieHorodatee {
  mot: string;
  /** Instant de validation, en ms depuis le début de l'épreuve. */
  tMs: number;
}

/** Production par tranches (15 s par défaut) : la pente renseigne sur l'épuisement des ressources. */
export function productionParTranche(saisies: readonly SaisieHorodatee[], dureeMs = 60_000, trancheMs = 15_000): number[] {
  const n = Math.ceil(dureeMs / trancheMs);
  const tranches = new Array<number>(n).fill(0);
  for (const s of saisies) {
    if (s.tMs < 0 || s.tMs >= dureeMs) continue;
    const i = Math.floor(s.tMs / trancheMs);
    tranches[i] = (tranches[i] ?? 0) + 1;
  }
  return tranches;
}

/** Pente (mots par tranche) par moindres carrés ; négative quand la production s'épuise. */
export function pente(valeurs: readonly number[]): number {
  const n = valeurs.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = valeurs.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  valeurs.forEach((v, i) => {
    num += (i - mx) * (v - my);
    den += (i - mx) ** 2;
  });
  return num / den;
}
