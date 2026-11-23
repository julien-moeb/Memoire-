import { describe, expect, it } from 'vitest';
import {
  arretEmpan, classerMotsFluence, corrigerRappel, coutConditions, decisionLexicale, doubleTache, empanMaximal,
  goNoGo, inverse, scoreFluence, scoreMiseAJour, type EssaiChoix,
} from '../src/bilan/scoring';

describe('rappel de liste', () => {
  it('compte les mots corrects, les intrusions et les répétitions', () => {
    const r = corrigerRappel(['Tambour', 'rideaux', 'tambour', 'cloche', ''], ['tambour', 'rideau', 'école']);
    expect(r.corrects).toEqual(['tambour', 'rideau']);
    expect(r.intrusions).toEqual(['cloche']);
    expect(r.repetitions).toBe(1);
  });
});

describe('fluence', () => {
  const item = { modalite: 'semantique' as const, cle: 'animaux', reference: ['chat', 'chien', 'lion'], exclusions: ['arbre'] };
  it('classe valides, doublons, hors-catégorie et mots à arbitrer', () => {
    const c = classerMotsFluence(
      [{ mot: 'chat', tMs: 1000 }, { mot: 'chats', tMs: 2000 }, { mot: 'arbre', tMs: 3000 }, { mot: 'okapi', tMs: 20000 }],
      item,
    );
    expect(c.map((x) => x.statut)).toEqual(['valide', 'doublon', 'hors-categorie', 'a-arbitrer']);
    const s = scoreFluence(c, new Set(['okapi']));
    expect(s.valides).toBe(2);
    expect(s.tranches).toEqual([1, 1, 0, 0]);
    expect(scoreFluence(c, new Set()).valides).toBe(1);
  });
  it('refuse en phonémique un mot qui ne commence pas par la lettre', () => {
    const c = classerMotsFluence([{ mot: 'table', tMs: 1 }, { mot: 'porte', tMs: 2 }], {
      modalite: 'phonemique', cle: 'p', reference: [], exclusions: [],
    });
    expect(c.map((x) => x.statut)).toEqual(['hors-categorie', 'a-arbitrer']);
  });
});

const e = (condition: string, correcte: boolean, tempsMs: number | null): EssaiChoix => ({ condition, correcte, tempsMs });

describe('temps de réponse', () => {
  it('décision lexicale : médiane sur réponses justes, hors temps aberrants', () => {
    const r = decisionLexicale([e('mot', true, 500), e('mot', true, 700), e('mot', false, 300), e('non-mot', true, 150), e('mot', true, 600)]);
    expect(r.trMedian).toBe(600);
    expect(r.exactitude).toBeCloseTo(0.8, 6);
  });
  it('Stroop : coût d’interférence', () => {
    const r = coutConditions([e('incongruent', true, 800), e('incongruent', true, 900), e('congruent', true, 600), e('congruent', true, 700)], 'incongruent', 'congruent');
    expect(r.coutMs).toBe(200);
  });
  it('go/no-go : omissions et fausses alarmes', () => {
    const r = goNoGo([e('go', true, 400), e('go', false, null), e('nogo', false, 350), e('nogo', true, null), e('go', true, 500)]);
    expect(r.omissions).toBe(1);
    expect(r.faussesAlarmes).toBe(1);
    expect(r.trMoyen).toBe(450);
  });
  it('double tâche : coût relatif', () => {
    const r = doubleTache([e('s', true, 500), e('s', true, 500)], [e('d', true, 650), e('d', true, 650)], 6, 5);
    expect(r.coutRelatif).toBeCloseTo(0.3, 6);
    expect(r.erreurComptage).toBe(1);
  });
});

describe('mémoire de travail', () => {
  it('empan maximal et règle d’arrêt', () => {
    const essais = [{ longueur: 3, correct: true }, { longueur: 4, correct: true }, { longueur: 5, correct: false }, { longueur: 5, correct: false }];
    expect(empanMaximal(essais)).toBe(4);
    expect(arretEmpan(essais, 5)).toBe(true);
    expect(arretEmpan(essais, 4)).toBe(false);
    expect(inverse(['3', '8', '1'])).toBe('183');
  });
  it('mise à jour : éléments à la bonne position parmi les derniers', () => {
    expect(scoreMiseAJour(['K', 'B', 'R', 'T', 'L', 'M'], 'rtlm', 4)).toBe(4);
    expect(scoreMiseAJour(['K', 'B', 'R', 'T', 'L', 'M'], 'RTML', 4)).toBe(2);
  });
});

import { EPREUVES, dureePartie, rangInterne, scoresIndicatifs, seuilEnMs } from '../src/bilan/protocole';

describe('protocole du bilan', () => {
  it('compte douze épreuves et un rappel différé, en deux parties d’environ 13 minutes', () => {
    expect(EPREUVES).toHaveLength(13);
    expect(dureePartie(1)).toBeCloseTo(13, 0);
    expect(dureePartie(2)).toBeCloseTo(12.5, 0);
  });
  it('calcule un score indicatif par domaine et un rang interne', () => {
    const s = scoresIndicatifs({
      'liste-apprentissage.total-3-essais': 27, 'liste-differe.mots-rappeles': 9,
      'decision-lexicale.tr-median': 900, 'fluence-semantique.mots-valides': 20,
    });
    expect(s['memoire-episodique']).toBe(60);
    expect(s.vitesse).toBe(50);
    expect(s['acces-lexical']).toBe(50);
    expect(rangInterne({ vitesse: 50, attention: 20, 'acces-lexical': 70 })).toEqual(['attention', 'vitesse', 'acces-lexical']);
  });
  it('interpole le seuil de double décision entre deux niveaux', () => {
    expect(seuilEnMs(1)).toBe(500);
    expect(seuilEnMs(1.5)).toBe(450);
    expect(seuilEnMs(13)).toBe(17);
  });
});

import { formeSuivante, prochainBilanConseille, regrouper } from '../src/bilan/historique';
import type { Bilan } from '../src/stockage/types';

const partie = (groupe: string, p: 1 | 2, date: string, forme: Bilan['forme'] = 'A'): Bilan => ({
  id: `${groupe}-p${p}`, groupe, date, debut: '', fin: '', forme, partie: p, metriques: { [`m${p}`]: p }, scoresDomaines: {}, appareilId: null,
});

describe('historique des bilans', () => {
  it('regroupe les deux parties et détecte un bilan incomplet', () => {
    const g = regrouper([partie('b1', 2, '2026-11-24'), partie('b1', 1, '2026-11-23'), partie('b2', 1, '2027-02-23', 'B')]);
    expect(g).toHaveLength(2);
    expect(g[0]!.complet).toBe(true);
    expect(g[0]!.metriques).toEqual({ m1: 1, m2: 2 });
    expect(g[1]!.complet).toBe(false);
  });
  it('fait tourner les formes et conseille un nouveau bilan à trois mois', () => {
    const g = regrouper([partie('b1', 1, '2026-11-23'), partie('b1', 2, '2026-11-24')]);
    expect(formeSuivante([])).toBe('A');
    expect(formeSuivante(g)).toBe('B');
    expect(prochainBilanConseille(g)).toBe('2027-02-22');
    expect(prochainBilanConseille([])).toBeNull();
  });
});
