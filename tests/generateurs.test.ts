import { describe, expect, it } from 'vitest';
import { creerAlea, graineDe } from '../src/moteur/alea';
import {
  eclairs, essaisAlternance, essaisDecisionLexicale, essaisGoNoGo, essaisStroop, fluxMiseAJour, sequenceChiffres,
} from '../src/bilan/generateurs';

describe('générateurs d’essais', () => {
  it('sont reproductibles pour une même graine', () => {
    const a = essaisGoNoGo(40, 0.2, creerAlea(graineDe('bilan-x')));
    const b = essaisGoNoGo(40, 0.2, creerAlea(graineDe('bilan-x')));
    expect(a).toEqual(b);
  });
  it('go/no-go : 20 % de no-go, sans réponse attendue', () => {
    const t = essaisGoNoGo(90, 0.2, creerAlea(1));
    const nogo = t.filter((e) => e.condition === 'nogo');
    expect(nogo).toHaveLength(18);
    expect(nogo.every((e) => e.stimulus === 'X' && e.attendue === null)).toBe(true);
  });
  it('décision lexicale : mots et non-mots en nombre égal, sans longue série', () => {
    const t = essaisDecisionLexicale(['a', 'b', 'c', 'd'], ['w', 'x', 'y', 'z'], creerAlea(2));
    expect(t.filter((e) => e.attendue === 'mot')).toHaveLength(4);
  });
  it('Stroop : moitié congruents, encre et mot différents pour les incongruents', () => {
    const t = essaisStroop(48, creerAlea(3));
    expect(t.filter((e) => e.condition === 'congruent')).toHaveLength(24);
    for (const e of t.filter((x) => x.condition === 'incongruent')) expect(e.stimulus.mot.toLowerCase()).not.toBe(e.attendue);
  });
  it('alternance : la position change toutes les deux épreuves', () => {
    const t = essaisAlternance(8, creerAlea(4));
    expect(t.map((e) => e.stimulus.position)).toEqual(['haut', 'haut', 'bas', 'bas', 'haut', 'haut', 'bas', 'bas']);
    expect(t.map((e) => e.condition)).toEqual(['premier', 'repetition', 'changement', 'repetition', 'changement', 'repetition', 'changement', 'repetition']);
  });
  it('séquences de chiffres et flux sans répétition immédiate', () => {
    const s = sequenceChiffres(8, creerAlea(5));
    expect(s).toHaveLength(8);
    for (let i = 1; i < s.length; i++) expect(s[i]).not.toBe(s[i - 1]);
    const f = fluxMiseAJour(creerAlea(6));
    expect(f.length).toBeGreaterThanOrEqual(6);
    expect(f.length).toBeLessThanOrEqual(12);
  });
  it('éclairs : nombre demandé, ni au premier ni au dernier essai', () => {
    const e = eclairs(30, 6, creerAlea(7));
    expect(e).toHaveLength(6);
    expect(Math.min(...e)).toBeGreaterThan(0);
    expect(Math.max(...e)).toBeLessThan(29);
  });
});
