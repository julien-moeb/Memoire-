import { describe, expect, it } from 'vitest';
import { verifierContenu } from '../src/contenu/verification';
import { lireFichiersContenu } from '../scripts/lire-contenu';

const base = {
  id: 'def-t01', type: 'definition-mot', titre: 'Test', domaine: 'acces-lexical', version: 1,
};
const item = {
  id: 'def-t01-001', definition: 'Qui parle avec une abondance excessive de mots.', reponse: 'prolixe',
  indices: { trait: 'Adjectif qualifiant un style.', syllabe: 'pro' }, difficulte: 2,
};

describe('vérification du contenu', () => {
  it('accepte le contenu livré dans le dépôt', () => {
    const fichiers = lireFichiersContenu().filter((f) => 'donnees' in f) as { chemin: string; donnees: unknown }[];
    const { anomalies, series } = verifierContenu(fichiers);
    expect(anomalies).toEqual([]);
    expect(series.length).toBeGreaterThan(0);
  });

  it('signale une définition qui contient la réponse', () => {
    const { anomalies } = verifierContenu([
      { chemin: 'x.json', donnees: { ...base, items: [{ ...item, definition: 'Un style prolixe est trop long.' }] } },
    ]);
    expect(anomalies[0]?.message).toMatch(/contient la réponse/);
  });

  it('signale un indice syllabique incohérent', () => {
    const { anomalies } = verifierContenu([
      { chemin: 'x.json', donnees: { ...base, items: [{ ...item, indices: { ...item.indices, syllabe: 'ver' } }] } },
    ]);
    expect(anomalies[0]?.message).toMatch(/n'est pas le début/);
  });

  it('signale un identifiant dupliqué entre fichiers', () => {
    const { anomalies } = verifierContenu([
      { chemin: 'a.json', donnees: { ...base, items: [item] } },
      { chemin: 'b.json', donnees: { ...base, id: 'def-t02', items: [item] } },
    ]);
    expect(anomalies.some((a) => /déjà utilisé dans a.json/.test(a.message))).toBe(true);
  });

  it('signale un champ manquant avec son emplacement', () => {
    const { anomalies } = verifierContenu([{ chemin: 'x.json', donnees: { ...base, items: [{ ...item, reponse: undefined }] } }]);
    expect(anomalies[0]?.message).toMatch(/items › 0 › reponse/);
  });

  it('signale un mot hors lettre en fluence phonémique', () => {
    const { anomalies } = verifierContenu([{
      chemin: 'f.json',
      donnees: {
        id: 'flu-t', type: 'fluence', titre: 'Test', domaine: 'acces-lexical', version: 1,
        items: [{ id: 'flu-t-p', modalite: 'phonemique', consigne: 'Mots en P', cle: 'p', reference: ['porte', 'table'] }],
      },
    }]);
    expect(anomalies[0]?.message).toMatch(/table/);
  });

  it('signale une catégorie de fluence réservée au bilan', () => {
    const fichiers = lireFichiersContenu().filter((f) => 'donnees' in f && f.chemin.includes('forme-a')) as { chemin: string; donnees: unknown }[];
    const { anomalies } = verifierContenu([
      ...fichiers,
      {
        chemin: 'f.json',
        donnees: {
          id: 'flu-t', type: 'fluence', titre: 'Test', domaine: 'acces-lexical', version: 1,
          items: [{ id: 'flu-t-a', modalite: 'semantique', consigne: 'Des animaux', cle: 'Animaux', reference: ['chat'] }],
        },
      },
    ]);
    expect(anomalies.map((a) => a.message).join(' ')).toMatch(/réservée au bilan/);
  });
});
