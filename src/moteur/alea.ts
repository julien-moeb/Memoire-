/** Générateur pseudo-aléatoire reproductible (mulberry32) : un même bilan peut être rejoué à l'identique. */
export type Alea = () => number;

export function creerAlea(graine: number): Alea {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function entier(alea: Alea, min: number, max: number): number {
  return min + Math.floor(alea() * (max - min + 1));
}

export function melanger<T>(t: readonly T[], alea: Alea): T[] {
  const r = [...t];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

export function choisir<T>(t: readonly T[], alea: Alea): T {
  return t[Math.floor(alea() * t.length)]!;
}

/** Graine dérivée d'un texte (identifiant de bilan). */
export function graineDe(texte: string): number {
  let h = 2166136261;
  for (const c of texte) h = Math.imul(h ^ c.codePointAt(0)!, 16777619);
  return h >>> 0;
}
