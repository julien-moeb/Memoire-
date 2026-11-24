import { describe, expect, it } from 'vitest';
import { creerAlea } from '../src/moteur/alea';
import * as G from '../src/seance/generateurs';
import { codeListe, decoderListe, strategieDuJour, unitesRetrouvees } from '../src/seance/scoring';
import { verifierContenu } from '../src/contenu/verification';
import { lireFichiersContenu } from '../scripts/lire-contenu';
import type { Serie } from '../src/contenu/schemas';

describe('générateurs des exercices à choix', () => {
  const alea = creerAlea(42);

  it('appariement : suites identiques ou différant d’un seul symbole', () => {
    for (let i = 0; i < 200; i++) {
      const e = G.essaiAppariement(5, alea);
      const [a, b] = e.texte.split('\n').map((l) => l.split(' '));
      const differences = a!.filter((s, k) => s !== b![k]).length;
      expect(differences).toBe(e.attendue === 'pareil' ? 0 : 1);
    }
  });

  it('Stroop : la réponse attendue est la couleur de l’encre', () => {
    let conflits = 0;
    for (let i = 0; i < 400; i++) {
      const e = G.essaiStroop(10, alea);
      const encre = e.options.find((o) => o.valeur === e.attendue);
      expect(encre).toBeDefined();
      if (e.texte.toLowerCase() !== e.attendue) conflits++;
    }
    // niveau 10 : 75 % de conflits visés
    expect(conflits / 400).toBeGreaterThan(0.65);
    expect(conflits / 400).toBeLessThan(0.85);
  });

  it('alternance : la règle change tous les deux essais et la réponse est juste', () => {
    for (let i = 0; i < 40; i++) {
      const e = G.essaiAlternance(1, alea, i);
      const [chiffre, lettre] = [Number(e.texte[0]), e.texte[1]!];
      const regleChiffre = Math.floor(i / 2) % 2 === 0;
      expect(e.contexte?.startsWith(regleChiffre ? 'Le chiffre' : 'La lettre')).toBe(true);
      const gauche = regleChiffre ? chiffre % 2 === 0 : 'AEIU'.includes(lettre);
      expect(e.attendue).toBe(gauche ? 'gauche' : 'droite');
    }
  });

  it('go/no-go : X n’appelle aucune réponse', () => {
    for (let i = 0; i < 200; i++) {
      const e = G.essaiGoNogo(3, alea);
      expect(e.attendue).toBe(e.texte === 'X' ? null : 'go');
    }
  });

  it('n-back : les cibles, et seulement elles, répètent la lettre vue n rangs plus tôt', () => {
    for (const n of [2, 3]) {
      const f = G.fluxNBack(n, 200, alea);
      f.forEach((x, i) => {
        if (i < n) expect(x.cible).toBe(false);
        else expect(x.cible).toBe(x.lettre === f[i - n]!.lettre);
      });
      const taux = f.filter((x) => x.cible).length / f.length;
      expect(taux).toBeGreaterThan(0.15);
      expect(taux).toBeLessThan(0.45);
    }
  });

  it('quasi-synonymes : options mélangées, touches 1 à n, réponse présente', () => {
    const item = { id: 'x', nature: 'paronyme' as const, phrase: 'Il a ___ la réunion.', options: ['présidé', 'précédé'], reponse: 'présidé', explication: 'Présider : diriger.', difficulte: 1 };
    const e = G.essaiDiscrimination(item, alea);
    expect(e.options.map((o) => o.touche)).toEqual(['1', '2']);
    expect(e.options.some((o) => o.valeur === e.attendue)).toBe(true);
    expect(e.contexte).toBe('Il a … la réunion.');
  });
});

describe('cotation de la mémoire épisodique', () => {
  it('retrouve les idées clés, avec variantes, pluriels et sans accents', () => {
    const r = unitesRetrouvees('Les travaux commencent en mars, pour 14 mois ; financement de la region.', ['mars', 'quatorze mois|14 mois', 'région', 'samedi']);
    expect(r.retrouvees).toEqual(['mars', 'quatorze mois', 'région']);
    expect(r.manquees).toEqual(['samedi']);
    expect(unitesRetrouvees('Des subventions', ['subvention']).retrouvees).toEqual(['subvention']);
    expect(unitesRetrouvees('Le samedi', ['medi']).retrouvees).toEqual([]);
  });
  it('encode la liste apprise pour le rappel du lendemain', () => {
    expect(decoderListe(codeListe('lis-s01-003', 11))).toEqual({ itemId: 'lis-s01-003', longueur: 11 });
  });
  it('fait tourner les stratégies d’encodage', () => {
    expect(new Set([0, 1, 2].map((r) => strategieDuJour(r).id)).size).toBe(3);
  });
});

describe('contenu des 30 premiers jours', () => {
  const fichiers = lireFichiersContenu().filter((f) => 'donnees' in f) as { chemin: string; donnees: unknown }[];
  const { series, anomalies } = verifierContenu(fichiers);
  const nb = (t: Serie['type']) =>
    series.filter((s) => s.type === t).reduce((n, s) => n + ('items' in s ? s.items.length : 0), 0);

  it('est valide', () => expect(anomalies).toEqual([]));
  it('fournit assez d’items pour une trentaine de séances', () => {
    expect(nb('definition-mot')).toBeGreaterThanOrEqual(90);
    expect(nb('discrimination')).toBeGreaterThanOrEqual(60);
    expect(nb('intrus')).toBeGreaterThanOrEqual(40);
    expect(nb('traits')).toBeGreaterThanOrEqual(30);
    expect(nb('registre')).toBeGreaterThanOrEqual(30);
    expect(nb('fluence')).toBeGreaterThanOrEqual(26);
    expect(nb('carte-lexique')).toBeGreaterThanOrEqual(80);
    expect(nb('liste-memoire')).toBeGreaterThanOrEqual(12);
    expect(nb('paragraphe')).toBeGreaterThanOrEqual(8);
    const dl = series.find((s) => s.type === 'decision-lexicale');
    expect(dl && 'mots' in dl ? dl.mots.length : 0).toBeGreaterThanOrEqual(100);
  });
  it('signale un mot du bilan réutilisé à l’entraînement', () => {
    const forme = fichiers.filter((f) => f.chemin.includes('forme-a'));
    const { anomalies: a } = verifierContenu([
      ...forme,
      { chemin: 't.json', donnees: { id: 'tra-t', type: 'traits', titre: 'Test', domaine: 'acces-lexical', version: 1, items: [{ id: 'tra-t-1', mot: 'sablier', traits: { categorie: 'objet', usage: 'temps', description: 'verre', lieu: 'table', association: 'temps' }, difficulte: 1 }] } },
    ]);
    expect(a.map((x) => x.message).join(' ')).toMatch(/réservé au bilan/);
  });
});
