import { describe, expect, it } from 'vitest';
import { ecartAffichage, empreinteAppareil, frequenceDepuisHorodatages, imagesPourDuree } from '../src/chrono/mesure';

describe('chronométrage', () => {
  it('estime 60 Hz à partir d’horodatages réguliers, malgré une image manquée', () => {
    const t = Array.from({ length: 30 }, (_, i) => i * 16.667);
    t.splice(10, 1); // image manquée : un intervalle double
    const f = frequenceDepuisHorodatages(t)!;
    expect(f.frequenceHz).toBeCloseTo(60, 0);
    expect(f.gigueMs).toBeLessThan(0.01);
  });

  it('estime 120 Hz', () => {
    const t = Array.from({ length: 30 }, (_, i) => i * 8.333);
    expect(frequenceDepuisHorodatages(t)!.frequenceHz).toBeCloseTo(120, 0);
  });

  it('convertit une durée en nombre entier d’images, au moins une', () => {
    expect(imagesPourDuree(50, 16.667)).toBe(3);
    expect(imagesPourDuree(5, 16.667)).toBe(1);
    expect(imagesPourDuree(50, 8.333)).toBe(6);
  });

  it('calcule l’écart entre durée mesurée et prévue', () => {
    expect(ecartAffichage(66.7, 3, 16.667)).toBeCloseTo(16.7, 1);
  });

  it('produit une empreinte stable et distincte selon l’appareil', () => {
    expect(empreinteAppareil(['ua', 390, 844, 3, 60])).toBe(empreinteAppareil(['ua', 390, 844, 3, 60]));
    expect(empreinteAppareil(['ua', 390, 844, 3, 60])).not.toBe(empreinteAppareil(['ua', 390, 844, 3, 120]));
  });

  it('refuse une série trop courte', () => {
    expect(frequenceDepuisHorodatages([0, 16])).toBeNull();
  });
});
