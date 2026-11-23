import { describe, expect, it } from 'vitest';
import { cartesDues, nouvelleCarte, nouvelleFacilite, qualiteDepuisIssue, reviser } from '../src/moteur/sm2';

describe('SM-2', () => {
  const j0 = '2026-11-23';

  it('suit les intervalles 1, 6 puis intervalle × facilité', () => {
    let c = nouvelleCarte(j0);
    c = reviser(c, 5, j0);
    expect(c.intervalle).toBe(1);
    expect(c.echeance).toBe('2026-11-24');
    c = reviser(c, 5, '2026-11-24');
    expect(c.intervalle).toBe(6);
    expect(c.echeance).toBe('2026-11-30');
    const ef = c.facilite;
    c = reviser(c, 5, '2026-11-30');
    expect(c.intervalle).toBe(Math.round(6 * ef));
  });

  it('applique la formule de facilité et son plancher', () => {
    expect(nouvelleFacilite(2.5, 5)).toBeCloseTo(2.6, 3);
    expect(nouvelleFacilite(2.5, 4)).toBeCloseTo(2.5, 3);
    expect(nouvelleFacilite(2.5, 3)).toBeCloseTo(2.36, 3);
    expect(nouvelleFacilite(1.3, 3)).toBe(1.3);
  });

  it('remet la carte à zéro après un échec sans changer la facilité', () => {
    let c = nouvelleCarte(j0);
    c = reviser(c, 5, j0);
    c = reviser(c, 5, '2026-11-24');
    const ef = c.facilite;
    c = reviser(c, 1, '2026-11-30');
    expect(c.repetitions).toBe(0);
    expect(c.intervalle).toBe(1);
    expect(c.echecs).toBe(1);
    expect(c.facilite).toBe(ef);
    expect(c.echeance).toBe('2026-12-01');
  });

  it('déduit la qualité de l’issue du rappel', () => {
    expect(qualiteDepuisIssue({ correcte: true, indice: 'aucun', tempsMs: 2000 })).toBe(5);
    expect(qualiteDepuisIssue({ correcte: true, indice: 'aucun', tempsMs: 12000 })).toBe(4);
    expect(qualiteDepuisIssue({ correcte: true, indice: 'semantique' })).toBe(3);
    expect(qualiteDepuisIssue({ correcte: true, indice: 'syllabe' })).toBe(2);
    expect(qualiteDepuisIssue({ correcte: false, indice: 'aucun' })).toBe(1);
    expect(qualiteDepuisIssue({ correcte: false, indice: 'aucun', reponseDonnee: false })).toBe(0);
  });

  it('sélectionne les cartes dues, les plus en retard d’abord, avec un plafond', () => {
    const cartes = [
      { id: 'a', etat: { ...nouvelleCarte('2026-11-20') } },
      { id: 'b', etat: { ...nouvelleCarte('2026-11-25') } },
      { id: 'c', etat: { ...nouvelleCarte('2026-11-18') } },
    ];
    expect(cartesDues(cartes, j0).map((c) => c.id)).toEqual(['c', 'a']);
    expect(cartesDues(cartes, j0, 1).map((c) => c.id)).toEqual(['c']);
  });
});
