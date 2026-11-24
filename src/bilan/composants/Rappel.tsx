import { useState } from 'react';
import { Bouton } from '../../ui/composants';
import { ListeSaisie, SaisieMots } from './commun';

/** Rappel libre : saisie de mots, sans limite de temps stricte, terminé par la personne. */
export function Rappel({ titre, onTerminer }: { titre: string; onTerminer: (mots: string[]) => void }) {
  const [mots, setMots] = useState<string[]>([]);
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8">
      <h2 className="text-[1.375rem] font-semibold">{titre}</h2>
      <p className="text-texte-2">Écrivez tous les mots dont vous vous souvenez, dans l'ordre de votre choix.</p>
      <SaisieMots onMot={(m) => setMots((t) => [...t, m])} />
      <ListeSaisie mots={mots} />
      <Bouton onClick={() => onTerminer(mots)} variante="teinte">J'ai terminé</Bouton>
    </div>
  );
}
