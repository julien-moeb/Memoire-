import { describe, expect, it } from 'vitest';
import {
  composerSeance, doubleDecisionDuJour, exerciceMaintien, exercicesCibles, type SeancePassee,
} from '../src/seance/composer';
import { EXERCICES, EXERCICES_PAR_DOMAINE, IDS_EXERCICES } from '../src/seance/catalogue';
import { interpoler, nBack, niveauApresBloc, decisionLexicale } from '../src/seance/niveaux';
import { ordonnerItems, prochainItem } from '../src/seance/selection';
import { ajouterJours } from '../src/moteur/dates';
import { DOMAINES } from '../src/stockage/types';

const base = { jourRepos: 0, domainePrioritaire: 'acces-lexical' as const, rappelsDus: [] };

/** Simule n séances consécutives (hors jours de repos) et renvoie l'historique. */
function simuler(n: number, depart = '2026-11-24') {
  const historique: SeancePassee[] = [];
  let date = depart;
  while (historique.length < n) {
    const c = composerSeance({ ...base, date, historique });
    if (c.disponible) {
      historique.push({ date, exercices: c.blocs.flatMap((b) => (b.type === 'exercice' ? [b.exercice] : [])) });
    }
    date = ajouterJours(date, 1);
  }
  return historique;
}

describe('catalogue', () => {
  it('décrit chaque exercice une fois, avec des numéros distincts', () => {
    expect(Object.keys(EXERCICES).sort()).toEqual([...IDS_EXERCICES].sort());
    const numeros = Object.values(EXERCICES).map((e) => e.numero);
    expect(new Set(numeros).size).toBe(numeros.length);
  });
  it('propose au moins deux exercices ciblés par domaine', () => {
    for (const d of DOMAINES) expect(EXERCICES_PAR_DOMAINE[d].length).toBeGreaterThanOrEqual(2);
  });
});

describe('composition de la séance', () => {
  it('refuse le jour de repos et une seconde séance le même jour', () => {
    expect(composerSeance({ ...base, date: '2026-11-29', historique: [] })).toEqual({ disponible: false, raison: 'repos' });
    expect(composerSeance({ ...base, date: '2026-11-24', historique: [{ date: '2026-11-24', exercices: [] }] }))
      .toEqual({ disponible: false, raison: 'deja-faite' });
  });

  it("ouvre sur les rappels différés, puis l'échauffement, et ferme sur les révisions", () => {
    const c = composerSeance({ ...base, date: '2026-11-24', historique: [], rappelsDus: [{ id: 'r1', listeId: 'l1' }] });
    if (!c.disponible) throw new Error('séance attendue');
    expect(c.blocs[0]).toEqual({ type: 'rappel-differe', rappelId: 'r1', listeId: 'l1' });
    expect(c.blocs[1]!.type).toBe('echauffement');
    expect(c.blocs.at(-1)!.type).toBe('repetition-espacee');
  });

  it('programme deux exercices distincts du domaine prioritaire', () => {
    for (const d of DOMAINES) {
      for (let r = 0; r < 6; r++) {
        const [a, b] = exercicesCibles(d, r);
        expect(a).not.toBe(b);
        expect(EXERCICES_PAR_DOMAINE[d]).toContain(a);
      }
    }
  });

  it('fait tourner tous les exercices du domaine prioritaire', () => {
    const vus = new Set(simuler(10).flatMap((s) => s.exercices));
    for (const e of EXERCICES_PAR_DOMAINE['acces-lexical']) expect(vus).toContain(e);
  });

  it('respecte « au moins quatre séances sur six » pour la double décision, sur 60 séances', () => {
    const h = simuler(60);
    for (let i = 0; i + 6 <= h.length; i++) {
      const n = h.slice(i, i + 6).filter((s) => s.exercices.includes('double-decision')).length;
      expect(n).toBeGreaterThanOrEqual(4);
    }
    // et laisse bien des jours de maintien
    expect(h.filter((s) => !s.exercices.includes('double-decision')).length).toBeGreaterThan(5);
  });

  it('choisit le maintien hors du domaine prioritaire et hors des exercices du jour', () => {
    for (let r = 0; r < 12; r++) {
      const e = exerciceMaintien('acces-lexical', r, ['definition-mot']);
      expect(EXERCICES[e].domaine).not.toBe('acces-lexical');
    }
  });

  it('applique la règle de la double décision à partir de l’historique', () => {
    const avec = { date: 'x', exercices: ['double-decision'] };
    const sans = { date: 'x', exercices: ['stroop'] };
    expect(doubleDecisionDuJour([avec, avec, avec])).toBe(true);
    expect(doubleDecisionDuJour([avec, avec, avec, avec])).toBe(false);
    expect(doubleDecisionDuJour([sans, avec, avec, avec, avec])).toBe(false);
    expect(doubleDecisionDuJour([avec, avec, avec, avec, sans])).toBe(true);
  });
});

describe('niveaux', () => {
  it('interpole entre les bornes', () => {
    expect(interpoler(1, 10, 2000, 800)).toBe(2000);
    expect(interpoler(10, 10, 2000, 800)).toBe(800);
    expect(interpoler(99, 10, 2000, 800)).toBe(800);
    expect(decisionLexicale(5).delaiMaxMs).toBeLessThan(decisionLexicale(4).delaiMaxMs);
  });
  it('passe du 2-back au 3-back au niveau 4', () => {
    expect(nBack(3).n).toBe(2);
    expect(nBack(4).n).toBe(3);
    expect(nBack(4).intervalleMs).toBeGreaterThan(nBack(3).intervalleMs);
  });
  it('ajuste le n-back par bloc', () => {
    expect(niveauApresBloc(2, 0.9, 6)).toBe(3);
    expect(niveauApresBloc(2, 0.7, 6)).toBe(2);
    expect(niveauApresBloc(2, 0.5, 6)).toBe(1);
    expect(niveauApresBloc(6, 1, 6)).toBe(6);
  });
});

describe('sélection des items', () => {
  const items = [
    { id: 'a', difficulte: 1 }, { id: 'b', difficulte: 2 }, { id: 'c', difficulte: 3 }, { id: 'd', difficulte: 5 },
  ];
  it('privilégie les items nouveaux proches du niveau, puis les plus anciens', () => {
    const vus = new Map([['b', '2026-11-20'], ['a', '2026-11-10']]);
    expect(ordonnerItems(items, vus, 3).map((i) => i.id)).toEqual(['c', 'd', 'a', 'b']);
  });
  it('prend dans la file l’item le plus proche du niveau', () => {
    const file = [...items];
    expect(prochainItem(file, 2)?.id).toBe('b');
    expect(file.map((i) => i.id)).toEqual(['a', 'c', 'd']);
    expect(prochainItem([], 2)).toBeUndefined();
  });
});
