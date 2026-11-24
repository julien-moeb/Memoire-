import type { Base } from './db';
import { DOMAINES, type Domaine, type Reglages } from './types';

export const REGLAGES_PAR_DEFAUT: Reglages = {
  id: 'reglages',
  theme: 'auto',
  taillePolice: 100,
  jourRepos: 0,
  domainePrioritaire: 'acces-lexical',
  ponderations: Object.fromEntries(DOMAINES.map((d) => [d, d === 'acces-lexical' ? 2 : 1])) as Record<Domaine, number>,
  ignorerAccents: false,
  modeOral: false,
  derniereSauvegarde: null,
};

const CLE_REPLI = 'lexique.reglages';

/** Complète des réglages partiels (anciens ou importés) avec les valeurs par défaut. */
export function completerReglages(partiels: Partial<Reglages> | undefined | null): Reglages {
  return {
    ...REGLAGES_PAR_DEFAUT,
    ...(partiels ?? {}),
    ponderations: { ...REGLAGES_PAR_DEFAUT.ponderations, ...(partiels?.ponderations ?? {}) },
    id: 'reglages',
  };
}

export async function lireReglages(db: Base | null): Promise<Reglages> {
  if (db) return completerReglages(await db.get('reglages', 'reglages'));
  try {
    const brut = localStorage.getItem(CLE_REPLI);
    return completerReglages(brut ? (JSON.parse(brut) as Partial<Reglages>) : null);
  } catch {
    return REGLAGES_PAR_DEFAUT;
  }
}

export async function ecrireReglages(db: Base | null, r: Reglages): Promise<void> {
  if (db) {
    await db.put('reglages', r);
    return;
  }
  try {
    localStorage.setItem(CLE_REPLI, JSON.stringify(r));
  } catch {
    /* stockage indisponible : les réglages restent valables pour la session */
  }
}
