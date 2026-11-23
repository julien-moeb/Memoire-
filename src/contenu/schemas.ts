/**
 * Schémas du contenu éditable (dossier contenu/). Source unique de vérité :
 * - validés à la compilation par scripts/valider-contenu.ts ;
 * - exportés en JSON Schema (contenu/schemas/) pour l'autocomplétion dans l'éditeur ;
 * - revérifiés au chargement dans l'application.
 * Les types d'exercices restants seront ajoutés avec le moteur d'exercices (incrément 3).
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

export const serie = z.discriminatedUnion('type', [serieDefinitionMot, serieFluence, serieCarteLexique]);

export type Serie = z.infer<typeof serie>;
export type TypeSerie = Serie['type'];

export const SCHEMAS_PAR_TYPE = {
  'definition-mot': serieDefinitionMot,
  fluence: serieFluence,
  'carte-lexique': serieCarteLexique,
} as const satisfies Record<TypeSerie, z.ZodType>;
