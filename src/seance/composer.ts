/**
 * Composition de la séance du jour. Fonction pure : elle ne lit ni la base ni l'horloge,
 * ce qui permet de tester toutes les règles du programme.
 */
import { DOMAINES, type Domaine } from '../stockage/types';
import { ecartJours, versDate, type DateLocale } from '../moteur/dates';
import { EXERCICES_PAR_DOMAINE, type IdExercice } from './catalogue';

export const DUREE_CIBLE_MS = 4 * 60_000;
export const DUREE_VITESSE_MS = 4 * 60_000;
export const DUREE_ECHAUFFEMENT_MS = 90_000;
export const CARTES_MAX = 15;
export const DUREE_COMPORTEMENTALE_MS = 10 * 60_000;
/** Séances terminées requises avant la première séance comportementale. */
export const SEANCES_AVANT_COMPORTEMENTAL = 4;

export type Bloc =
  | { type: 'rappel-differe'; rappelId: string; listeId: string }
  | { type: 'echauffement' }
  | { type: 'exercice'; exercice: IdExercice; dureeMs: number; role: 'cible' | 'vitesse' | 'maintien' }
  | { type: 'repetition-espacee'; max: number }
  | { type: 'comportemental'; dureeMs: number };

export interface SeancePassee {
  date: DateLocale;
  /** Identifiants des exercices réalisés (blocs `exercice`). */
  exercices: readonly string[];
  /** Vrai si la séance comportait le volet comportemental hebdomadaire. */
  comportemental?: boolean;
}

export interface EntreeComposition {
  date: DateLocale;
  jourRepos: number;
  domainePrioritaire: Domaine;
  /** Séances terminées, de la plus ancienne à la plus récente. */
  historique: readonly SeancePassee[];
  rappelsDus: readonly { id: string; listeId: string }[];
}

export type Composition =
  | { disponible: true; blocs: Bloc[] }
  | { disponible: false; raison: 'repos' | 'deja-faite' };

/**
 * Règle « au moins quatre séances sur six » pour la double décision : elle est programmée sauf si
 * quatre des cinq dernières séances l'ont déjà comportée et que la dernière en faisait partie.
 * Il en résulte en régime établi un jour de maintien toutes les cinq séances environ.
 */
export function doubleDecisionDuJour(historique: readonly SeancePassee[]): boolean {
  const cinq = historique.slice(-5);
  const avecDD = cinq.filter((s) => s.exercices.includes('double-decision')).length;
  const derniere = cinq.at(-1);
  return !(avecDD >= 4 && derniere?.exercices.includes('double-decision'));
}

/**
 * Séance comportementale hebdomadaire (journal, fiche de stratégie, régulation de l'activation) :
 * elle remplace les exercices ciblés un jour par semaine, dès la cinquième séance, si aucune
 * séance des six jours précédents ne l'a comportée.
 */
export function comportementalDuJour(historique: readonly SeancePassee[], date: DateLocale): boolean {
  if (historique.length < SEANCES_AVANT_COMPORTEMENTAL) return false;
  return !historique.some((s) => s.comportemental && ecartJours(s.date, date) < 7);
}

/** Deux exercices distincts du domaine prioritaire, en rotation d'une séance à l'autre. */
export function exercicesCibles(domaine: Domaine, rang: number): IdExercice[] {
  const pool = EXERCICES_PAR_DOMAINE[domaine];
  if (pool.length === 1) return [pool[0]!];
  const a = pool[(rang * 2) % pool.length]!;
  let b = pool[(rang * 2 + 1) % pool.length]!;
  if (b === a) b = pool[(rang * 2 + 2) % pool.length]!;
  return [a, b];
}

/** Exercice de maintien des jours sans double décision : un autre domaine, à tour de rôle. */
export function exerciceMaintien(domaine: Domaine, rang: number, exclus: readonly IdExercice[]): IdExercice {
  const autres = DOMAINES.filter((d) => d !== domaine && d !== 'vitesse');
  for (let k = 0; k < autres.length; k++) {
    const d = autres[(rang + k) % autres.length]!;
    const pool = EXERCICES_PAR_DOMAINE[d].filter((e) => !exclus.includes(e));
    if (pool.length) return pool[Math.floor(rang / autres.length) % pool.length]!;
  }
  return 'decision-lexicale';
}

export function composerSeance(e: EntreeComposition): Composition {
  if (versDate(e.date).getDay() === e.jourRepos) return { disponible: false, raison: 'repos' };
  if (e.historique.some((s) => s.date === e.date)) return { disponible: false, raison: 'deja-faite' };

  const rang = e.historique.length;
  const blocs: Bloc[] = [];
  for (const r of e.rappelsDus) blocs.push({ type: 'rappel-differe', rappelId: r.id, listeId: r.listeId });
  blocs.push({ type: 'echauffement' });
  const comportemental = comportementalDuJour(e.historique, e.date);
  const cibles = comportemental ? [] : exercicesCibles(e.domainePrioritaire, rang);
  if (comportemental) blocs.push({ type: 'comportemental', dureeMs: DUREE_COMPORTEMENTALE_MS });
  for (const c of cibles) blocs.push({ type: 'exercice', exercice: c, dureeMs: DUREE_CIBLE_MS, role: 'cible' });
  if (doubleDecisionDuJour(e.historique)) {
    blocs.push({ type: 'exercice', exercice: 'double-decision', dureeMs: DUREE_VITESSE_MS, role: 'vitesse' });
  } else {
    blocs.push({ type: 'exercice', exercice: exerciceMaintien(e.domainePrioritaire, rang, cibles), dureeMs: DUREE_VITESSE_MS, role: 'maintien' });
  }
  blocs.push({ type: 'repetition-espacee', max: CARTES_MAX });
  return { disponible: true, blocs };
}

/** Durée indicative d'une séance composée, en minutes arrondies. */
export function dureeEstimeeMin(blocs: readonly Bloc[]): number {
  let ms = 30_000; // contexte et clôture
  for (const b of blocs) {
    if (b.type === 'exercice' || b.type === 'comportemental') ms += b.dureeMs + 30_000;
    else if (b.type === 'echauffement') ms += DUREE_ECHAUFFEMENT_MS + 30_000;
    else if (b.type === 'repetition-espacee') ms += 150_000;
    else ms += 90_000;
  }
  return Math.round(ms / 60_000);
}
