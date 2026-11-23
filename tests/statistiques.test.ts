import { describe, expect, it } from 'vitest';
import {
  correlationAffichable, ecartType, mediane, moyenne, moyenneMobile, pourcentageDuMaximum, spearman, zInterne,
} from '../src/moteur/statistiques';
import { ajouterJours, ecartJours } from '../src/moteur/dates';

describe('statistiques descriptives', () => {
  it('calcule moyenne, écart-type et médiane', () => {
    expect(moyenne([2, 4, 6])).toBe(4);
    expect(ecartType([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(mediane([5, 1, 3])).toBe(3);
    expect(mediane([4, 1, 3, 2])).toBe(2.5);
    expect(Number.isNaN(moyenne([]))).toBe(true);
  });
});

describe('z interne', () => {
  const ref = [20, 22, 18, 21, 19];
  it('est positif quand la performance dépasse la ligne de base (métrique « haut »)', () => {
    expect(zInterne(25, ref, { sens: 'haut' })!).toBeGreaterThan(0);
  });
  it('est inversé pour les temps de réponse (métrique « bas »)', () => {
    const tr = [600, 620, 580, 610, 590];
    expect(zInterne(550, tr, { sens: 'bas' })!).toBeGreaterThan(0);
    expect(zInterne(650, tr, { sens: 'bas' })!).toBeLessThan(0);
  });
  it('applique un plancher sur l’écart-type', () => {
    const plat = [20, 20, 20];
    // sans plancher, l'écart-type nul rendrait le z infini ; plancher relatif 5 % → 1
    expect(zInterne(21, plat, { sens: 'haut' })).toBeCloseTo(1, 6);
    expect(zInterne(22, plat, { sens: 'haut', plancherAbsolu: 4 })).toBeCloseTo(0.5, 6);
  });
  it('refuse une référence trop courte', () => {
    expect(zInterne(10, [1, 2], { sens: 'haut' })).toBeNull();
  });
});

describe('moyenne mobile calendaire', () => {
  it('utilise 7 jours calendaires, pas 7 séances', () => {
    const pts = [
      { date: '2026-11-01', valeur: 10 },
      { date: '2026-11-02', valeur: 20 },
      { date: '2026-11-08', valeur: 30 }, // le 1er sort de la fenêtre, le 2 y reste
      { date: '2026-11-20', valeur: 40 },
    ];
    const mm = moyenneMobile(pts);
    expect(mm.map((p) => p.valeur)).toEqual([10, 15, 25, 40]);
  });
  it('fait la moyenne de plusieurs valeurs le même jour', () => {
    expect(moyenneMobile([{ date: '2026-11-01', valeur: 1 }, { date: '2026-11-01', valeur: 3 }])).toEqual([
      { date: '2026-11-01', valeur: 2 },
    ]);
  });
});

describe('dates locales', () => {
  it('franchit correctement les mois et les années', () => {
    expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
    expect(ajouterJours('2027-03-01', -1)).toBe('2027-02-28');
    expect(ecartJours('2026-11-23', '2026-12-01')).toBe(8);
  });
});

describe('corrélation de Spearman', () => {
  it('vaut 1 pour une relation monotone et −1 inversée', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 35, 100])).toBeCloseTo(1, 6);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 6);
  });
  it('gère les ex aequo', () => {
    expect(spearman([1, 2, 2, 3], [1, 2, 2, 3])).toBeCloseTo(1, 6);
  });
  it('renvoie null quand une série est constante ou trop courte', () => {
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(spearman([1, 2], [1, 2])).toBeNull();
  });
  it('n’est affichée qu’à partir de 30 séances', () => {
    expect(correlationAffichable(29)).toBe(false);
    expect(correlationAffichable(30)).toBe(true);
  });
});

describe('pourcentage du maximum', () => {
  it('borne et oriente les valeurs', () => {
    expect(pourcentageDuMaximum(15, 0, 30)).toBe(50);
    expect(pourcentageDuMaximum(400, 300, 1300, 'bas')).toBe(90);
    expect(pourcentageDuMaximum(2000, 300, 1300, 'bas')).toBe(0);
  });
});
