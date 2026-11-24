import 'fake-indexeddb/auto';
import { crc32 as crcNode } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { crc32, creerZip } from '../src/export/zip';
import { TABLES, cellule, dictionnaire, fichiersArchive, notice, versCsv } from '../src/export/csv';
import { exporterTout, resumeSauvegarde, ErreurImport } from '../src/stockage/sauvegarde';
import { ouvrirBase } from '../src/stockage/db';
import * as P from '../src/seance/persistance';
import { resultatVide } from '../src/seance/types';
import { enregistrerEpisode, nouvelEpisode } from '../src/suivi/journal';
import { joursPossibles } from '../src/pages/Synthese';

/** Lecture minimale d'une archive « stored » : nom et contenu de chaque fichier, via le répertoire central. */
function lireZip(z: Uint8Array): Map<string, string> {
  const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
  const fin = z.length - 22;
  expect(v.getUint32(fin, true)).toBe(0x06054b50);
  const n = v.getUint16(fin + 10, true);
  let p = v.getUint32(fin + 16, true);
  const dec = new TextDecoder('utf-8', { ignoreBOM: true });
  const res = new Map<string, string>();
  for (let i = 0; i < n; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const crc = v.getUint32(p + 16, true);
    const taille = v.getUint32(p + 24, true);
    const lnom = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const nom = dec.decode(z.subarray(p + 46, p + 46 + lnom));
    expect(v.getUint32(local, true)).toBe(0x04034b50);
    const debut = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const donnees = z.subarray(debut, debut + taille);
    expect(crc32(donnees)).toBe(crc);
    res.set(nom, dec.decode(donnees));
    p += 46 + lnom;
  }
  return res;
}

describe('archive ZIP', () => {
  it('calcule le même CRC-32 que zlib', () => {
    const o = new TextEncoder().encode('Lexique : écart à la ligne de base');
    expect(crc32(o)).toBe(crcNode(o));
    expect(crc32(new Uint8Array())).toBe(0);
  });
  it('produit une archive relisible, noms accentués compris', () => {
    const z = creerZip([{ nom: 'a.csv', contenu: 'x,y\r\n1,2\r\n' }, { nom: 'séances.txt', contenu: 'été' }], new Date(2026, 10, 24, 10, 30));
    const f = lireZip(z);
    expect([...f.keys()]).toEqual(['a.csv', 'séances.txt']);
    expect(f.get('séances.txt')).toBe('été');
  });
});

describe('CSV', () => {
  it('échappe guillemets, virgules et sauts de ligne, et code booléens et absences', () => {
    expect(cellule('a,b')).toBe('"a,b"');
    expect(cellule('il a dit "oui"')).toBe('"il a dit ""oui"""');
    expect(cellule('ligne\nsuivante')).toBe('"ligne\nsuivante"');
    expect(cellule(true)).toBe('1');
    expect(cellule(null)).toBe('');
    expect(cellule(NaN)).toBe('');
    expect(cellule(['0:stroop', '1:fluence'])).toBe('0:stroop|1:fluence');
    expect(cellule(3.25)).toBe('3.25');
  });
  it('commence par la marque UTF-8 et l’en-tête', () => {
    const t = versCsv([{ nom: 'a', type: 'entier', description: '', valeur: (r: number) => r }], [1, 2]);
    expect(t).toBe('﻿a\r\n1\r\n2\r\n');
  });
  it('décrit chaque colonne dans le dictionnaire, sans doublon de nom de fichier ou de colonne', () => {
    expect(new Set(TABLES.map((t) => t.fichier)).size).toBe(TABLES.length);
    for (const t of TABLES) expect(new Set(t.colonnes.map((c) => c.nom)).size).toBe(t.colonnes.length);
    const d = dictionnaire().trim().split('\r\n');
    expect(d.length - 1).toBe(TABLES.reduce((n, t) => n + t.colonnes.length, 0));
    for (const t of TABLES) for (const c of t.colonnes) expect(c.description.length).toBeGreaterThan(2);
  });
});

describe('export complet', () => {
  it('exporte chaque magasin et les valeurs calculées, avec la notice et le dictionnaire', async () => {
    const db = await ouvrirBase('export-1');
    for (let i = 1; i <= 9; i++) {
      const date = `2026-12-${String(i).padStart(2, '0')}`;
      const s = await P.ouvrirSeance(db, date, { sommeilHeures: 7, fatigue: 2 }, ['0:stroop'], 'app-1');
      const r = { ...resultatVide('stroop' as const), metrique: 'seuil', unite: 'niveau', valeur: 3 + i / 10,
        essais: [{ itemId: null, niveau: 3, stimulus: 'ROUGE, en vert', reponse: 'vert', correcte: true, tempsReponseMs: 650, ecartAffichageMs: null, indice: null }] };
      await P.cloreSeance(db, await P.enregistrerBloc(db, s, '0:stroop', r, date));
    }
    await enregistrerEpisode(db, { ...nouvelEpisode(new Date('2026-12-03T10:00:00')), motCherche: 'avenant', notes: 'Réunion, "comité"' }, 'modification d’un contrat');
    const sauvegarde = await exporterTout(db);
    const fichiers = new Map(fichiersArchive(sauvegarde).map((f) => [f.nom, String(f.contenu)]));
    const lignes = (nom: string) => fichiers.get(nom)!.trim().split('\r\n').length - 1;

    expect(fichiers.has('LISEZMOI.txt')).toBe(true);
    expect(lignes('seances.csv')).toBe(9);
    expect(lignes('essais.csv')).toBe(9);
    expect(lignes('resultats.csv')).toBe(9);
    expect(lignes('series_exercices.csv')).toBe(9);
    expect(lignes('scores_domaines.csv')).toBeGreaterThan(0);
    expect(lignes('episodes.csv')).toBe(1);
    expect(fichiers.get('episodes.csv')).toContain('"Réunion, ""comité"""');
    expect(fichiers.get('cartes.csv')).toContain('avenant');
    expect(fichiers.get('essais.csv')).toContain('"ROUGE, en vert"');
    expect(notice(sauvegarde)).toMatch(/n'est pas un dispositif\s+médical/);
    // L'archive complète se relit et ses fichiers sont identiques.
    const z = lireZip(creerZip(fichiersArchive(sauvegarde)));
    expect(z.get('seances.csv')).toBe(fichiers.get('seances.csv'));
  });
});

describe('sauvegarde et synthèse', () => {
  it('résume une sauvegarde avant import et refuse un fichier étranger', async () => {
    const db = await ouvrirBase('export-2');
    await P.ouvrirSeance(db, '2026-12-01', { sommeilHeures: null, fatigue: null }, [], null);
    const r = resumeSauvegarde(await exporterTout(db));
    expect(r).toMatchObject({ seances: 1, bilans: 0, episodes: 0 });
    expect(() => resumeSauvegarde({ format: 'autre' })).toThrow(ErreurImport);
  });
  it('compte les jours possibles sans le jour de repos', () => {
    // Du lundi 30 novembre au dimanche 6 décembre 2026, repos le dimanche.
    expect(joursPossibles('2026-11-30', '2026-12-06', 0)).toBe(6);
  });
});
