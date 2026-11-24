/** Suivi : courbes par domaine, détail par exercice, bilans successifs, contexte et annotations. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bandeau, Bouton, Carte, GrandTitre, ListeGroupee, Ligne, Page, TitreSection } from '../ui/composants';
import { useApp } from '../etat/contexte';
import { lien } from '../etat/routeur';
import { dateLocale, formatDate, versDate, type DateLocale } from '../moteur/dates';
import { SEANCES_MIN_CORRELATION } from '../moteur/statistiques';
import { DOMAINES, NOMS_DOMAINES, type Annotation, type Domaine, type Resultat, type Seance } from '../stockage/types';
import { EXERCICES } from '../seance/catalogue';
import { lireBilans, scoresDuBilan, type BilanComplet } from '../bilan/historique';
import * as S from '../suivi/calculs';

interface Donnees {
  resultats: Resultat[];
  seances: Seance[];
  bilans: BilanComplet[];
  annotations: Annotation[];
}

const court = (d: DateLocale) => versDate(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
const ts = (d: DateLocale) => versDate(d).getTime();
const signe = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}`;

const MESSAGES_TENDANCE = {
  hausse: 'Tendance favorable sur les deux dernières semaines.',
  stable: 'Stable sur les deux dernières semaines.',
  baisse:
    "Légère baisse sur les deux dernières semaines. Les résultats varient naturellement d'un jour à l'autre avec la fatigue, le sommeil ou les circonstances ; c'est la tendance sur plusieurs semaines qui compte.",
} as const;

export function Progression() {
  const { db, reglages } = useApp();
  const [d, setD] = useState<Donnees | null>(null);
  const [domaine, setDomaine] = useState<Domaine | null>(null);

  const charger = useCallback(async () => {
    if (!db) return;
    const [resultats, seances, bilans, annotations] = await Promise.all([
      db.getAll('resultats'), db.getAll('seances'), lireBilans(db), db.getAll('annotations'),
    ]);
    setD({ resultats, seances, bilans, annotations: annotations.sort((a, b) => (a.date < b.date ? -1 : 1)) });
  }, [db]);
  useEffect(() => void charger(), [charger]);

  const calcul = useMemo(() => {
    if (!d) return null;
    const complets = d.bilans.filter((b) => b.complet);
    const series = S.seriesExercices(d.resultats, complets);
    const scores = S.scoresDomaines(series);
    const terminees = d.seances.filter((s) => s.fin);
    const perf = S.performanceParSeance(d.resultats, series);
    return {
      series, scores, terminees, complets,
      contexte: S.contexteParTranche(terminees, perf),
      appareils: S.changementsAppareil(d.seances),
    };
  }, [d]);

  if (!db) return <Page><GrandTitre>Progression</GrandTitre><Bandeau ton="attention">Le stockage local est indisponible.</Bandeau></Page>;
  if (!d || !calcul) return <p className="p-8 text-center text-texte-2" role="status">Chargement…</p>;

  const avecDonnees = DOMAINES.filter((x) => calcul.series.some((s) => s.domaine === x));
  const actif = domaine && avecDonnees.includes(domaine) ? domaine : (avecDonnees[0] ?? null);
  const serie = S.serieEnCours(calcul.terminees.map((s) => s.date), dateLocale(), reglages.jourRepos);

  return (
    <Page>
      <GrandTitre sousTitre={`${calcul.terminees.length} séance${calcul.terminees.length > 1 ? 's' : ''} terminée${calcul.terminees.length > 1 ? 's' : ''}`}>Progression</GrandTitre>

      {calcul.terminees.length === 0 ? (
        <Carte>
          <p className="leading-relaxed">
            Vos courbes apparaîtront après vos premières séances. Pour chaque exercice, la ligne de base personnelle se
            constitue sur le bilan et les sept premières séances ; les écarts sont ensuite calculés par rapport à elle.
          </p>
        </Carte>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Domaine affiché">
            {avecDonnees.map((x) => (
              <button
                key={x}
                type="button"
                aria-pressed={x === actif}
                onClick={() => setDomaine(x)}
                className={`min-h-[40px] rounded-full px-4 text-[0.9375rem] font-medium shadow-sm ${x === actif ? 'text-white' : 'bg-surface'}`}
                style={x === actif ? { background: `var(--c-${x})` } : undefined}
              >
                {NOMS_DOMAINES[x]}
              </button>
            ))}
          </div>
          {actif && <VueDomaine domaine={actif} series={calcul.series} points={calcul.scores[actif]} annotations={d.annotations} appareils={calcul.appareils} />}
        </>
      )}

      <Bilans bilans={calcul.complets} />
      <Contexte n={calcul.terminees.length} contexte={calcul.contexte} />
      <Annotations annotations={d.annotations} onChange={charger} />
      <ListeGroupee titre="Partager">
        <Ligne libelle="Synthèse imprimable" detail="Deux pages A4, à enregistrer en PDF" href={lien('/synthese')} />
        <Ligne libelle="Archive CSV et sauvegarde" href={lien('/export')} />
      </ListeGroupee>
      {serie.jours > 0 && (
        <p className="mt-6 px-4 text-[0.8125rem] text-texte-2">Série en cours : {serie.jours} jour{serie.jours > 1 ? 's' : ''} d'entraînement.</p>
      )}
    </Page>
  );
}

function VueDomaine({ domaine, series, points, annotations, appareils }: {
  domaine: Domaine; series: S.SerieExercice[]; points: { date: string; valeur: number }[]; annotations: Annotation[]; appareils: DateLocale[];
}) {
  const duDomaine = series.filter((s) => s.domaine === domaine);
  const t = S.tendance(points);
  const donnees = points.map((p) => ({ t: ts(p.date), valeur: p.valeur }));
  const debut = donnees[0]?.t ?? 0;
  const fin = donnees.at(-1)?.t ?? 0;
  const dansPeriode = (d: DateLocale) => ts(d) >= debut && ts(d) <= fin;
  const couleur = `var(--c-${domaine})`;
  const derniere = points.at(-1);

  return (
    <>
      <Carte className="mt-4">
        <h2 className="text-[1.0625rem] font-semibold">{NOMS_DOMAINES[domaine]}</h2>
        <p className="mt-1 text-[0.875rem] leading-snug text-texte-2">
          Écart à votre ligne de base, en écarts-types, lissé sur sept jours. Au-dessus de zéro : mieux que vos débuts.
        </p>
        {donnees.length < 2 ? (
          <p className="mt-4 leading-relaxed">
            La ligne de base de ce domaine est en cours de constitution : la courbe apparaîtra après trois séances au
            moins de l'un de ses exercices.
          </p>
        ) : (
          <>
            <div
              className="mt-3 h-[220px]"
              role="img"
              aria-label={`Courbe ${NOMS_DOMAINES[domaine]} : ${points.length} points, dernière valeur ${derniere ? signe(derniere.valeur) : ''} le ${derniere ? formatDate(derniere.date) : ''}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={donnees} margin={{ top: 16, right: 12, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--c-separateur)" vertical={false} />
                  <XAxis dataKey="t" type="number" domain={[debut, fin]} scale="time" tickFormatter={(v: number) => court(dateLocale(new Date(v)))} tick={{ fill: 'var(--c-texte-2)', fontSize: 12 }} tickCount={4} />
                  <YAxis tick={{ fill: 'var(--c-texte-2)', fontSize: 12 }} allowDecimals={false} domain={[(m: number) => Math.min(-1, Math.floor(m)), (m: number) => Math.max(1, Math.ceil(m))]} />
                  <ReferenceLine y={0} stroke="var(--c-texte-2)" strokeDasharray="3 3" />
                  {annotations.filter((a) => dansPeriode(a.date)).map((a) => (
                    <ReferenceLine key={a.id} x={ts(a.date)} stroke="var(--c-texte-2)" strokeOpacity={0.6} label={{ value: '•', position: 'top', fill: 'var(--c-texte-2)' }} />
                  ))}
                  {appareils.filter(dansPeriode).map((x) => (
                    <ReferenceLine key={`app-${x}`} x={ts(x)} stroke="var(--c-texte-2)" strokeDasharray="2 4" />
                  ))}
                  <Tooltip
                    formatter={(v) => [signe(Number(v)), 'Écart']}
                    labelFormatter={(v) => formatDate(dateLocale(new Date(Number(v))))}
                    contentStyle={{ background: 'var(--c-surface)', border: 'none', borderRadius: 12, color: 'var(--c-texte)' }}
                  />
                  <Line type="monotone" dataKey="valeur" stroke={couleur} strokeWidth={2.5} dot={{ r: 2.5, fill: couleur }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {(annotations.some((a) => dansPeriode(a.date)) || appareils.some(dansPeriode)) && (
              <p className="mt-1 text-[0.8125rem] text-texte-2">Traits verticaux pleins : vos annotations · pointillés : changement d'appareil.</p>
            )}
          </>
        )}
        {t && <p className="mt-3 text-[0.9375rem] leading-relaxed">{MESSAGES_TENDANCE[t]}</p>}
      </Carte>

      <ListeGroupee titre="Par exercice" pied="Valeur lissée sur sept jours, dans l'unité de l'exercice. Les volumes de travail et les autoévaluations sont affichés mais n'entrent pas dans le score du domaine.">
        {duDomaine.map((s) => {
          const v = s.lissees.at(-1);
          const e = s.ecarts.at(-1);
          const unite = s.unite === 'niveau' ? `niveau sur ${EXERCICES[s.exercice].niveauMax}` : s.unite;
          return (
            <Ligne
              key={s.cle}
              libelle={EXERCICES[s.exercice].titre}
              detail={
                s.referenceEnCours
                  ? `Ligne de base en cours : ${s.brutes.length} séance${s.brutes.length > 1 ? 's' : ''} sur ${S.SEANCES_REFERENCE}`
                  : e && s.dansScore ? `Écart à la ligne de base : ${signe(e.valeur)}` : 'Hors score de domaine'
              }
              valeur={v ? `${v.valeur.toLocaleString('fr-FR', { maximumFractionDigits: s.unite === 'ms' || s.unite === '%' ? 0 : 1 })} ${unite}` : undefined}
            />
          );
        })}
      </ListeGroupee>
    </>
  );
}

function Bilans({ bilans }: { bilans: BilanComplet[] }) {
  if (bilans.length === 0) return null;
  const derniers = bilans.slice(-4);
  return (
    <>
      <TitreSection>Bilans successifs</TitreSection>
      <Carte>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[0.9375rem]">
            <caption className="sr-only">Score indicatif par domaine à chaque bilan, en pourcentage du maximum</caption>
            <thead>
              <tr className="text-texte-2">
                <th scope="col" className="py-1 pr-2 font-normal">Domaine</th>
                {derniers.map((b) => <th key={b.groupe} scope="col" className="py-1 pl-2 text-right font-normal whitespace-nowrap">{court(b.date)}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-separateur">
              {DOMAINES.map((x) => (
                <tr key={x}>
                  <th scope="row" className="py-2 pr-2 font-normal">{NOMS_DOMAINES[x]}</th>
                  {derniers.map((b) => <td key={b.groupe} className="py-2 pl-2 text-right tabular-nums">{scoresDuBilan(b)[x] ?? '·'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[0.8125rem] leading-snug text-texte-2">
          Pourcentage du maximum de chaque épreuve, moyenné par domaine : un repère interne, ni une norme ni un diagnostic.
          Les formes parallèles du bilan changent à chaque fois pour limiter l'effet d'apprentissage.
        </p>
        <a href={lien('/bilan')} className="mt-3 flex min-h-[44px] items-center font-semibold text-accent">Voir le profil détaillé</a>
      </Carte>
    </>
  );
}

function Contexte({ n, contexte }: { n: number; contexte: ReturnType<typeof S.contexteParTranche> }) {
  return (
    <>
      <TitreSection>Contexte de vos séances</TitreSection>
      <Carte>
        {n < SEANCES_MIN_CORRELATION ? (
          <p className="leading-relaxed text-texte-2">
            Disponible après {SEANCES_MIN_CORRELATION} séances ({n} à ce jour). Sur un petit nombre de séances, un lien
            apparent entre le sommeil, la fatigue ou l'heure et vos résultats est presque toujours dû au hasard.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-[0.9375rem] leading-relaxed">
              Médiane de l'écart moyen de chaque séance à vos lignes de base, par tranche. Ces valeurs indiquent ce qui est
              associé à vos meilleurs jours ; elles ne montrent pas une cause.
            </p>
            {([['Moment de la séance', contexte.moment], ['Fatigue ressentie', contexte.fatigue], ['Sommeil la nuit précédente', contexte.sommeil]] as const).map(([titre, tranches]) => (
              <div key={titre}>
                <h3 className="text-[0.9375rem] font-semibold">{titre}</h3>
                <ul className="mt-1 space-y-0.5 text-[0.9375rem]">
                  {tranches.map((t) => (
                    <li key={t.libelle} className="flex justify-between gap-3">
                      <span>{t.libelle} <span className="text-texte-2">({t.seances} séance{t.seances > 1 ? 's' : ''})</span></span>
                      <span className="tabular-nums">{t.mediane === null ? 'trop peu de séances' : signe(t.mediane)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Carte>
    </>
  );
}

function Annotations({ annotations, onChange }: { annotations: Annotation[]; onChange: () => Promise<void> }) {
  const { db } = useApp();
  const [date, setDate] = useState(dateLocale());
  const [texte, setTexte] = useState('');
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  if (!db) return null;
  return (
    <>
      <TitreSection>Annotations</TitreSection>
      <Carte className="space-y-3">
        <p className="text-[0.875rem] leading-snug text-texte-2">
          Un événement daté (changement de rythme de travail, période chargée, congés) apparaît sur les
          courbes, sans aucune interprétation de la part de l'application.
        </p>
        <form
          className="grid gap-2 sm:grid-cols-[10rem_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!texte.trim()) return;
            await db.put('annotations', { id: `annotation-${Date.now().toString(36)}`, date, texte: texte.trim() });
            setTexte('');
            await onChange();
          }}
        >
          <input type="date" aria-label="Date de l'annotation" value={date} max={dateLocale()} onChange={(e) => setDate(e.target.value || dateLocale())} className="min-h-[46px] rounded-[12px] bg-surface-2 px-3" />
          <input aria-label="Texte de l'annotation" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Par exemple : reprise à temps plein" className="min-h-[46px] min-w-0 rounded-[12px] bg-surface-2 px-3" />
          <Bouton type="submit" variante="teinte" desactive={!texte.trim()}>Ajouter</Bouton>
        </form>
        {annotations.length > 0 && (
          <ul className="divide-y divide-separateur">
            {[...annotations].reverse().map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><span className="text-texte-2">{formatDate(a.date)} · </span>{a.texte}</span>
                {aSupprimer === a.id ? (
                  <span className="flex gap-3 text-[0.9375rem]">
                    <button type="button" className="min-h-[44px] font-semibold text-accent" onClick={async () => { await db.delete('annotations', a.id); setASupprimer(null); await onChange(); }}>Supprimer</button>
                    <button type="button" className="min-h-[44px] text-texte-2" onClick={() => setASupprimer(null)}>Garder</button>
                  </span>
                ) : (
                  <button type="button" className="min-h-[44px] text-[0.9375rem] text-texte-2" onClick={() => setASupprimer(a.id)}>Supprimer</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </>
  );
}
