/**
 * Synthèse imprimable de deux pages A4. Le navigateur l'enregistre en PDF depuis sa fenêtre
 * d'impression : texte et graphiques restent vectoriels, sans bibliothèque supplémentaire.
 * Les graphiques ont une taille fixe, adaptée à la largeur utile d'une page A4.
 */
import { useEffect, useMemo, useState } from 'react';
import { Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { useApp } from '../etat/contexte';
import { lien } from '../etat/routeur';
import { ajouterJours, dateLocale, ecartJours, formatDate, versDate, type DateLocale } from '../moteur/dates';
import { DOMAINES, NOMS_DOMAINES, type Annotation, type Episode, type Resultat, type Seance } from '../stockage/types';
import { lireBilans, scoresDuBilan, type BilanComplet } from '../bilan/historique';
import * as S from '../suivi/calculs';
import { ficheParId } from '../comportemental/Fiche';
import { Bouton, ControleSegmente } from '../ui/composants';
import { EXERCICES } from '../seance/catalogue';

const LARGEUR = 700;
const COURTS: Record<(typeof DOMAINES)[number], string> = {
  'acces-lexical': 'Accès lexical', vitesse: 'Vitesse', 'memoire-travail': 'Mém. travail',
  'memoire-episodique': 'Mém. épisodique', attention: 'Attention', flexibilite: 'Flexibilité',
};
const AVERTISSEMENT =
  "Lexique est un outil d'entraînement à usage personnel ; il n'est pas un dispositif médical. Les scores sont des repères internes, comparés uniquement à la ligne de base de la personne, sans norme de population ; ils ne constituent ni une évaluation neuropsychologique ni un diagnostic.";

type Periode = 'tout' | '90';

interface Donnees { resultats: Resultat[]; seances: Seance[]; bilans: BilanComplet[]; episodes: Episode[]; annotations: Annotation[] }

const court = (d: DateLocale) => versDate(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const signe = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`;
const TENDANCES = { hausse: 'en hausse', stable: 'stable', baisse: 'en légère baisse' } as const;

/** Jours d'entraînement possibles entre deux dates, jour de repos exclu. */
export function joursPossibles(debut: DateLocale, fin: DateLocale, jourRepos: number): number {
  let n = 0;
  for (let d = debut; d <= fin; d = ajouterJours(d, 1)) if (versDate(d).getDay() !== jourRepos) n++;
  return n;
}

export function Synthese() {
  const { db, reglages, setConcentration } = useApp();
  const [d, setD] = useState<Donnees | null>(null);
  const [periode, setPeriode] = useState<Periode>('tout');

  useEffect(() => {
    setConcentration(true);
    return () => setConcentration(false);
  }, [setConcentration]);

  useEffect(() => {
    if (!db) return;
    void (async () => {
      const [resultats, seances, bilans, episodes, annotations] = await Promise.all([
        db.getAll('resultats'), db.getAll('seances'), lireBilans(db), db.getAll('episodes'), db.getAll('annotations'),
      ]);
      setD({ resultats, seances, bilans: bilans.filter((b) => b.complet), episodes, annotations });
    })();
  }, [db]);

  const c = useMemo(() => {
    if (!d) return null;
    const aujourdhui = dateLocale();
    const terminees = d.seances.filter((s) => s.fin).sort((a, b) => (a.date < b.date ? -1 : 1));
    const premiere = terminees[0]?.date ?? d.bilans[0]?.date ?? aujourdhui;
    const debut = periode === '90' ? (ajouterJours(aujourdhui, -89) > premiere ? ajouterJours(aujourdhui, -89) : premiere) : premiere;
    const dans = (x: DateLocale) => x >= debut && x <= aujourdhui;
    // La ligne de base se calcule toujours sur l'ensemble des données ; seule la fenêtre affichée change.
    const series = S.seriesExercices(d.resultats, d.bilans);
    const scores = S.scoresDomaines(series);
    const seancesPeriode = terminees.filter((s) => dans(s.date));
    const minutes = seancesPeriode.reduce((n, s) => n + Math.min(60, (Date.parse(s.fin!) - Date.parse(s.debut)) / 60_000), 0);
    return {
      debut, fin: aujourdhui, series, seancesPeriode,
      minutes: Math.round(minutes),
      possibles: joursPossibles(debut, aujourdhui, reglages.jourRepos),
      scores: Object.fromEntries(DOMAINES.map((x) => [x, scores[x].filter((p) => dans(p.date))])) as Record<(typeof DOMAINES)[number], { date: string; valeur: number }[]>,
      journal: S.syntheseJournal(d.episodes, debut, aujourdhui),
      annotations: d.annotations.filter((a) => dans(a.date)),
      appareils: S.changementsAppareil(d.seances).filter(dans),
    };
  }, [d, periode, reglages.jourRepos]);

  if (!db) return <p className="p-8 text-center text-texte-2">Le stockage local est indisponible.</p>;
  if (!d || !c) return <p className="p-8 text-center text-texte-2" role="status">Chargement…</p>;

  const premier = d.bilans[0];
  const dernier = d.bilans.length > 1 ? d.bilans.at(-1) : undefined;
  const radar = DOMAINES.map((x) => ({ domaine: COURTS[x], premier: premier ? (scoresDuBilan(premier)[x] ?? 0) : 0, dernier: dernier ? (scoresDuBilan(dernier)[x] ?? 0) : 0 }));
  const assiduite = c.possibles ? Math.round((c.seancesPeriode.length / c.possibles) * 100) : 0;

  return (
    <div className="synthese min-h-screen bg-fond pb-16">
      <div className="non-imprime mx-auto max-w-[760px] space-y-3 px-4 pt-4">
        <div className="flex items-center justify-between">
          <a href={lien('/export')} className="min-h-[44px] content-center font-semibold text-accent">‹ Export</a>
        </div>
        <ControleSegmente<Periode> libelle="Période" options={[{ valeur: 'tout', texte: 'Depuis le début' }, { valeur: '90', texte: '90 derniers jours' }]} valeur={periode} onChange={setPeriode} />
        <Bouton className="w-full" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</Bouton>
        <p className="text-[0.875rem] leading-snug text-texte-2">
          Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF » comme destination, le format A4 et
          l'orientation portrait. Sur iPhone, touchez Partager puis Imprimer, et écartez deux doigts sur l'aperçu pour
          obtenir le PDF.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto px-4 print:mt-0 print:overflow-visible print:px-0">
        <article className="feuille mx-auto" style={{ width: LARGEUR }}>
          {/* ---------- Page 1 ---------- */}
          <section className="page-a4">
            <header className="flex items-end justify-between border-b border-separateur pb-2">
              <div>
                <h1 className="text-[1.5rem] font-bold">Lexique · synthèse du suivi</h1>
                <p className="text-[0.875rem] text-texte-2">Du {formatDate(c.debut)} au {formatDate(c.fin)}</p>
              </div>
              <p className="text-[0.75rem] text-texte-2">Éditée le {formatDate(dateLocale())} · page 1 sur 2</p>
            </header>

            <dl className="mt-4 grid grid-cols-4 gap-3 text-center">
              {[
                ['Séances terminées', String(c.seancesPeriode.length)],
                ["Minutes d'entraînement", c.minutes.toLocaleString('fr-FR')],
                ['Assiduité', `${assiduite} %`],
                ['Épisodes consignés', String(c.journal.total)],
              ].map(([t, v]) => (
                <div key={t} className="rounded-[10px] bg-surface p-2">
                  <dt className="text-[0.75rem] text-texte-2">{t}</dt>
                  <dd className="text-[1.375rem] font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-1 text-[0.75rem] text-texte-2">Assiduité : séances terminées rapportées aux jours de la période, jour de repos exclu.</p>

            <div className="mt-4 grid grid-cols-[320px_1fr] gap-4">
              <div>
                <h2 className="text-[1rem] font-semibold">Profil aux bilans</h2>
                {premier ? (
                  <RadarChart width={320} height={250} data={radar} outerRadius={78} margin={{ top: 8, right: 44, bottom: 8, left: 44 }}>
                    <PolarGrid stroke="var(--c-separateur)" />
                    <PolarAngleAxis dataKey="domaine" tick={{ fill: 'var(--c-texte-2)', fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={`Bilan du ${court(premier.date)}`} dataKey="premier" stroke="var(--c-texte-2)" fill="var(--c-texte-2)" fillOpacity={0.08} strokeDasharray={dernier ? '4 4' : undefined} isAnimationActive={false} />
                    {dernier && <Radar name={`Bilan du ${court(dernier.date)}`} dataKey="dernier" stroke="var(--c-accent)" fill="var(--c-accent)" fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />}
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RadarChart>
                ) : (
                  <p className="mt-2 text-[0.875rem] text-texte-2">Aucun bilan complet.</p>
                )}
                <p className="text-[0.75rem] leading-snug text-texte-2">Pourcentage du maximum de chaque épreuve, moyenné par domaine ; formes parallèles différentes à chaque bilan.</p>
              </div>
              <div>
                <h2 className="text-[1rem] font-semibold">Évolution depuis la ligne de base</h2>
                <table className="mt-2 w-full text-left text-[0.8125rem]">
                  <thead className="text-texte-2">
                    <tr><th className="py-1 font-normal">Domaine</th><th className="py-1 text-right font-normal">Écart actuel</th><th className="py-1 pl-2 font-normal">Deux semaines</th></tr>
                  </thead>
                  <tbody className="divide-y divide-separateur">
                    {DOMAINES.map((x) => {
                      const pts = c.scores[x];
                      const t = S.tendance(pts);
                      return (
                        <tr key={x}>
                          <td className="py-1.5"><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: `var(--c-${x})` }} />{NOMS_DOMAINES[x]}</td>
                          <td className="py-1.5 text-right tabular-nums">{pts.length ? signe(pts.at(-1)!.valeur) : '·'}</td>
                          <td className="py-1.5 pl-2 text-texte-2">{t ? TENDANCES[t] : pts.length ? 'trop tôt' : 'non pratiqué'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-[0.75rem] leading-snug text-texte-2">
                  Écart en écarts-types entre la moyenne des sept derniers jours et la ligne de base personnelle (bilan et sept
                  premières séances de chaque exercice) ; positif = mieux. Moyenne des exercices du domaine.
                </p>
              </div>
            </div>

            <h2 className="mt-4 text-[1rem] font-semibold">Exercices pratiqués</h2>
            <table className="mt-1 w-full text-left text-[0.8125rem]">
              <thead className="text-texte-2"><tr><th className="py-1 font-normal">Exercice</th><th className="py-1 text-right font-normal">Séances</th><th className="py-1 text-right font-normal">Valeur lissée</th><th className="py-1 text-right font-normal">Écart</th></tr></thead>
              <tbody className="divide-y divide-separateur">
                {c.series.filter((s) => s.brutes.some((p) => p.date >= c.debut)).slice(0, 14).map((s) => {
                  const v = s.lissees.at(-1);
                  const e = s.ecarts.at(-1);
                  return (
                    <tr key={s.cle}>
                      <td className="py-1">{TITRES[s.exercice] ?? s.exercice} <span className="text-texte-2">({s.metrique})</span></td>
                      <td className="py-1 text-right tabular-nums">{s.brutes.filter((p) => p.date >= c.debut).length}</td>
                      <td className="py-1 text-right tabular-nums">{v ? `${v.valeur.toLocaleString('fr-FR', { maximumFractionDigits: s.unite === 'ms' || s.unite === '%' ? 0 : 1 })} ${s.unite}` : ''}</td>
                      <td className="py-1 text-right tabular-nums">{e && s.dansScore && !s.referenceEnCours ? signe(e.valeur) : '·'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <footer className="mt-4 border-t border-separateur pt-2 text-[0.6875rem] leading-snug text-texte-2">{AVERTISSEMENT}</footer>
          </section>

          {/* ---------- Page 2 ---------- */}
          <section className="page-a4">
            <header className="flex items-end justify-between border-b border-separateur pb-2">
              <h2 className="text-[1.25rem] font-bold">Courbes lissées et journal</h2>
              <p className="text-[0.75rem] text-texte-2">page 2 sur 2</p>
            </header>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {DOMAINES.map((x) => <MiniCourbe key={x} domaine={x} points={c.scores[x]} annotations={c.annotations} appareils={c.appareils} />)}
            </div>
            <p className="mt-1 text-[0.75rem] leading-snug text-texte-2">
              Écart à la ligne de base (écarts-types, lissage sur 7 jours calendaires). Traits verticaux pleins : annotations ;
              pointillés : changement d'appareil.
              {c.annotations.length > 0 && ` Annotations : ${c.annotations.map((a) => `${court(a.date)}, ${a.texte}`).join(' ; ')}.`}
            </p>

            <h2 className="mt-4 text-[1rem] font-semibold">Journal du manque du mot</h2>
            {c.journal.total === 0 ? (
              <p className="mt-1 text-[0.875rem] text-texte-2">Aucun épisode consigné sur la période.</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Barres titre="Par situation" valeurs={c.journal.parSituation} />
                <Barres titre="Par moment de la journée" valeurs={c.journal.parHeure} />
                <Barres titre="Issue" valeurs={c.journal.parIssue} />
                <div className="text-[0.8125rem]">
                  <h3 className="font-semibold">Stratégies employées</h3>
                  {c.journal.strategies.length === 0 ? <p className="text-texte-2">Aucune renseignée.</p> : (
                    <ul className="mt-1 space-y-0.5">
                      {c.journal.strategies.slice(0, 6).map((s) => <li key={s.strategie}>{ficheParId(s.strategie)?.titre ?? s.strategie} <span className="text-texte-2">· {s.n} fois, mot revenu {s.retrouves} fois</span></li>)}
                    </ul>
                  )}
                  <p className="mt-2 text-texte-2">
                    {c.journal.total} épisodes{c.journal.enjeuMoyen !== null ? ` ; enjeu moyen ${c.journal.enjeuMoyen.toLocaleString('fr-FR')}/5, fatigue moyenne ${c.journal.fatigueMoyenne?.toLocaleString('fr-FR')}/5` : ''}.
                  </p>
                </div>
              </div>
            )}

            <footer className="mt-6 border-t border-separateur pt-2 text-[0.6875rem] leading-snug text-texte-2">
              {AVERTISSEMENT} Méthode de calcul détaillée dans le document METHODE.md de l'application ; données complètes dans
              l'archive CSV, accompagnée de son dictionnaire des variables.
            </footer>
          </section>
        </article>
      </div>
    </div>
  );
}

const TITRES: Record<string, string> = Object.fromEntries(Object.values(EXERCICES).map((e) => [e.id, e.titre]));

function MiniCourbe({ domaine, points, annotations, appareils }: {
  domaine: (typeof DOMAINES)[number]; points: { date: string; valeur: number }[]; annotations: Annotation[]; appareils: DateLocale[];
}) {
  const donnees = points.map((p) => ({ t: versDate(p.date).getTime(), valeur: p.valeur }));
  const debut = donnees[0]?.t ?? 0;
  const fin = donnees.at(-1)?.t ?? 0;
  const dans = (x: DateLocale) => versDate(x).getTime() >= debut && versDate(x).getTime() <= fin;
  return (
    <div>
      <h3 className="text-[0.8125rem] font-semibold" style={{ color: `var(--c-${domaine})` }}>{NOMS_DOMAINES[domaine]}</h3>
      {donnees.length < 2 ? (
        <p className="flex h-[110px] items-center text-[0.75rem] text-texte-2">Pas assez de séances pour une courbe.</p>
      ) : (
        <LineChart width={340} height={110} data={donnees} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
          <XAxis dataKey="t" type="number" scale="time" domain={[debut, fin]} tickCount={4} tickFormatter={(v: number) => court(dateLocale(new Date(v)))} tick={{ fill: 'var(--c-texte-2)', fontSize: 9 }} />
          <YAxis tick={{ fill: 'var(--c-texte-2)', fontSize: 9 }} allowDecimals={false} domain={[(m: number) => Math.min(-1, Math.floor(m)), (m: number) => Math.max(1, Math.ceil(m))]} />
          <ReferenceLine y={0} stroke="var(--c-texte-2)" strokeDasharray="3 3" />
          {annotations.filter((a) => dans(a.date)).map((a) => <ReferenceLine key={a.id} x={versDate(a.date).getTime()} stroke="var(--c-texte-2)" strokeOpacity={0.6} />)}
          {appareils.filter(dans).map((x) => <ReferenceLine key={x} x={versDate(x).getTime()} stroke="var(--c-texte-2)" strokeDasharray="2 4" />)}
          <Line type="monotone" dataKey="valeur" stroke={`var(--c-${domaine})`} strokeWidth={1.8} dot={false} isAnimationActive={false} />
        </LineChart>
      )}
      <span className="sr-only">{donnees.length} points, de {points[0] ? court(points[0].date) : ''} au {points.at(-1) ? court(points.at(-1)!.date) : ''} ; {ecartJours(points[0]?.date ?? dateLocale(), points.at(-1)?.date ?? dateLocale())} jours.</span>
    </div>
  );
}

function Barres({ titre, valeurs }: { titre: string; valeurs: { libelle: string; n: number }[] }) {
  const max = Math.max(1, ...valeurs.map((v) => v.n));
  return (
    <div className="text-[0.8125rem]">
      <h3 className="font-semibold">{titre}</h3>
      <ul className="mt-1 space-y-1">
        {valeurs.map((v) => (
          <li key={v.libelle} className="grid grid-cols-[7.5rem_1fr_1.5rem] items-center gap-2">
            <span className="text-texte-2">{v.libelle}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-accent" style={{ width: `${(v.n / max) * 100}%` }} /></span>
            <span className="text-right tabular-nums">{v.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
