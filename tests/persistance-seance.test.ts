import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { ouvrirBase } from '../src/stockage/db';
import * as P from '../src/seance/persistance';
import { resultatVide } from '../src/seance/types';
import { enregistrerReponse } from '../src/moteur/escalier';

let compteur = 0;
const base = () => ouvrirBase(`seance-${++compteur}`);

describe('persistance de la séance', () => {
  it('enregistre un bloc en une transaction et reprend l’escalier le lendemain, un cran en dessous', async () => {
    const db = await base();
    const s = await P.ouvrirSeance(db, '2026-11-24', { sommeilHeures: 7, fatigue: 2 }, ['0:stroop'], null);
    let esc = P.escalierInitial('stroop');
    for (let i = 0; i < 9; i++) esc = enregistrerReponse(esc, true); // trois montées : niveau 4
    const r = { ...resultatVide('stroop' as const), metrique: 'seuil', unite: 'niveau', valeur: 3.5, escalier: esc,
      essais: [{ itemId: null, niveau: 1, stimulus: 'ROUGE', reponse: 'vert', correcte: true, tempsReponseMs: 600, ecartAffichageMs: null, indice: null }] };
    const apres = await P.enregistrerBloc(db, s, '0:stroop', r, '2026-11-24');
    expect(apres.blocsRealises).toEqual(['0:stroop']);
    expect(await db.count('essais')).toBe(1);
    expect((await db.getAll('resultats'))[0]).toMatchObject({ exerciceId: 'stroop', domaine: 'flexibilite', valeur: 3.5 });
    const repris = await P.escalierDuJour(db, 'stroop');
    expect(esc.niveau).toBe(4);
    expect(repris?.niveau).toBe(3);
  });

  it('crée une carte pour un mot manqué sans réinitialiser une carte existante', async () => {
    const db = await base();
    const s = await P.ouvrirSeance(db, '2026-11-24', { sommeilHeures: null, fatigue: null }, [], null);
    const r = { ...resultatVide('definition-mot' as const), cartes: [{ paquet: 'def-s02', itemId: 'def-s02-001' }] };
    await P.enregistrerBloc(db, s, '1:definition-mot', r, '2026-11-24');
    const carte = await db.get('cartes', 'def-s02-001');
    expect(carte?.etat.echeance).toBe('2026-11-25');
    await db.put('cartes', { ...carte!, etat: { ...carte!.etat, intervalle: 6, echeance: '2026-12-01' } });
    await P.enregistrerBloc(db, s, '2:definition-mot', r, '2026-11-26');
    expect((await db.get('cartes', 'def-s02-001'))?.etat.echeance).toBe('2026-12-01');
  });

  it('programme le rappel de la liste au lendemain, puis le marque fait', async () => {
    const db = await base();
    const s1 = await P.ouvrirSeance(db, '2026-11-24', { sommeilHeures: null, fatigue: null }, [], null);
    await P.enregistrerBloc(db, s1, '1:liste-strategies', { ...resultatVide('liste-strategies' as const), rappelListe: 'lis-s01-001:10' }, '2026-11-24');
    await P.cloreSeance(db, s1);
    expect(await P.rappelsDus(db, '2026-11-24')).toEqual([]);
    const dus = await P.rappelsDus(db, '2026-11-25');
    expect(dus).toHaveLength(1);
    const s2 = await P.ouvrirSeance(db, '2026-11-25', { sommeilHeures: null, fatigue: null }, [], null);
    await P.enregistrerBloc(db, s2, `0:rappel:${dus[0]!.id}`, resultatVide('liste-strategies'), '2026-11-25');
    expect(await P.rappelsDus(db, '2026-11-25')).toEqual([]);
    expect((await P.historique(db)).map((h) => h.exercices)).toEqual([['liste-strategies']]);
  });

  it('complète les révisions par des cartes nouvelles du lexique professionnel', async () => {
    const db = await base();
    const cartes = await P.cartesDuJour(db, '2026-11-24', 15);
    expect(cartes.length).toBe(4);
    expect(cartes.every((c) => c.etat.repetitions === 0)).toBe(true);
  });
});
