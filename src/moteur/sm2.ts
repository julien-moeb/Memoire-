/**
 * Répétition espacée SM-2 (Wozniak, 1990).
 *
 * Qualité de rappel q de 0 à 5. Si q ≥ 3 : intervalle 1 jour, puis 6 jours, puis intervalle × facilité.
 * Si q < 3 : l'item recommence à zéro (intervalle 1 jour) et la facilité est conservée,
 * comme dans la description originale de l'algorithme.
 * Facilité : EF' = EF + (0,1 − (5 − q) × (0,08 + (5 − q) × 0,02)), plancher 1,3.
 */
import { ajouterJours, type DateLocale } from './dates';

export interface EtatCarte {
  facilite: number;
  intervalle: number;
  repetitions: number;
  echeance: DateLocale;
  echecs: number;
  derniereRevision: DateLocale | null;
}

export type Qualite = 0 | 1 | 2 | 3 | 4 | 5;

export const FACILITE_INITIALE = 2.5;
export const FACILITE_MIN = 1.3;

export function nouvelleCarte(aujourdhui: DateLocale): EtatCarte {
  return {
    facilite: FACILITE_INITIALE,
    intervalle: 0,
    repetitions: 0,
    echeance: aujourdhui,
    echecs: 0,
    derniereRevision: null,
  };
}

export function nouvelleFacilite(facilite: number, q: Qualite): number {
  const ef = facilite + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return Math.max(FACILITE_MIN, Math.round(ef * 1000) / 1000);
}

export function reviser(carte: EtatCarte, q: Qualite, aujourdhui: DateLocale): EtatCarte {
  if (q < 3) {
    return {
      ...carte,
      repetitions: 0,
      intervalle: 1,
      echecs: carte.echecs + 1,
      echeance: ajouterJours(aujourdhui, 1),
      derniereRevision: aujourdhui,
    };
  }
  const repetitions = carte.repetitions + 1;
  let intervalle: number;
  if (repetitions === 1) intervalle = 1;
  else if (repetitions === 2) intervalle = 6;
  else intervalle = Math.round(carte.intervalle * carte.facilite);
  return {
    ...carte,
    repetitions,
    intervalle,
    facilite: nouvelleFacilite(carte.facilite, q),
    echeance: ajouterJours(aujourdhui, intervalle),
    derniereRevision: aujourdhui,
  };
}

export type Indice = 'aucun' | 'semantique' | 'syllabe';

export interface IssueRappel {
  correcte: boolean;
  indice: Indice;
  /** Temps de réponse en millisecondes, si mesuré. */
  tempsMs?: number;
  /** Au-delà de ce temps, une réussite sans indice est jugée lente. */
  seuilRapideMs?: number;
  /** Une réponse a-t-elle été proposée (même fausse) ? */
  reponseDonnee?: boolean;
}

/**
 * Note de rappel déduite automatiquement :
 * 5 réussite rapide sans indice · 4 réussite lente sans indice · 3 réussite après indice sémantique
 * 2 réussite après indice syllabique (récupération non autonome : l'item est revu dès le lendemain)
 * 1 réponse fausse · 0 aucune réponse.
 */
export function qualiteDepuisIssue(issue: IssueRappel): Qualite {
  if (!issue.correcte) return issue.reponseDonnee === false ? 0 : 1;
  if (issue.indice === 'syllabe') return 2;
  if (issue.indice === 'semantique') return 3;
  const seuil = issue.seuilRapideMs ?? 8000;
  if (issue.tempsMs !== undefined && issue.tempsMs > seuil) return 4;
  return 5;
}

/** Cartes arrivées à échéance, les plus en retard d'abord, plafonnées à `max`. */
export function cartesDues<T extends { etat: EtatCarte }>(cartes: T[], aujourdhui: DateLocale, max = 15): T[] {
  return cartes
    .filter((c) => c.etat.echeance <= aujourdhui)
    .sort((a, b) => (a.etat.echeance < b.etat.echeance ? -1 : a.etat.echeance > b.etat.echeance ? 1 : 0))
    .slice(0, max);
}
