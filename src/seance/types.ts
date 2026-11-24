import type { EtatEscalier } from '../moteur/escalier';
import type { Alea } from '../moteur/alea';
import type { Essai } from '../stockage/types';
import type { IdExercice } from './catalogue';

/** Essai tel que produit par un exercice ; la séance complète les champs communs avant enregistrement. */
export type EssaiExercice = Pick<
  Essai,
  'itemId' | 'niveau' | 'stimulus' | 'reponse' | 'correcte' | 'tempsReponseMs' | 'ecartAffichageMs' | 'indice'
>;

export interface ResultatExercice {
  exercice: IdExercice;
  essais: EssaiExercice[];
  /** Métrique principale, alimentant les courbes de l'incrément 4. */
  metrique: string;
  unite: string;
  valeur: number;
  niveauDepart: number | null;
  niveauArrivee: number | null;
  escalier: EtatEscalier | null;
  /** Items à reprendre en répétition espacée (définitions non trouvées sans indice, par exemple). */
  cartes: { paquet: string; itemId: string }[];
  /** Liste apprise à rappeler le lendemain. */
  rappelListe: string | null;
  /** Paires confondues (attendu, choisi) pour la reprogrammation des erreurs. */
  confusions: { attendu: string; choisi: string }[];
}

export interface PropsExercice {
  dureeMs: number;
  /** Escalier déjà reculé d'un cran pour l'échauffement ; null pour un exercice sans escalier. */
  escalier: EtatEscalier | null;
  alea: Alea;
  ignorerAccents: boolean;
  modeOral: boolean;
  /** Items déjà présentés : identifiant → date de dernière présentation. */
  vus: ReadonlyMap<string, string>;
  onTerminer: (r: ResultatExercice) => void;
}

export function resultatVide(exercice: IdExercice): ResultatExercice {
  return {
    exercice, essais: [], metrique: '', unite: '', valeur: NaN, niveauDepart: null, niveauArrivee: null,
    escalier: null, cartes: [], rappelListe: null, confusions: [],
  };
}
