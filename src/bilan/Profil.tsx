import { formatDate } from '../moteur/dates';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend } from 'recharts';
import { DOMAINES, NOMS_DOMAINES, type Domaine } from '../stockage/types';
import { EPREUVES, cleMetrique, rangInterne } from './protocole';
import type { BilanComplet } from './historique';
import { scoresDuBilan } from './historique';
import { QUESTIONS } from './Plainte';

const COURTS: Record<Domaine, string> = {
  'acces-lexical': 'Accès lexical',
  vitesse: 'Vitesse',
  'memoire-travail': 'Mém. travail',
  'memoire-episodique': 'Mém. épisodique',
  attention: 'Attention',
  flexibilite: 'Flexibilité',
};

const nombre = (v: number, unite: string) =>
  Number.isFinite(v) ? `${v.toLocaleString('fr-FR', { maximumFractionDigits: unite === 'ms' || unite === '%' ? 0 : 1 })} ${unite}` : 'non mesuré';

export function Profil({ bilan, precedent }: { bilan: BilanComplet; precedent?: BilanComplet }) {
  const scores = scoresDuBilan(bilan);
  const avant = precedent ? scoresDuBilan(precedent) : null;
  const donnees = DOMAINES.map((d) => ({ domaine: COURTS[d], actuel: scores[d] ?? 0, precedent: avant?.[d] ?? 0 }));
  const rang = rangInterne(scores);
  const date = formatDate(bilan.date);

  return (
    <div className="space-y-4">
      <section className="ombre-carte rounded-[18px] bg-surface p-4">
        <h2 className="px-1 text-[1.0625rem] font-semibold">Profil du {date} (forme {bilan.forme})</h2>
        <p className="mt-1 px-1 text-[0.875rem] leading-snug text-texte-2">
          Pourcentage du maximum de chaque épreuve, moyenné par domaine. Repère indicatif interne : ni une norme, ni un
          diagnostic.
        </p>
        <div className="h-[300px]" role="img" aria-label={`Profil indicatif : ${DOMAINES.map((d) => `${NOMS_DOMAINES[d]} ${scores[d] ?? 'non mesuré'}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={donnees} outerRadius="62%" margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
              <PolarGrid stroke="var(--c-separateur)" />
              <PolarAngleAxis dataKey="domaine" tick={{ fill: 'var(--c-texte-2)', fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              {avant && <Radar name="Bilan précédent" dataKey="precedent" stroke="var(--c-texte-2)" fill="var(--c-texte-2)" fillOpacity={0.08} strokeDasharray="4 4" isAnimationActive={false} />}
              <Radar name="Ce bilan" dataKey="actuel" stroke="var(--c-accent)" fill="var(--c-accent)" fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
              {avant && <Legend wrapperStyle={{ fontSize: 13 }} />}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="ombre-carte rounded-[18px] bg-surface p-5">
        <h2 className="text-[1.0625rem] font-semibold">Rang interne indicatif</h2>
        <p className="mt-1 text-[0.875rem] text-texte-2">Du domaine le moins élevé au plus élevé, chez vous seulement.</p>
        <ol className="mt-3 space-y-1 text-[1rem]">
          {rang.map((d, i) => (
            <li key={d}>
              {i + 1}. {NOMS_DOMAINES[d]} <span className="text-texte-2">({scores[d]})</span>
              {bilan.metriques[`plainte.${d}`] !== undefined && <span className="text-texte-2"> · gêne ressentie {bilan.metriques[`plainte.${d}`]}/5</span>}
            </li>
          ))}
        </ol>
      </section>

      <details className="ombre-carte rounded-[18px] bg-surface p-5">
        <summary className="min-h-[44px] cursor-pointer text-[1.0625rem] font-semibold">Résultats bruts par épreuve</summary>
        <table className="mt-2 w-full text-left text-[0.9375rem]">
          <caption className="sr-only">Métrique principale de chaque épreuve</caption>
          <tbody className="divide-y divide-separateur">
            {EPREUVES.map((e) => (
              <tr key={e.id}>
                <th scope="row" className="py-2 pr-2 font-normal">{e.titre}</th>
                <td className="py-2 text-right text-texte-2 tabular-nums">{nombre(bilan.metriques[cleMetrique(e)] ?? NaN, e.unite)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-[0.8125rem] text-texte-2">
          Questionnaire : {QUESTIONS.length} questions de gêne ressentie, de 1 (jamais) à 5 (très souvent). Toutes les valeurs
          détaillées figureront dans l'export.
        </p>
      </details>
    </div>
  );
}
