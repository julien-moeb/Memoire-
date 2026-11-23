import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { MAGASINS, ouvrirBase } from '../src/stockage/db';
import { ErreurImport, exporterTout, importerTout } from '../src/stockage/sauvegarde';
import { REGLAGES_PAR_DEFAUT, completerReglages, ecrireReglages, lireReglages } from '../src/stockage/reglages';

let compteur = 0;
const nouvelleBase = () => ouvrirBase(`test-${++compteur}`);

describe('base locale', () => {
  it('crée tous les magasins du modèle', async () => {
    const db = await nouvelleBase();
    expect([...db.objectStoreNames].sort()).toEqual([...MAGASINS].sort());
  });

  it('lit des réglages par défaut puis les enregistre', async () => {
    const db = await nouvelleBase();
    expect(await lireReglages(db)).toEqual(REGLAGES_PAR_DEFAUT);
    await ecrireReglages(db, { ...REGLAGES_PAR_DEFAUT, jourRepos: 3 });
    expect((await lireReglages(db)).jourRepos).toBe(3);
  });

  it('complète des réglages partiels', () => {
    const r = completerReglages({ theme: 'sombre', ponderations: { vitesse: 3 } as never });
    expect(r.theme).toBe('sombre');
    expect(r.ponderations.vitesse).toBe(3);
    expect(r.ponderations['acces-lexical']).toBe(2);
  });
});

describe('sauvegarde et import', () => {
  it('restitue à l’identique les données sur un autre appareil', async () => {
    const source = await nouvelleBase();
    await ecrireReglages(source, { ...REGLAGES_PAR_DEFAUT, taillePolice: 120 });
    await source.add('essais', {
      seanceId: 's1', bilanId: null, exerciceId: 'double-decision', itemId: null, date: '2026-11-23',
      horodatage: '2026-11-23T08:00:00.000Z', niveau: 4, stimulus: 'x', reponse: 'y', correcte: true,
      tempsReponseMs: 512.3, ecartAffichageMs: 0.4, indice: null,
    });
    const sauvegarde = JSON.parse(JSON.stringify(await exporterTout(source)));

    const cible = await nouvelleBase();
    await cible.put('annotations', { id: 'a', date: '2026-01-01', texte: 'à remplacer' });
    await importerTout(cible, sauvegarde);

    expect((await lireReglages(cible)).taillePolice).toBe(120);
    expect(await cible.getAll('essais')).toHaveLength(1);
    expect(await cible.getAll('annotations')).toHaveLength(0);
  });

  it('refuse un fichier étranger ou d’une version plus récente', async () => {
    const db = await nouvelleBase();
    await expect(importerTout(db, { format: 'autre' })).rejects.toBeInstanceOf(ErreurImport);
    await expect(
      importerTout(db, { format: 'lexique-sauvegarde', versionSchema: 999, magasins: {} }),
    ).rejects.toThrow(/plus récente/);
  });
});
