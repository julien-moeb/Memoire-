/**
 * Schémas du contenu éditable (dossier contenu/). Source unique de vérité :
 * - validés à la compilation par scripts/valider-contenu.ts ;
 * - exportés en JSON Schema (contenu/schemas/) pour l'autocomplétion dans l'éditeur ;
 * - revérifiés au chargement dans l'application.
 */
import { z } from 'zod';

const domaine = z.enum([
  'acces-lexical', 'vitesse', 'memoire-travail', 'memoire-episodique', 'attention', 'flexibilite',
]).describe('Domaine cognitif principal sollicité');

const identifiant = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Identifiant : minuscules, chiffres et tirets uniquement (ex. def-s01-001)')
  .describe('Identifiant unique dans tout le dossier contenu/');

const enveloppe = {
  $schema: z.string().optional(),
  id: identifiant,
  titre: z.string().min(3).describe('Titre affiché de la série'),
  domaine,
  version: z.number().int().positive().describe('Incrémentez-la quand vous modifiez une série existante'),
  description: z.string().optional(),
};

const difficulte = z.number().int().min(1).max(5).describe('1 = très facile, 5 = très difficile');

export const itemDefinitionMot = z.object({
  id: identifiant,
  definition: z.string().min(10).describe('Définition précise, sans contenir le mot attendu'),
  reponse: z.string().min(1).describe('Terme attendu'),
  variantes: z.array(z.string()).default([]).describe('Autres réponses acceptées'),
  indices: z.object({
    trait: z.string().min(3).describe('Premier indice : un trait sémantique (catégorie, usage, contexte)'),
    syllabe: z.string().min(1).describe('Second indice : début du mot, qui doit en être le préfixe exact'),
  }),
  difficulte,
});

export const serieDefinitionMot = z.object({
  ...enveloppe,
  type: z.literal('definition-mot'),
  items: z.array(itemDefinitionMot).min(1),
});

export const itemFluence = z.object({
  id: identifiant,
  modalite: z.enum(['semantique', 'phonemique']),
  consigne: z.string().min(3).describe('Ex. « Des animaux » ou « Des mots commençant par P »'),
  cle: z.string().min(1).describe('Catégorie (semantique) ou lettre initiale (phonemique)'),
  reference: z.array(z.string()).default([]).describe('Mots valides connus ; un mot absent est soumis à votre arbitrage'),
  exclusions: z.array(z.string()).default([]).describe('Mots à refuser (hors catégorie fréquents)'),
  reserveBilan: z.boolean().default(false).describe('true = réservée au bilan, jamais proposée en entraînement'),
});

export const serieFluence = z.object({
  ...enveloppe,
  type: z.literal('fluence'),
  items: z.array(itemFluence).min(1),
});

export const itemCarteLexique = z.object({
  id: identifiant,
  question: z.string().min(3).describe('Définition ou contexte présenté'),
  reponse: z.string().min(1),
  variantes: z.array(z.string()).default([]),
  explication: z.string().optional().describe('Précision affichée après la réponse'),
  difficulte,
});

export const serieCarteLexique = z.object({
  ...enveloppe,
  type: z.literal('carte-lexique'),
  theme: z.string().min(3).describe('Ex. « Droit administratif »'),
  items: z.array(itemCarteLexique).min(1),
});

export const itemDiscrimination = z.object({
  id: identifiant,
  nature: z.enum(['quasi-synonyme', 'paronyme']),
  phrase: z.string().min(10).describe('Phrase avec un emplacement « ___ » pour le mot à choisir'),
  options: z.array(z.string().min(1)).min(2).max(4).describe('Mots proposés, dont la réponse'),
  reponse: z.string().min(1),
  explication: z.string().min(10).describe('Distinction de sens, affichée après la réponse'),
  difficulte,
});

export const serieDiscrimination = z.object({
  ...enveloppe,
  type: z.literal('discrimination'),
  items: z.array(itemDiscrimination).min(1),
});

export const itemIntrus = z.object({
  id: identifiant,
  mots: z.array(z.string().min(1)).min(4).max(5).describe("Mots présentés, dont l'intrus"),
  intrus: z.string().min(1),
  explication: z.string().min(10).describe('Trait commun aux autres mots et raison de l’exclusion'),
  difficulte,
});

export const serieIntrus = z.object({
  ...enveloppe,
  type: z.literal('intrus'),
  items: z.array(itemIntrus).min(1),
});

export const itemRegistre = z.object({
  id: identifiant,
  contexte: z.string().min(5).describe('Situation professionnelle visée'),
  phrase: z.string().min(5).describe('Formulation familière ou imprécise à reformuler'),
  reformulations: z.array(z.string().min(5)).min(1).describe('Reformulations modèles, affichées après votre essai'),
  difficulte,
});

export const serieRegistre = z.object({
  ...enveloppe,
  type: z.literal('registre'),
  items: z.array(itemRegistre).min(1),
});

export const itemTraits = z.object({
  id: identifiant,
  mot: z.string().min(1),
  traits: z.object({
    categorie: z.string().min(2).describe('À quelle catégorie appartient-il ?'),
    usage: z.string().min(2).describe('À quoi sert-il ?'),
    description: z.string().min(2).describe('À quoi ressemble-t-il ? (forme, matière, propriétés)'),
    lieu: z.string().min(2).describe('Où le trouve-t-on ?'),
    association: z.string().min(2).describe('À quoi vous fait-il penser ?'),
  }),
  difficulte,
});

export const serieTraits = z.object({
  ...enveloppe,
  type: z.literal('traits'),
  items: z.array(itemTraits).min(1),
});

export const itemListeMemoire = z.object({
  id: identifiant,
  theme: z.string().min(3).describe('Contexte qui donne sens à la liste (ex. « courses pour un dîner »)'),
  mots: z.array(z.string().min(2)).length(15),
});

export const serieListeMemoire = z.object({
  ...enveloppe,
  type: z.literal('liste-memoire'),
  items: z.array(itemListeMemoire).min(1),
});

export const itemParagraphe = z.object({
  id: identifiant,
  titre: z.string().min(3),
  texte: z.string().min(200),
  unites: z.array(z.string().min(2)).min(6).describe('Idées clés à retrouver au rappel libre (mots-clés)'),
  questions: z
    .array(z.object({ question: z.string().min(5), reponse: z.string().min(1), variantes: z.array(z.string()).default([]) }))
    .min(3)
    .describe('Questions du rappel indicé'),
  difficulte,
});

export const serieParagraphe = z.object({
  ...enveloppe,
  type: z.literal('paragraphe'),
  items: z.array(itemParagraphe).min(1),
});

export const serieDecisionLexicale = z.object({
  ...enveloppe,
  type: z.literal('decision-lexicale'),
  mots: z.array(z.string().min(2)).min(20),
  pseudoMots: z.array(z.string().min(2)).min(20).describe('Suites prononçables qui ne sont pas des mots français'),
});

export const CATEGORIES_STRATEGIE = ['pendant', 'preparation', 'regulation', 'organisation'] as const;

export const itemStrategie = z.object({
  id: identifiant,
  titre: z.string().min(3),
  categorie: z.enum(CATEGORIES_STRATEGIE).describe("pendant l'échange, préparation, régulation de l'activation, organisation"),
  resume: z.string().min(10).max(140).describe('Une phrase, affichée dans la liste des fiches'),
  quand: z.string().min(10).describe('Situations où la stratégie est utile'),
  principe: z.string().min(20).describe('Pourquoi elle aide, en quelques phrases'),
  etapes: z.array(z.string().min(5)).min(2).max(6),
  exemple: z.string().min(10),
  aEviter: z.string().min(5).optional(),
  outil: z.enum(['respiration']).optional().describe("Exercice guidé associé dans l'application"),
});

export const serieStrategie = z.object({
  ...enveloppe,
  domaine: domaine.optional(),
  type: z.literal('strategie'),
  items: z.array(itemStrategie).min(1),
});

const fluenceBilan = z.object({
  consigne: z.string().min(3),
  cle: z.string().min(1),
  reference: z.array(z.string()).min(10),
  exclusions: z.array(z.string()).default([]),
});

export const formeBilan = z.object({
  $schema: z.string().optional(),
  id: identifiant,
  type: z.literal('forme-bilan'),
  titre: z.string().min(3),
  version: z.number().int().positive(),
  forme: z.enum(['A', 'B', 'C', 'D']).describe('Formes parallèles, utilisées à tour de rôle à chaque bilan'),
  liste: z.array(z.string().min(2)).length(15).describe('Liste de 15 mots à apprendre'),
  fluenceSemantique: fluenceBilan,
  fluencePhonemique: fluenceBilan,
  definitions: z.array(itemDefinitionMot).length(12),
  decisionLexicale: z.object({
    mots: z.array(z.string().min(2)).length(30),
    pseudoMots: z.array(z.string().min(2)).length(30).describe('Suites de lettres prononçables qui ne sont pas des mots français'),
  }),
});

export const serie = z.discriminatedUnion('type', [
  serieDefinitionMot, serieFluence, serieCarteLexique, formeBilan, serieDiscrimination, serieIntrus, serieRegistre,
  serieTraits, serieListeMemoire, serieParagraphe, serieDecisionLexicale, serieStrategie,
]);

export type Serie = z.infer<typeof serie>;
export type TypeSerie = Serie['type'];

export type FormeBilan = z.infer<typeof formeBilan>;

export const SCHEMAS_PAR_TYPE = {
  'definition-mot': serieDefinitionMot,
  fluence: serieFluence,
  'carte-lexique': serieCarteLexique,
  'forme-bilan': formeBilan,
  discrimination: serieDiscrimination,
  intrus: serieIntrus,
  registre: serieRegistre,
  traits: serieTraits,
  'liste-memoire': serieListeMemoire,
  paragraphe: serieParagraphe,
  'decision-lexicale': serieDecisionLexicale,
  strategie: serieStrategie,
} as const satisfies Record<TypeSerie, z.ZodType>;

export type ItemDefinitionMot = z.infer<typeof itemDefinitionMot>;
export type ItemDiscrimination = z.infer<typeof itemDiscrimination>;
export type ItemIntrus = z.infer<typeof itemIntrus>;
export type ItemRegistre = z.infer<typeof itemRegistre>;
export type ItemTraits = z.infer<typeof itemTraits>;
export type ItemListeMemoire = z.infer<typeof itemListeMemoire>;
export type ItemParagraphe = z.infer<typeof itemParagraphe>;
export type ItemFluence = z.infer<typeof itemFluence>;
export type ItemCarteLexique = z.infer<typeof itemCarteLexique>;
export type ItemStrategie = z.infer<typeof itemStrategie>;
