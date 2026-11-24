/**
 * Calculs du suivi. Fonctions pures : elles reçoivent les enregistrements lus en base et
 * renvoient ce que la page « Progression » affiche, ce qui permet de tester chaque règle.
 *
 * Principe retenu dans la conception : pour chaque exercice, écart à la ligne de base
 * personnelle = (moyenne lissée − moyenne de référence) ÷ écart-type de référence, orienté pour
 * que « plus haut » signifie toujours « mieux ». La référence réunit la valeur du bilan, quand
 * l'épreuve mesure la même chose, et les sept premières séances de l'exercice.
 */
import { ajouterJours, dateLocale, ecartJours, versDate, type DateLocale } from '../moteur/dates';
import { mediane, moyenne, moyenneMobile, zInterne, type Point, type Sens } from '../moteur/statistiques';
import { EXERCICES, type IdExercice } from '../seance/catalogue';
import { DOMAINES, type Domaine, type Episode, type Resultat, type Seance } from '../stockage/types';

/** Nombre de séances d'un exercice qui composent sa ligne de base (en plus du bilan). */
export const SEANCES_REFERENCE = 7;
/** En deçà, la ligne de base est jugée trop fragile : aucun écart n'est calculé. */
export const REFERENCE_MIN = 3;
/** Fenêtre de lissage, en jours calendaires. */
export const FENETRE_LISSAGE = 7;
/** Une valeur lissée reste valable pour la courbe de domaine pendant cette durée (jours). */
export const REPORT_MAX_JOURS = 7;
/** Objectif quotidien d'entraînement, en minutes (anneau « Entraînement »). */
export const OBJECTIF_MINUTES = 18;

/**
 * Métriques qui ne mesurent pas une performance : elles sont affichées par exercice mais
 * n'entrent pas dans le score de domaine. « mots-travailles » compte un volume de travail,
 * « autoevaluation » est votre propre jugement.
 */
export const METRIQUES_HORS_SCORE: ReadonlySet<string> = new Set(['mots-travailles', 'autoevaluation']);

/** Un temps est meilleur quand il baisse ; toutes les autres métriques le sont quand elles montent. */
export function sensDe(unite: string): Sens {
  return unite === 'ms' ? 'bas' : 'haut';
}

/** Plancher absolu de l'écart-type selon l'unité, pour éviter des écarts démesurés sur des séries très régulières. */
export function plancherDe(unite: string): number {
  if (unite === 'ms') return 20;
  if (unite === '%') return 5;
  if (unite === 'niveau' || unite === 'chiffres' || unite === 'lettres') return 0.5;
  return 1;
}

/** Épreuves du bilan qui mesurent exactement la même grandeur qu'une métrique d'entraînement. */
export const CORRESPONDANCES_BILAN: Readonly<Record<string, string>> = {
  'double-decision|seuil-ms': 'double-decision.seuil-ms',
  'decision-lexicale|tr-median': 'decision-lexicale.tr-median',
  'empan-inverse|seuil': 'empan-inverse.empan',
};

export interface BilanPourSuivi {
  date: DateLocale;
  metriques: Record<string, number>;
}

export interface SerieExercice {
  cle: string;
  exercice: IdExercice;
  metrique: string;
  unite: string;
  domaine: Domaine;
  sens: Sens;
  dansScore: boolean;
  /** Valeurs brutes, une par jour (moyenne si plusieurs le même jour). */
  brutes: Point[];
  lissees: Point[];
  /** Valeurs composant la ligne de base. */
  reference: number[];
  /** Vrai tant que les sept séances de référence ne sont pas toutes réunies. */
  referenceEnCours: boolean;
  /** Écart lissé à la ligne de base, en écarts-types, aux dates observées. */
  ecarts: Point[];
}

const parDate = (a: { date: string }, b: { date: string }) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/** Regroupe les résultats par exercice et métrique, puis calcule lissage et écarts. */
export function seriesExercices(resultats: readonly Resultat[], bilans: readonly BilanPourSuivi[] = []): SerieExercice[] {
  const groupes = new Map<string, Resultat[]>();
  for (const r of resultats) {
    if (r.seanceId === null || !Number.isFinite(r.valeur) || !(r.exerciceId in EXERCICES)) continue;
    const cle = `${r.exerciceId}|${r.metrique}`;
    groupes.set(cle, [...(groupes.get(cle) ?? []), r]);
  }
  const series: SerieExercice[] = [];
  for (const [cle, rs] of groupes) {
    const premier = rs[0]!;
    const exercice = premier.exerciceId as IdExercice;
    const parJour = new Map<string, number[]>();
    for (const r of rs) parJour.set(r.date, [...(parJour.get(r.date) ?? []), r.valeur]);
    const brutes = [...parJour.entries()].map(([date, v]) => ({ date, valeur: moyenne(v) })).sort(parDate);
    const lissees = moyenneMobile(brutes, FENETRE_LISSAGE);
    const sens = sensDe(premier.unite);

    const cleBilan = CORRESPONDANCES_BILAN[cle];
    const duBilan = cleBilan
      ? bilans.map((b) => b.metriques[cleBilan]).filter((v): v is number => v !== undefined && Number.isFinite(v))
      : [];
    const reference = [...duBilan, ...brutes.slice(0, SEANCES_REFERENCE).map((p) => p.valeur)];
    const options = { sens, plancherAbsolu: plancherDe(premier.unite) };
    const ecarts = lissees
      .map((p) => ({ date: p.date, valeur: zInterne(p.valeur, reference, options) }))
      .filter((p): p is Point => p.valeur !== null);

    series.push({
      cle, exercice, metrique: premier.metrique, unite: premier.unite, domaine: EXERCICES[exercice].domaine, sens,
      dansScore: !METRIQUES_HORS_SCORE.has(premier.metrique) && reference.length >= REFERENCE_MIN,
      brutes, lissees, reference, referenceEnCours: brutes.length < SEANCES_REFERENCE, ecarts,
    });
  }
  return series.sort((a, b) => EXERCICES[a.exercice].numero - EXERCICES[b.exercice].numero || a.cle.localeCompare(b.cle));
}

/**
 * Score d'un domaine à chaque date où l'un de ses exercices a été pratiqué : moyenne des écarts
 * des exercices du domaine, chacun pris à sa dernière valeur lissée datant de sept jours au plus.
 * Les exercices tournent d'une séance à l'autre ; sans ce report, la courbe sauterait d'un
 * exercice à l'autre au lieu de refléter le domaine.
 */
export function scoreDomaine(series: readonly SerieExercice[], domaine: Domaine): Point[] {
  const utiles = series.filter((s) => s.domaine === domaine && s.dansScore && s.ecarts.length > 0);
  const dates = [...new Set(utiles.flatMap((s) => s.ecarts.map((p) => p.date)))].sort();
  return dates.map((d) => {
    const valeurs: number[] = [];
    for (const s of utiles) {
      let dernier: Point | undefined;
      for (const p of s.ecarts) {
        if (p.date > d) break;
        dernier = p;
      }
      if (dernier && ecartJours(dernier.date, d) < REPORT_MAX_JOURS) valeurs.push(dernier.valeur);
    }
    return { date: d, valeur: Math.round(moyenne(valeurs) * 100) / 100 };
  });
}

export function scoresDomaines(series: readonly SerieExercice[]): Record<Domaine, Point[]> {
  return Object.fromEntries(DOMAINES.map((d) => [d, scoreDomaine(series, d)])) as Record<Domaine, Point[]>;
}

/**
 * Tendance récente d'un domaine, pour le ton du commentaire : différence entre la dernière valeur
 * et celle d'environ deux semaines plus tôt. Une baisse n'est jamais présentée comme un échec.
 */
export function tendance(points: readonly Point[]): 'hausse' | 'stable' | 'baisse' | null {
  if (points.length < 2) return null;
  const dernier = points.at(-1)!;
  const avant = [...points].reverse().find((p) => ecartJours(p.date, dernier.date) >= 14);
  if (!avant) return null;
  const d = dernier.valeur - avant.valeur;
  return d >= 0.3 ? 'hausse' : d <= -0.3 ? 'baisse' : 'stable';
}

/* ---------- Série de jours et anneaux ---------- */

export interface EtatSerie {
  /** Jours d'entraînement consécutifs, jours de repos exclus du décompte comme des ruptures. */
  jours: number;
  /** Vrai si une série précédente a été interrompue et qu'aucune séance ne l'a encore relancée. */
  reprise: boolean;
}

/**
 * Série en cours. Un jour de repos ne compte ni comme séance ni comme absence. Aujourd'hui,
 * tant que la séance n'est pas faite, ne rompt pas la série.
 */
export function serieEnCours(datesSeances: readonly DateLocale[], aujourdhui: DateLocale, jourRepos: number): EtatSerie {
  const faites = new Set(datesSeances);
  if (faites.size === 0) return { jours: 0, reprise: false };
  const repos = (d: DateLocale) => versDate(d).getDay() === jourRepos;
  const premiere = [...faites].sort()[0]!;
  let jours = 0;
  let d = aujourdhui;
  if (!faites.has(d)) d = ajouterJours(d, -1);
  for (let garde = 0; garde < 3660; garde++) {
    if (faites.has(d)) jours++;
    else if (!repos(d)) break;
    d = ajouterJours(d, -1);
    if (d < premiere) break;
  }
  return { jours, reprise: jours === 0 };
}

/** Minutes d'entraînement d'une journée : durée cumulée des séances (bornée à 60 min par séance). */
export function minutesDuJour(seances: readonly Seance[], date: DateLocale, maintenant: Date = new Date()): number {
  let ms = 0;
  for (const s of seances) {
    if (s.date !== date) continue;
    const fin = s.fin ? Date.parse(s.fin) : maintenant.getTime();
    ms += Math.min(60 * 60_000, Math.max(0, fin - Date.parse(s.debut)));
  }
  return Math.round(ms / 60_000);
}

/* ---------- Variables de contexte ---------- */

export interface TrancheContexte {
  libelle: string;
  seances: number;
  /** Médiane de l'écart moyen des séances de la tranche, ou null si moins de trois séances. */
  mediane: number | null;
}

/** Performance d'une séance : moyenne des écarts bruts (non lissés) de ses exercices comptés dans le score. */
export function performanceParSeance(resultats: readonly Resultat[], series: readonly SerieExercice[]): Map<string, number> {
  const parCle = new Map(series.filter((s) => s.dansScore).map((s) => [s.cle, s]));
  const parSeance = new Map<string, number[]>();
  for (const r of resultats) {
    if (!r.seanceId) continue;
    const s = parCle.get(`${r.exerciceId}|${r.metrique}`);
    if (!s) continue;
    const z = zInterne(r.valeur, s.reference, { sens: s.sens, plancherAbsolu: plancherDe(s.unite) });
    if (z !== null) parSeance.set(r.seanceId, [...(parSeance.get(r.seanceId) ?? []), z]);
  }
  return new Map([...parSeance.entries()].map(([k, v]) => [k, moyenne(v)]));
}

const tranche = (libelle: string, valeurs: number[]): TrancheContexte => ({
  libelle, seances: valeurs.length, mediane: valeurs.length >= 3 ? Math.round(mediane(valeurs) * 100) / 100 : null,
});

/**
 * Médianes de performance par moment de la journée, par fatigue ressentie et par durée de sommeil.
 * Affichées seulement après 30 séances, et toujours formulées comme des associations.
 */
export function contexteParTranche(seances: readonly Seance[], perf: ReadonlyMap<string, number>): {
  moment: TrancheContexte[]; fatigue: TrancheContexte[]; sommeil: TrancheContexte[];
} {
  const avec = seances.filter((s) => s.fin && perf.has(s.id));
  const v = (f: (s: Seance) => boolean) => avec.filter(f).map((s) => perf.get(s.id)!);
  const heure = (s: Seance) => new Date(s.debut).getHours();
  return {
    moment: [
      tranche('Avant midi', v((s) => heure(s) < 12)),
      tranche('De midi à 18 h', v((s) => heure(s) >= 12 && heure(s) < 18)),
      tranche('Après 18 h', v((s) => heure(s) >= 18)),
    ],
    fatigue: [
      tranche('Fatigue 1 ou 2', v((s) => s.contexte.fatigue !== null && s.contexte.fatigue <= 2)),
      tranche('Fatigue 3', v((s) => s.contexte.fatigue === 3)),
      tranche('Fatigue 4 ou 5', v((s) => s.contexte.fatigue !== null && s.contexte.fatigue >= 4)),
    ],
    sommeil: [
      tranche('Moins de 6 h', v((s) => s.contexte.sommeilHeures !== null && s.contexte.sommeilHeures < 6)),
      tranche('6 à 7 h', v((s) => s.contexte.sommeilHeures !== null && s.contexte.sommeilHeures >= 6 && s.contexte.sommeilHeures <= 7)),
      tranche('8 h ou plus', v((s) => s.contexte.sommeilHeures !== null && s.contexte.sommeilHeures >= 8)),
    ],
  };
}

/* ---------- Changements d'appareil ---------- */

/** Dates auxquelles un appareil différent du précédent a servi pour la première fois. */
export function changementsAppareil(seances: readonly Seance[]): DateLocale[] {
  const tries = [...seances].filter((s) => s.appareilId).sort(parDate);
  const res: DateLocale[] = [];
  let precedent: string | null = null;
  for (const s of tries) {
    if (precedent !== null && s.appareilId !== precedent && !res.includes(s.date)) res.push(s.date);
    precedent = s.appareilId;
  }
  return res;
}

/* ---------- Journal ---------- */

export const SITUATIONS: readonly { valeur: Episode['situation']; libelle: string }[] = [
  { valeur: 'reunion', libelle: 'Réunion' },
  { valeur: 'ecrit', libelle: 'Écrit' },
  { valeur: 'telephone', libelle: 'Téléphone' },
  { valeur: 'echange-informel', libelle: 'Échange informel' },
  { valeur: 'presentation', libelle: 'Présentation' },
  { valeur: 'autre', libelle: 'Autre' },
];

export const INTERLOCUTEURS: readonly { valeur: Episode['interlocuteur']; libelle: string }[] = [
  { valeur: 'hierarchie', libelle: 'Hiérarchie' },
  { valeur: 'pairs', libelle: 'Collègues' },
  { valeur: 'partenaires', libelle: 'Partenaires' },
  { valeur: 'public', libelle: 'Public' },
  { valeur: 'proches', libelle: 'Proches' },
  { valeur: 'autre', libelle: 'Autre' },
];

export const ISSUES: readonly { valeur: Episode['issue']; libelle: string }[] = [
  { valeur: 'immediate', libelle: 'Retrouvé vite' },
  { valeur: 'differee', libelle: 'Retrouvé plus tard' },
  { valeur: 'non-retrouve', libelle: 'Pas retrouvé' },
];

export const TRANCHES_HORAIRES = ['Avant 10 h', '10 h à 12 h', '12 h à 14 h', '14 h à 17 h', 'Après 17 h'] as const;

export function trancheHoraire(heure: number): (typeof TRANCHES_HORAIRES)[number] {
  if (heure < 10) return 'Avant 10 h';
  if (heure < 12) return '10 h à 12 h';
  if (heure < 14) return '12 h à 14 h';
  if (heure < 17) return '14 h à 17 h';
  return 'Après 17 h';
}

export interface SyntheseJournal {
  total: number;
  parSituation: { libelle: string; n: number }[];
  parHeure: { libelle: string; n: number }[];
  parIssue: { libelle: string; n: number }[];
  /** Stratégies employées, avec la part d'épisodes où le mot est revenu (vite ou plus tard). */
  strategies: { strategie: string; n: number; retrouves: number }[];
  enjeuMoyen: number | null;
  fatigueMoyenne: number | null;
}

/** Synthèse des épisodes compris entre `depuis` et `jusqua` inclus (dates locales). */
export function syntheseJournal(episodes: readonly Episode[], depuis: DateLocale, jusqua: DateLocale): SyntheseJournal {
  const dans = episodes.filter((e) => {
    const d = dateDe(e);
    return d >= depuis && d <= jusqua;
  });
  const compter = <T extends string>(liste: readonly { valeur: T; libelle: string }[], cle: (e: Episode) => T) =>
    liste.map((x) => ({ libelle: x.libelle, n: dans.filter((e) => cle(e) === x.valeur).length }));
  const strategies = new Map<string, { n: number; retrouves: number }>();
  for (const e of dans) {
    if (!e.strategie) continue;
    const s = strategies.get(e.strategie) ?? { n: 0, retrouves: 0 };
    s.n++;
    if (e.issue !== 'non-retrouve') s.retrouves++;
    strategies.set(e.strategie, s);
  }
  const m = (v: number[]) => (v.length ? Math.round(moyenne(v) * 10) / 10 : null);
  return {
    total: dans.length,
    parSituation: compter(SITUATIONS, (e) => e.situation),
    parHeure: TRANCHES_HORAIRES.map((t) => ({ libelle: t, n: dans.filter((e) => trancheHoraire(new Date(e.dateHeure).getHours()) === t).length })),
    parIssue: compter(ISSUES, (e) => e.issue),
    strategies: [...strategies.entries()].map(([strategie, s]) => ({ strategie, ...s })).sort((a, b) => b.n - a.n),
    enjeuMoyen: m(dans.map((e) => e.enjeu)),
    fatigueMoyenne: m(dans.map((e) => e.fatigue)),
  };
}

/** Date locale d'un épisode (son horodatage est en ISO, donc en UTC). */
export function dateDe(e: Pick<Episode, 'dateHeure'>): DateLocale {
  return dateLocale(new Date(e.dateHeure));
}
