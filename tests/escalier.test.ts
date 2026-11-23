import { describe, expect, it } from 'vitest';
import { creerEscalier, debutDeSeance, enregistrerReponse, estimationSeuil, tauxCible, type EtatEscalier } from '../src/moteur/escalier';

const config = { niveauMin: 1, niveauMax: 40, niveauInitial: 10, reussitesPourMonter: 3 };

/** Générateur pseudo-aléatoire déterministe (mulberry32) pour des tests reproductibles. */
function alea(graine: number) {
  let a = graine;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Observateur simulé : probabilité de réussite décroissante avec la difficulté. */
function simuler(reussitesPourMonter: number, essais: number, graine = 42) {
  const r = alea(graine);
  let etat: EtatEscalier = creerEscalier({ ...config, reussitesPourMonter });
  let reussites = 0;
  let compte = 0;
  for (let i = 0; i < essais; i++) {
    const p = 1 / (1 + Math.exp((etat.niveau - 20) / 2));
    const ok = r() < p;
    if (i > 200) {
      compte++;
      if (ok) reussites++;
    }
    etat = enregistrerReponse(etat, ok);
  }
  return { taux: reussites / compte, etat };
}

describe('escalier n réussites / 1 échec', () => {
  it('donne les taux cibles théoriques de Levitt', () => {
    expect(tauxCible(2)).toBeCloseTo(0.707, 3);
    expect(tauxCible(3)).toBeCloseTo(0.794, 3);
  });

  it('la règle 3/1 converge vers environ 79 % de réussite', () => {
    const { taux } = simuler(3, 20_000);
    expect(taux).toBeGreaterThan(0.76);
    expect(taux).toBeLessThan(0.83);
  });

  it('la règle 2/1 converge vers environ 71 %, et non 80 %', () => {
    const { taux } = simuler(2, 20_000);
    expect(taux).toBeGreaterThan(0.68);
    expect(taux).toBeLessThan(0.74);
  });

  it('augmente la difficulté après 3 réussites et la diminue après un échec', () => {
    let e = creerEscalier(config);
    e = enregistrerReponse(e, true);
    e = enregistrerReponse(e, true);
    expect(e.niveau).toBe(10);
    e = enregistrerReponse(e, true);
    expect(e.niveau).toBe(11);
    e = enregistrerReponse(e, false);
    expect(e.niveau).toBe(10);
    expect(e.inversions).toEqual([11]);
  });

  it('respecte les bornes', () => {
    let e = creerEscalier({ ...config, niveauInitial: 1 });
    e = enregistrerReponse(e, false);
    expect(e.niveau).toBe(1);
  });

  it("ne modifie pas l'état d'origine", () => {
    const e = creerEscalier(config);
    enregistrerReponse(e, false);
    expect(e.niveau).toBe(10);
    expect(e.essais).toBe(0);
  });

  it('recule d’un cran en début de séance', () => {
    const e = debutDeSeance({ ...creerEscalier(config), niveau: 15, reussitesConsecutives: 2 });
    expect(e.niveau).toBe(14);
    expect(e.reussitesConsecutives).toBe(0);
  });

  it('estime le seuil à partir des inversions', () => {
    const { etat } = simuler(3, 2_000);
    const seuil = estimationSeuil(etat);
    expect(seuil).not.toBeNull();
    expect(seuil!).toBeGreaterThan(14);
    expect(seuil!).toBeLessThan(22);
    expect(estimationSeuil(creerEscalier(config))).toBeNull();
  });
});
