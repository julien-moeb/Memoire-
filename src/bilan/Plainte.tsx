import { useState } from 'react';
import { Bouton, ControleSegmente } from '../ui/composants';
import type { Domaine } from '../stockage/types';

/** Questionnaire de plainte rédigé pour l'application (les questionnaires validés sont protégés). */
export const QUESTIONS: { domaine: Domaine; texte: string }[] = [
  { domaine: 'acces-lexical', texte: 'Trouver le mot juste, à l’oral ou à l’écrit' },
  { domaine: 'vitesse', texte: 'Penser ou réagir aussi vite qu’auparavant' },
  { domaine: 'memoire-travail', texte: 'Garder une information en tête pendant que vous l’utilisez' },
  { domaine: 'memoire-episodique', texte: 'Vous souvenir de ce que vous avez lu, entendu ou décidé' },
  { domaine: 'attention', texte: 'Rester concentré ou mener deux choses de front' },
  { domaine: 'flexibilite', texte: 'Passer d’une tâche à une autre, ou résister à une distraction' },
];

const ECHELLE = [
  { valeur: 1, texte: '1', aria: 'Jamais' },
  { valeur: 2, texte: '2', aria: 'Rarement' },
  { valeur: 3, texte: '3', aria: 'Parfois' },
  { valeur: 4, texte: '4', aria: 'Souvent' },
  { valeur: 5, texte: '5', aria: 'Très souvent' },
];

export function Plainte({ onTerminer }: { onTerminer: (r: Record<Domaine, number>) => void }) {
  const [r, setR] = useState<Partial<Record<Domaine, number>>>({});
  const complet = QUESTIONS.every((q) => r[q.domaine]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <div>
        <h2 className="text-[1.5rem] font-semibold">Votre ressenti</h2>
        <p className="mt-2 text-texte-2">
          Au cours des deux dernières semaines, à quelle fréquence avez-vous éprouvé des difficultés pour… (1 = jamais,
          5 = très souvent)
        </p>
      </div>
      {QUESTIONS.map((q) => (
        <fieldset key={q.domaine} className="space-y-2">
          <legend className="mb-2 text-[1.0625rem]">{q.texte}</legend>
          <ControleSegmente<number> libelle={q.texte} options={ECHELLE} valeur={r[q.domaine] ?? 0} onChange={(v) => setR({ ...r, [q.domaine]: v })} />
        </fieldset>
      ))}
      <Bouton desactive={!complet} onClick={() => onTerminer(r as Record<Domaine, number>)}>Voir le profil</Bouton>
    </div>
  );
}
