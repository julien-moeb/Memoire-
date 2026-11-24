import { useEffect, useRef, useState } from 'react';
import { attendre } from './commun';
import { Rappel } from './Rappel';
import { corrigerRappel } from '../scoring';

/** Apprentissage d'une liste : présentation mot par mot (2 s), puis rappel libre, trois fois. */
export function ListeMots({ liste, essais = 3, onTerminer }: {
  liste: readonly string[]; essais?: number; onTerminer: (rappels: string[][], scores: number[]) => void;
}) {
  const [essai, setEssai] = useState(0);
  const [phase, setPhase] = useState<'presentation' | 'rappel'>('presentation');
  const [mot, setMot] = useState<string | null>(null);
  const rappels = useRef<string[][]>([]);

  useEffect(() => {
    if (phase !== 'presentation') return;
    let annule = false;
    (async () => {
      await attendre(800);
      for (const m of liste) {
        if (annule) return;
        setMot(m);
        await attendre(1600);
        setMot(null);
        await attendre(400);
      }
      if (!annule) setPhase('rappel');
    })();
    return () => {
      annule = true;
    };
  }, [phase, essai, liste]);

  if (phase === 'presentation') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <p className="text-[0.875rem] text-texte-2">Présentation {essai + 1} sur {essais}</p>
        <p className="h-16 text-[2.5rem] font-semibold" aria-live="polite">{mot ?? ''}</p>
      </div>
    );
  }
  return (
    <Rappel
      key={essai}
      titre={`Rappel ${essai + 1} sur ${essais}`}
      onTerminer={(mots) => {
        rappels.current.push(mots);
        if (essai + 1 < essais) {
          setEssai(essai + 1);
          setPhase('presentation');
        } else {
          onTerminer(rappels.current, rappels.current.map((r) => corrigerRappel(r, liste).corrects.length));
        }
      }}
    />
  );
}
