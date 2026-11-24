import { Carte, GrandTitre, Page, TitreSection } from '../ui/composants';
import { FAMILLES, LIMITES, NIVEAUX, REFERENCES } from './methode-donnees';

export function Methode() {
  return (
    <Page>
      <GrandTitre>Méthode</GrandTitre>

      <Carte className="border-l-4 border-[#ff9f0a]">
        <h2 className="text-[1.0625rem] font-semibold">Avertissement</h2>
        <p className="mt-2 text-[1rem] leading-relaxed">
          Lexique n'est ni un dispositif médical, ni un outil diagnostique. Ses scores ne sont pas des normes cliniques :
          ils ne se comparent qu'à votre propre ligne de base. L'application ne remplace pas une évaluation
          neuropsychologique, dont les tests standardisés restent la référence.
        </p>
      </Carte>

      <TitreSection>Principes</TitreSection>
      <Carte>
        <ul className="list-disc space-y-2 pl-5 text-[1rem] leading-relaxed">
          <li>Privilégier les approches étayées (vitesse de traitement, approche comportementale) plutôt que les jeux d'entraînement généralistes, dont le transfert à la vie quotidienne est faible.</li>
          <li>Entraîner en priorité le vocabulaire réellement utile, car les gains d'accès lexical sont largement spécifiques aux mots travaillés.</li>
          <li>Maintenir environ 80 % de réussite, ne jamais dramatiser un résultat : l'anxiété de performance nuit à l'attention et à l'encodage.</li>
          <li>Une séance par jour au plus, un jour de repos par semaine.</li>
        </ul>
      </Carte>

      <TitreSection>La séance du jour</TitreSection>
      <Carte>
        <ol className="list-decimal space-y-2 pl-5 text-[1rem] leading-relaxed">
          <li>Contexte (sommeil, fatigue), saisi avant l'effort.</li>
          <li>Rappel de la liste apprise la veille, s'il y a lieu.</li>
          <li>Échauffement : 90 secondes de fluence.</li>
          <li>Deux exercices de votre domaine prioritaire, 4 minutes chacun, en rotation.</li>
          <li>Double décision, 4 minutes, au moins quatre séances sur six ; sinon, un exercice de maintien.</li>
          <li>Révisions espacées : 15 cartes au plus, dont vos mots manqués.</li>
          <li>Clôture : un épisode de manque du mot depuis la veille, si vous le souhaitez.</li>
        </ol>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-texte-2">
          Chaque exercice reprend votre niveau de la veille, un cran en dessous pour commencer, puis s'ajuste selon la règle
          3 réussites / 1 échec, qui maintient environ 80 % de réussite.
        </p>
      </Carte>

      <TitreSection>Lire vos courbes</TitreSection>
      <Carte className="space-y-3 text-[1rem] leading-relaxed">
        <p>
          Chaque courbe montre l'écart à votre propre ligne de base (le bilan et vos sept premières séances de l'exercice),
          en écarts-types, lissé sur sept jours. Zéro correspond à vos débuts ; au-dessus, vous faites mieux. Aucune norme
          de population n'est utilisée.
        </p>
        <p>
          Les liens entre vos résultats et le sommeil, la fatigue ou l'heure ne sont affichés qu'après 30 séances, sous
          forme de médianes, et décrivent des associations, non des causes.
        </p>
        <p>
          Une fois par semaine, un volet comportemental remplace les exercices ciblés : relecture du journal, une
          stratégie à essayer, respiration lente. Chaque mot cherché noté dans le journal devient une carte de révision.
        </p>
      </Carte>

      <TitreSection>Niveaux de preuve</TitreSection>
      <Carte>
        <dl className="space-y-3">
          {NIVEAUX.map((n) => (
            <div key={n.niveau} className="flex gap-3">
              <dt className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-doux font-bold text-accent">{n.niveau}</dt>
              <dd className="text-[1rem] leading-relaxed">{n.texte}</dd>
            </div>
          ))}
        </dl>
      </Carte>

      <TitreSection>Familles d'exercices</TitreSection>
      <div className="ombre-carte overflow-x-auto rounded-[14px] bg-surface">
        <table className="w-full text-left text-[0.9375rem]">
          <caption className="sr-only">Niveau de preuve et rôle de chaque famille d'exercices</caption>
          <thead className="text-texte-2">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Famille</th>
              <th scope="col" className="px-2 py-3 font-medium">Preuve</th>
              <th scope="col" className="px-4 py-3 font-medium">Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-separateur">
            {FAMILLES.map((f) => (
              <tr key={f.famille}>
                <th scope="row" className="px-4 py-3 font-normal">{f.famille}</th>
                <td className="px-2 py-3 text-center font-semibold">{f.niveau}</td>
                <td className="px-4 py-3 text-texte-2">{f.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TitreSection>Limites</TitreSection>
      <Carte>
        <ul className="list-disc space-y-2 pl-5 text-[1rem] leading-relaxed">
          {LIMITES.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </Carte>

      <TitreSection>Références</TitreSection>
      <Carte>
        <ol className="space-y-4">
          {REFERENCES.map((r) => (
            <li key={r.texte} className="text-[0.9375rem] leading-relaxed">
              <p>{r.url ? <a className="text-accent underline-offset-2 hover:underline" href={r.url} target="_blank" rel="noopener noreferrer">{r.texte}</a> : r.texte}</p>
              <p className="mt-1 text-texte-2">{r.apport}</p>
            </li>
          ))}
        </ol>
      </Carte>
    </Page>
  );
}
