import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Annotation, Appareil, Bilan, Carte, Confusion, Episode, EscalierEnregistre, Essai, Lieu, Meta,
  RappelDiffere, Reglages, Resultat, Seance,
} from './types';

export const NOM_BASE = 'lexique';
export const VERSION_SCHEMA = 1;

export interface SchemaLexique extends DBSchema {
  reglages: { key: string; value: Reglages };
  appareils: { key: string; value: Appareil };
  bilans: { key: string; value: Bilan; indexes: { date: string } };
  seances: { key: string; value: Seance; indexes: { date: string } };
  essais: { key: number; value: Essai; indexes: { seance: string; exercice: string; date: string } };
  resultats: { key: number; value: Resultat; indexes: { exercice: string; date: string } };
  escaliers: { key: string; value: EscalierEnregistre };
  cartes: { key: string; value: Carte; indexes: { echeance: string; paquet: string } };
  confusions: { key: string; value: Confusion };
  episodes: { key: string; value: Episode; indexes: { dateHeure: string } };
  lieux: { key: string; value: Lieu };
  rappels: { key: string; value: RappelDiffere; indexes: { echeance: string } };
  annotations: { key: string; value: Annotation; indexes: { date: string } };
  meta: { key: string; value: Meta };
}

export const MAGASINS = [
  'reglages', 'appareils', 'bilans', 'seances', 'essais', 'resultats', 'escaliers',
  'cartes', 'confusions', 'episodes', 'lieux', 'rappels', 'annotations', 'meta',
] as const;

export type NomMagasin = (typeof MAGASINS)[number];

export type Base = IDBPDatabase<SchemaLexique>;

/**
 * Ouvre la base. Chaque future version du schéma ajoutera un bloc `if (ancienne < N)`,
 * de sorte qu'aucune donnée existante ne soit perdue lors d'une mise à jour.
 */
export function ouvrirBase(nom = NOM_BASE): Promise<Base> {
  return openDB<SchemaLexique>(nom, VERSION_SCHEMA, {
    upgrade(db, ancienne) {
      if (ancienne < 1) {
        db.createObjectStore('reglages', { keyPath: 'id' });
        db.createObjectStore('appareils', { keyPath: 'id' });
        db.createObjectStore('bilans', { keyPath: 'id' }).createIndex('date', 'date');
        db.createObjectStore('seances', { keyPath: 'id' }).createIndex('date', 'date');
        const essais = db.createObjectStore('essais', { keyPath: 'id', autoIncrement: true });
        essais.createIndex('seance', 'seanceId');
        essais.createIndex('exercice', 'exerciceId');
        essais.createIndex('date', 'date');
        const resultats = db.createObjectStore('resultats', { keyPath: 'id', autoIncrement: true });
        resultats.createIndex('exercice', 'exerciceId');
        resultats.createIndex('date', 'date');
        db.createObjectStore('escaliers', { keyPath: 'exerciceId' });
        const cartes = db.createObjectStore('cartes', { keyPath: 'id' });
        cartes.createIndex('echeance', 'etat.echeance');
        cartes.createIndex('paquet', 'paquet');
        db.createObjectStore('confusions', { keyPath: 'id' });
        db.createObjectStore('episodes', { keyPath: 'id' }).createIndex('dateHeure', 'dateHeure');
        db.createObjectStore('lieux', { keyPath: 'id' });
        db.createObjectStore('rappels', { keyPath: 'id' }).createIndex('echeance', 'echeance');
        db.createObjectStore('annotations', { keyPath: 'id' }).createIndex('date', 'date');
        db.createObjectStore('meta', { keyPath: 'cle' });
      }
    },
  });
}

/** Demande au navigateur de ne pas évincer les données (utile surtout sur Safari). */
export async function demanderStockagePersistant(): Promise<boolean | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}

export async function estimationStockage(): Promise<{ utilise: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { utilise: e.usage ?? 0, quota: e.quota ?? 0 };
}
