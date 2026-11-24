/** Modèle de données local. Toutes ces données restent sur l'appareil. */
import type { DateLocale } from '../moteur/dates';
import type { EtatCarte } from '../moteur/sm2';
import type { EtatEscalier } from '../moteur/escalier';

export const DOMAINES = [
  'acces-lexical',
  'vitesse',
  'memoire-travail',
  'memoire-episodique',
  'attention',
  'flexibilite',
] as const;
export type Domaine = (typeof DOMAINES)[number];

export const NOMS_DOMAINES: Record<Domaine, string> = {
  'acces-lexical': 'Accès lexical',
  vitesse: 'Vitesse de traitement',
  'memoire-travail': 'Mémoire de travail',
  'memoire-episodique': 'Mémoire épisodique',
  attention: 'Attention',
  flexibilite: 'Flexibilité et inhibition',
};

export type Theme = 'auto' | 'clair' | 'sombre';

export interface Reglages {
  id: 'reglages';
  theme: Theme;
  /** Échelle de police en pourcentage (90 à 130). */
  taillePolice: number;
  /** Jour de repos : 0 = dimanche … 6 = samedi. */
  jourRepos: number;
  domainePrioritaire: Domaine;
  ponderations: Record<Domaine, number>;
  ignorerAccents: boolean;
  /** Mode oral : le mot est dit à voix haute puis autoévalué, au lieu d'être tapé. */
  modeOral: boolean;
  derniereSauvegarde: string | null;
}

export interface Appareil {
  id: string;
  creeLe: string;
  userAgent: string;
  largeurEcran: number;
  hauteurEcran: number;
  ratioPixels: number;
  frequenceHz: number;
  periodeMs: number;
  /** Écart-type des intervalles entre images, en ms. */
  gigueMs: number;
}

export interface ContexteSeance {
  sommeilHeures: number | null;
  fatigue: 1 | 2 | 3 | 4 | 5 | null;
}

export interface Seance {
  id: string;
  date: DateLocale;
  debut: string;
  fin: string | null;
  contexte: ContexteSeance;
  plan: string[];
  blocsRealises: string[];
  appareilId: string | null;
}

export interface Bilan {
  /** `${groupe}-p${partie}` */
  id: string;
  /** Identifiant commun aux deux parties d'un même bilan. */
  groupe: string;
  date: DateLocale;
  debut: string;
  fin: string;
  forme: 'A' | 'B' | 'C' | 'D';
  partie: 1 | 2;
  metriques: Record<string, number>;
  scoresDomaines: Partial<Record<Domaine, number>>;
  appareilId: string | null;
}

export interface Essai {
  id?: number;
  seanceId: string | null;
  bilanId: string | null;
  exerciceId: string;
  itemId: string | null;
  date: DateLocale;
  horodatage: string;
  niveau: number | null;
  stimulus: string;
  reponse: string;
  correcte: boolean | null;
  tempsReponseMs: number | null;
  ecartAffichageMs: number | null;
  indice: 'aucun' | 'semantique' | 'syllabe' | null;
}

export interface Resultat {
  id?: number;
  seanceId: string | null;
  bilanId: string | null;
  exerciceId: string;
  domaine: Domaine;
  date: DateLocale;
  metrique: string;
  unite: string;
  valeur: number;
  niveauDepart: number | null;
  niveauArrivee: number | null;
}

export interface EscalierEnregistre {
  exerciceId: string;
  etat: EtatEscalier;
}

export interface Carte {
  id: string;
  paquet: string;
  itemId: string;
  etat: EtatCarte;
}

export interface Confusion {
  /** « attendu→choisi » */
  id: string;
  attendu: string;
  choisi: string;
  erreurs: number;
  derniere: DateLocale;
}

export interface Episode {
  id: string;
  dateHeure: string;
  situation: 'reunion' | 'ecrit' | 'telephone' | 'echange-informel' | 'presentation' | 'autre';
  interlocuteur: 'hierarchie' | 'pairs' | 'partenaires' | 'public' | 'proches' | 'autre';
  enjeu: 1 | 2 | 3 | 4 | 5;
  fatigue: 1 | 2 | 3 | 4 | 5;
  motCherche: string | null;
  motProduit: string | null;
  strategie: string | null;
  issue: 'immediate' | 'differee' | 'non-retrouve';
  notes: string;
}

export interface Lieu {
  id: string;
  nom: string;
  etapes: string[];
}

export interface RappelDiffere {
  id: string;
  listeId: string;
  apprisLe: DateLocale;
  echeance: DateLocale;
  statut: 'en-attente' | 'fait' | 'expire';
}

export interface Annotation {
  id: string;
  date: DateLocale;
  texte: string;
}

export interface Meta {
  cle: string;
  valeur: string | number;
}
