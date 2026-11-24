import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import * as S from '../src/suivi/calculs';
import * as J from '../src/suivi/journal';
import { ouvrirBase } from '../src/stockage/db';
import { ajouterJours, dateLocale, versDate } from '../src/moteur/dates';
import { composerSeance, comportementalDuJour, type SeancePassee } from '../src/seance/composer';
import * as P from '../src/seance/persistance';
import { ficheDeCartePerso } from '../src/seance/exercices/Revisions';
import { itemsTraits } from '../src/seance/exercices/Lexicaux';
import { phaseRespiration } from '../src/comportemental/Respiration';
import { ficheDuVolet } from '../src/comportemental/SeanceComportementale';
import { strategies } from '../src/seance/contenu';
import type { Episode, Resultat, Seance } from '../src/stockage/types';

let n = 0;
const base = () => ouvrirBase(`suivi-${++n}`);

const res = (exerciceId: string, date: string, valeur: number, metrique = 'seuil', unite = 'niveau', seanceId = `s-${date}`): Resultat => ({
  seanceId, bilanId: null, exerciceId, domaine: 'flexibilite', date, metrique, unite, valeur, niveauDepart: null, niveauArrivee: null,
});
const jours = (debut: string, k: number) => Array.from({ length: k }, (_, i) => ajouterJours(debut, i));

describe('écart à la ligne de base', () => {
  it('prend les sept premières séances comme référence et oriente les temps vers le haut', () => {
    const dates = jours('2026-12-01', 14);
    const rs = dates.map((d, i) => res('decision-lexicale', d, i < 7 ? 800 + (i % 2) * 40 : 700, 'tr-median', 'ms'));
    const [s] = S.seriesExercices(rs);
    expect(s!.reference).toHaveLength(7);
    expect(s!.sens).toBe('bas');
    // Des temps plus courts que la référence donnent un écart positif.
    expect(s!.ecarts.at(-1)!.valeur).toBeGreaterThan(1);
    expect(s!.referenceEnCours).toBe(false);
  });

  it('ajoute la valeur du bilan quand l’épreuve mesure la même grandeur', () => {
    const rs = jours('2026-12-01', 3).map((d) => res('double-decision', d, 200, 'seuil-ms', 'ms'));
    const [s] = S.seriesExercices(rs, [{ date: '2026-11-25', metriques: { 'double-decision.seuil-ms': 260 } }]);
    expect(s!.reference).toEqual([260, 200, 200, 200]);
  });

  it('applique un plancher à l’écart-type quand la référence est très régulière', () => {
    const rs = [...jours('2026-12-01', 7).map((d) => res('stroop', d, 5)), res('stroop', '2026-12-08', 6)];
    const [s] = S.seriesExercices(rs);
    // Écart-type nul : plancher de 0,5 niveau, donc un écart borné et non infini.
    expect(Number.isFinite(s!.ecarts.at(-1)!.valeur)).toBe(true);
  });

  it('n’entre pas les volumes de travail ni les autoévaluations dans le score de domaine', () => {
    const rs = jours('2026-12-01', 8).map((d) => res('traits-semantiques', d, 4, 'mots-travailles', 'mots'));
    expect(S.seriesExercices(rs)[0]!.dansScore).toBe(false);
    expect(S.scoreDomaine(S.seriesExercices(rs), 'acces-lexical')).toEqual([]);
  });

  it('reporte la dernière valeur de chaque exercice sept jours au plus dans le score du domaine', () => {
    const a = jours('2026-12-01', 10).map((d) => res('stroop', d, 5 + (Number(d.slice(-2)) % 2)));
    const b = jours('2026-12-01', 10).map((d) => res('alternance', d, 4 + (Number(d.slice(-2)) % 3)));
    const plus = [res('stroop', '2026-12-11', 9), res('alternance', '2026-12-20', 9)];
    const pts = S.scoreDomaine(S.seriesExercices([...a, ...b, ...plus]), 'flexibilite');
    const p11 = pts.find((p) => p.date === '2026-12-11')!;
    const p20 = pts.find((p) => p.date === '2026-12-20')!;
    expect(p11).toBeDefined();
    // Le 20, la dernière valeur de Stroop date de neuf jours : seule l'alternance compte.
    const alt = S.seriesExercices([...a, ...b, ...plus]).find((s) => s.exercice === 'alternance')!;
    expect(p20.valeur).toBeCloseTo(alt.ecarts.at(-1)!.valeur, 2);
  });

  it('qualifie la tendance sans jamais la dramatiser', () => {
    const pts = jours('2026-12-01', 20).map((date, i) => ({ date, valeur: i < 8 ? 1 : 0.2 }));
    expect(S.tendance(pts)).toBe('baisse');
    expect(S.tendance(pts.slice(0, 3))).toBeNull();
  });
});

describe('série, anneaux et contexte', () => {
  const lundi = '2026-11-30';
  it('ne rompt pas la série un jour de repos, ni aujourd’hui avant la séance', () => {
    expect(versDate(lundi).getDay()).toBe(1);
    // Dimanche 29 est le jour de repos.
    expect(S.serieEnCours(['2026-11-27', '2026-11-28', '2026-11-30'], '2026-11-30', 0)).toEqual({ jours: 3, reprise: false });
    expect(S.serieEnCours(['2026-11-27', '2026-11-28'], '2026-11-30', 0)).toEqual({ jours: 2, reprise: false });
  });
  it('signale une reprise après une interruption', () => {
    expect(S.serieEnCours(['2026-11-24', '2026-11-25'], '2026-11-30', 0)).toEqual({ jours: 0, reprise: true });
    expect(S.serieEnCours([], '2026-11-30', 0)).toEqual({ jours: 0, reprise: false });
  });
  it('compte les minutes d’entraînement du jour', () => {
    const s: Seance = { id: 'a', date: lundi, debut: '2026-11-30T08:00:00.000Z', fin: '2026-11-30T08:17:30.000Z', contexte: { sommeilHeures: 7, fatigue: 2 }, plan: [], blocsRealises: [], appareilId: null };
    expect(S.minutesDuJour([s, { ...s, id: 'b', date: '2026-11-29' }], lundi)).toBe(18);
  });
  it('ne donne une médiane par tranche qu’à partir de trois séances', () => {
    const seances: Seance[] = [1, 2, 3, 4].map((i) => ({
      id: `s${i}`, date: `2026-12-0${i}`, debut: `2026-12-0${i}T09:00:00`, fin: `2026-12-0${i}T09:20:00`,
      contexte: { sommeilHeures: 7, fatigue: i === 4 ? 5 : 2 }, plan: [], blocsRealises: [], appareilId: null,
    }));
    const perf = new Map(seances.map((s, i) => [s.id, i * 0.1]));
    const c = S.contexteParTranche(seances, perf);
    expect(c.fatigue[0]).toMatchObject({ seances: 3, mediane: 0.1 });
    expect(c.fatigue[2]).toMatchObject({ seances: 1, mediane: null });
    expect(c.moment[0]!.seances).toBe(4);
  });
  it('repère les changements d’appareil', () => {
    const s = (date: string, appareilId: string | null) => ({ id: date, date, debut: '', fin: '', contexte: { sommeilHeures: null, fatigue: null }, plan: [], blocsRealises: [], appareilId }) as Seance;
    expect(S.changementsAppareil([s('2026-12-01', 'a'), s('2026-12-02', 'a'), s('2026-12-03', 'b'), s('2026-12-04', null), s('2026-12-05', 'b')])).toEqual(['2026-12-03']);
  });
});

describe('journal', () => {
  const ep = (m: Partial<Episode>): Episode => ({ ...J.nouvelEpisode(new Date('2026-12-02T10:30:00')), ...m });

  it('synthétise les épisodes par situation, moment et stratégie', () => {
    const e = [
      ep({ id: '1', situation: 'reunion', strategie: 'str-decrire', issue: 'immediate' }),
      ep({ id: '2', situation: 'reunion', strategie: 'str-decrire', issue: 'non-retrouve', dateHeure: new Date('2026-12-02T18:00:00').toISOString() }),
      ep({ id: '3', situation: 'telephone', dateHeure: new Date('2026-11-01T10:00:00').toISOString() }),
    ];
    const s = S.syntheseJournal(e, '2026-11-26', '2026-12-02');
    expect(s.total).toBe(2);
    expect(s.parSituation.find((x) => x.libelle === 'Réunion')!.n).toBe(2);
    expect(s.parHeure.find((x) => x.libelle === '10 h à 12 h')!.n).toBe(1);
    expect(s.parHeure.find((x) => x.libelle === 'Après 17 h')!.n).toBe(1);
    expect(s.strategies).toEqual([{ strategie: 'str-decrire', n: 2, retrouves: 1 }]);
  });

  it('transforme un mot cherché en carte personnelle, révisée dès le lendemain, sans la réinitialiser ensuite', async () => {
    const db = await base();
    const e = ep({ id: 'e1', motCherche: ' Subsidiarité ', motProduit: 'le principe', issue: 'differee' });
    await J.enregistrerEpisode(db, e, null);
    const id = J.idCartePerso('Subsidiarité');
    expect(id).toBe('perso-subsidiarite');
    const carte = await db.get('cartes', id);
    expect(carte).toMatchObject({ paquet: 'journal', perso: { mot: 'Subsidiarité', indice: null, motProduit: 'le principe' } });
    expect(carte!.etat.echeance).toBe(ajouterJours(S.dateDe(e), 1));
    await db.put('cartes', { ...carte!, etat: { ...carte!.etat, intervalle: 6, echeance: '2026-12-20' } });
    await J.enregistrerEpisode(db, { ...e, id: 'e2' }, 'principe de répartition des compétences au niveau le plus proche');
    const apres = await db.get('cartes', id);
    expect(apres!.etat.echeance).toBe('2026-12-20');
    expect(apres!.perso!.indice).toMatch(/répartition/);
    expect(await J.motsPersonnels(db)).toEqual(['Subsidiarité']);
    expect(await J.journalRenseigne(db, S.dateDe(e))).toBe(true);
  });

  it('compte « aucun épisode » comme journal renseigné', async () => {
    const db = await base();
    expect(await J.journalRenseigne(db, '2026-12-03')).toBe(false);
    await J.noterJournalSansEpisode(db, '2026-12-03');
    expect(await J.journalRenseigne(db, '2026-12-03')).toBe(true);
  });

  it('présente une carte personnelle avec l’indice noté, ou à défaut le mot employé à la place', () => {
    const carte = { id: 'perso-x', paquet: 'journal', itemId: 'perso-x', etat: { facilite: 2.5, intervalle: 1, repetitions: 0, echeance: '2026-12-03', echecs: 1, derniereRevision: '2026-12-02' } };
    expect(ficheDeCartePerso({ ...carte, perso: { mot: 'avenant', indice: 'modification d’un contrat', motProduit: null, episodeId: 'e' } })).toMatchObject({ question: 'modification d’un contrat', reponse: 'avenant' });
    expect(ficheDeCartePerso({ ...carte, perso: { mot: 'avenant', indice: null, motProduit: 'complément', episodeId: 'e' } })!.question).toMatch(/« complément »/);
    expect(ficheDeCartePerso(carte)).toBeNull();
  });

  it('applique l’analyse des traits à deux mots du journal au plus, en tête du bloc', () => {
    const items = itemsTraits(['avenant', 'subsidiarité', 'préemption'], new Map([['perso-avenant', '2026-12-01']]));
    expect(items.slice(0, 2).map((i) => i.mot)).toEqual(['subsidiarité', 'préemption']);
    expect(items[0]!.traits).toBeNull();
    expect(items[2]!.traits).not.toBeNull();
  });
});

describe('volet comportemental', () => {
  const h = (date: string, comportemental = false): SeancePassee => ({ date, exercices: [], comportemental });

  it('n’apparaît qu’à partir de la cinquième séance, puis une fois par semaine', () => {
    expect(comportementalDuJour([h('2026-12-01'), h('2026-12-02'), h('2026-12-03')], '2026-12-04')).toBe(false);
    const quatre = [h('2026-12-01'), h('2026-12-02'), h('2026-12-03'), h('2026-12-04')];
    expect(comportementalDuJour(quatre, '2026-12-05')).toBe(true);
    expect(comportementalDuJour([...quatre, h('2026-12-05', true)], '2026-12-11')).toBe(false);
    expect(comportementalDuJour([...quatre, h('2026-12-05', true)], '2026-12-12')).toBe(true);
  });

  it('remplace les exercices ciblés, sans toucher à la double décision ni aux révisions', () => {
    const quatre = ['2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'].map((d) => ({ date: d, exercices: [] as string[] }));
    const c = composerSeance({ date: '2026-12-05', jourRepos: 0, domainePrioritaire: 'acces-lexical', historique: quatre, rappelsDus: [] });
    expect(c.disponible).toBe(true);
    if (!c.disponible) return;
    const types = c.blocs.map((b) => (b.type === 'exercice' ? b.role : b.type));
    expect(types).toEqual(['echauffement', 'comportemental', 'vitesse', 'repetition-espacee']);
  });

  it('revient environ une séance sur six sur deux mois', () => {
    const historique: SeancePassee[] = [];
    let date = '2026-12-01';
    while (historique.length < 60) {
      const c = composerSeance({ date, jourRepos: 0, domainePrioritaire: 'vitesse', historique, rappelsDus: [] });
      if (c.disponible) historique.push({ date, exercices: [], comportemental: c.blocs.some((b) => b.type === 'comportemental') });
      date = ajouterJours(date, 1);
    }
    const nb = historique.filter((s) => s.comportemental).length;
    expect(nb).toBeGreaterThanOrEqual(9);
    expect(nb).toBeLessThanOrEqual(11);
  });

  it('est repéré dans l’historique des séances', async () => {
    const db = await base();
    const s = await P.ouvrirSeance(db, '2026-12-05', { sommeilHeures: null, fatigue: null }, ['0:comportemental'], null);
    const apres = await P.enregistrerBloc(db, s, '1:comportemental', null, '2026-12-05');
    await P.cloreSeance(db, apres);
    expect(await P.historique(db)).toEqual([{ date: '2026-12-05', exercices: [], comportemental: true }]);
    expect(await db.count('resultats')).toBe(0);
  });

  it('fait tourner les fiches et guide une respiration à six cycles par minute', () => {
    expect(strategies().length).toBeGreaterThanOrEqual(12);
    expect(ficheDuVolet(0).id).not.toBe(ficheDuVolet(1).id);
    expect(ficheDuVolet(strategies().length).id).toBe(ficheDuVolet(0).id);
    expect(phaseRespiration(1000)).toMatchObject({ phase: 'inspiration', resteS: 3 });
    expect(phaseRespiration(4500)).toMatchObject({ phase: 'expiration', resteS: 6 });
    expect(phaseRespiration(10_000).phase).toBe('inspiration');
  });
});

it('date un épisode en heure locale', () => {
  expect(S.dateDe({ dateHeure: new Date('2026-12-02T23:30:00').toISOString() })).toBe(dateLocale(new Date('2026-12-02T23:30:00')));
});
