/**
 * Catalogue des exercices de la séance quotidienne.
 * Les numéros reprennent ceux du document de conception ; les exercices 22 à 24 (volet comportemental)
 * et 12 (cartes issues du journal) arrivent avec l'incrément 4.
 */
import type { Domaine } from '../stockage/types';

export const IDS_EXERCICES = [
  'double-decision',
  'decision-lexicale',
  'appariement',
  'fluence',
  'definition-mot',
  'traits-semantiques',
  'discrimination',
  'intrus',
  'registre',
  'repetition-espacee',
  'n-back',
  'empan-inverse',
  'mise-a-jour',
  'stroop',
  'alternance',
  'go-nogo',
  'liste-strategies',
  'paragraphe',
  'methode-lieux',
] as const;

export type IdExercice = (typeof IDS_EXERCICES)[number];

/**
 * Mode d'adaptation :
 * - `essai` : escalier 3 réussites / 1 échec mis à jour à chaque essai ;
 * - `bloc` : niveau ajusté entre deux blocs selon l'exactitude du bloc (n-back), car changer
 *   de règle au milieu d'une séquence n'aurait pas de sens ;
 * - `aucun` : exercice à son propre rythme, sans escalier (stratégies, reformulation).
 */
export type ModeAdaptation = 'essai' | 'bloc' | 'aucun';

export interface DefExercice {
  id: IdExercice;
  numero: number;
  titre: string;
  domaine: Domaine;
  preuve: 'A' | 'B' | 'C';
  adaptation: ModeAdaptation;
  niveauMax: number;
  /** Ce que mesure le niveau, affiché dans le suivi. */
  libelleNiveau: string;
}

export const EXERCICES: Record<IdExercice, DefExercice> = {
  'double-decision': { id: 'double-decision', numero: 1, titre: 'Double décision', domaine: 'vitesse', preuve: 'A', adaptation: 'essai', niveauMax: 17, libelleNiveau: "durée d'affichage décroissante" },
  'decision-lexicale': { id: 'decision-lexicale', numero: 2, titre: 'Mot ou pas mot', domaine: 'vitesse', preuve: 'C', adaptation: 'essai', niveauMax: 10, libelleNiveau: 'délai de réponse décroissant' },
  appariement: { id: 'appariement', numero: 3, titre: 'Pareil ou différent', domaine: 'attention', preuve: 'C', adaptation: 'essai', niveauMax: 10, libelleNiveau: 'longueur des suites et délai' },
  fluence: { id: 'fluence', numero: 4, titre: 'Échauffement : fluence', domaine: 'acces-lexical', preuve: 'C', adaptation: 'aucun', niveauMax: 1, libelleNiveau: '' },
  'definition-mot': { id: 'definition-mot', numero: 6, titre: 'Le mot juste', domaine: 'acces-lexical', preuve: 'B', adaptation: 'essai', niveauMax: 5, libelleNiveau: 'difficulté des définitions' },
  'traits-semantiques': { id: 'traits-semantiques', numero: 7, titre: 'Traits sémantiques', domaine: 'acces-lexical', preuve: 'B', adaptation: 'aucun', niveauMax: 1, libelleNiveau: '' },
  discrimination: { id: 'discrimination', numero: 8, titre: 'Quasi-synonymes et paronymes', domaine: 'acces-lexical', preuve: 'C', adaptation: 'essai', niveauMax: 5, libelleNiveau: 'finesse des distinctions' },
  intrus: { id: 'intrus', numero: 9, titre: "L'intrus", domaine: 'acces-lexical', preuve: 'C', adaptation: 'essai', niveauMax: 5, libelleNiveau: 'proximité des mots' },
  registre: { id: 'registre', numero: 10, titre: 'Changer de registre', domaine: 'acces-lexical', preuve: 'C', adaptation: 'aucun', niveauMax: 1, libelleNiveau: '' },
  'repetition-espacee': { id: 'repetition-espacee', numero: 11, titre: 'Révisions espacées', domaine: 'acces-lexical', preuve: 'B', adaptation: 'aucun', niveauMax: 1, libelleNiveau: '' },
  'n-back': { id: 'n-back', numero: 13, titre: 'N-back verbal', domaine: 'memoire-travail', preuve: 'C', adaptation: 'bloc', niveauMax: 6, libelleNiveau: 'rang (2 puis 3) et cadence' },
  'empan-inverse': { id: 'empan-inverse', numero: 14, titre: 'Chiffres à rebours', domaine: 'memoire-travail', preuve: 'C', adaptation: 'essai', niveauMax: 7, libelleNiveau: 'longueur de la suite' },
  'mise-a-jour': { id: 'mise-a-jour', numero: 15, titre: 'Les dernières lettres', domaine: 'memoire-travail', preuve: 'C', adaptation: 'essai', niveauMax: 5, libelleNiveau: 'nombre de lettres à retenir' },
  stroop: { id: 'stroop', numero: 16, titre: 'Couleurs et mots', domaine: 'flexibilite', preuve: 'C', adaptation: 'essai', niveauMax: 10, libelleNiveau: 'délai et proportion de conflits' },
  alternance: { id: 'alternance', numero: 17, titre: 'Alternance de règles', domaine: 'flexibilite', preuve: 'C', adaptation: 'essai', niveauMax: 10, libelleNiveau: 'délai de réponse' },
  'go-nogo': { id: 'go-nogo', numero: 18, titre: 'Agir ou se retenir', domaine: 'attention', preuve: 'C', adaptation: 'essai', niveauMax: 10, libelleNiveau: 'cadence' },
  'liste-strategies': { id: 'liste-strategies', numero: 19, titre: 'Liste et stratégies', domaine: 'memoire-episodique', preuve: 'A', adaptation: 'essai', niveauMax: 8, libelleNiveau: 'longueur de la liste' },
  paragraphe: { id: 'paragraphe', numero: 20, titre: 'Retenir une note', domaine: 'memoire-episodique', preuve: 'C', adaptation: 'aucun', niveauMax: 1, libelleNiveau: '' },
  'methode-lieux': { id: 'methode-lieux', numero: 21, titre: 'Méthode des lieux', domaine: 'memoire-episodique', preuve: 'B', adaptation: 'essai', niveauMax: 6, libelleNiveau: "nombre d'éléments à placer" },
};

/**
 * Exercices ciblés par domaine prioritaire. La double décision n'y figure pas : elle a son propre
 * créneau quatre jours sur six au moins. L'échauffement et les révisions sont communs à toutes les séances.
 */
export const EXERCICES_PAR_DOMAINE: Record<Domaine, readonly IdExercice[]> = {
  'acces-lexical': ['definition-mot', 'discrimination', 'traits-semantiques', 'intrus', 'registre'],
  vitesse: ['decision-lexicale', 'appariement'],
  'memoire-travail': ['n-back', 'empan-inverse', 'mise-a-jour'],
  'memoire-episodique': ['liste-strategies', 'paragraphe', 'methode-lieux'],
  attention: ['go-nogo', 'appariement'],
  flexibilite: ['stroop', 'alternance'],
};
