import { useMemo, useRef, useState } from 'react';
import { Bouton } from '../../ui/composants';
import { BarreTemps, ListeSaisie, SaisieMots, useCompteARebours } from './commun';
import { classerMotsFluence, scoreFluence, type ItemFluenceBilan } from '../scoring';
import type { SaisieHorodatee } from '../../moteur/saisie-libre';

const DUREE = 60_000;

export interface ResultatFluence {
  saisies: SaisieHorodatee[];
  acceptes: string[];
  score: ReturnType<typeof scoreFluence>;
}

/** Fluence chronométrée de 60 s, puis arbitrage des mots absents des listes de référence. */
export function Fluence({ consigne, item, onTerminer, dureeMs = DUREE }: {
  consigne: string; item: ItemFluenceBilan; onTerminer: (r: ResultatFluence) => void; dureeMs?: number;
}) {
  const [phase, setPhase] = useState<'production' | 'arbitrage'>('production');
  const [saisies, setSaisies] = useState<SaisieHorodatee[]>([]);
  const debut = useRef(performance.now());
  const reste = useCompteARebours(dureeMs, phase === 'production', () => setPhase('arbitrage'));
  const classes = useMemo(() => classerMotsFluence(saisies, item), [saisies, item]);
  const aArbitrer = classes.filter((c) => c.statut === 'a-arbitrer');
  const [acceptes, setAcceptes] = useState<Set<string>>(new Set());

  if (phase === 'production') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8">
        <BarreTemps resteMs={reste} totalMs={dureeMs} />
        <h2 className="text-[1.5rem] font-semibold">{consigne}</h2>
        <SaisieMots onMot={(mot, t) => setSaisies((s) => [...s, { mot, tMs: t - debut.current }])} />
        <ListeSaisie mots={saisies.map((s) => s.mot)} />
      </div>
    );
  }

  const terminer = () => onTerminer({ saisies, acceptes: [...acceptes], score: scoreFluence(classes, acceptes, dureeMs) });
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8">
      <h2 className="text-[1.375rem] font-semibold">Temps écoulé</h2>
      {aArbitrer.length === 0 ? (
        <p className="text-texte-2">Tous vos mots ont été reconnus automatiquement.</p>
      ) : (
        <>
          <p className="text-texte-2">
            Ces mots ne figurent pas dans la liste de référence, qui n'est jamais exhaustive. Cochez ceux qui respectent
            réellement la consigne.
          </p>
          <ul className="ombre-carte divide-y divide-separateur rounded-[14px] bg-surface">
            {aArbitrer.map((c) => (
              <li key={c.mot} className="flex min-h-[48px] items-center justify-between px-4">
                <label htmlFor={`arb-${c.mot}`} className="text-[1.0625rem]">{c.mot}</label>
                <input
                  id={`arb-${c.mot}`}
                  type="checkbox"
                  className="h-6 w-6 accent-[var(--c-accent)]"
                  checked={acceptes.has(c.mot)}
                  onChange={(e) => {
                    const n = new Set(acceptes);
                    if (e.target.checked) n.add(c.mot);
                    else n.delete(c.mot);
                    setAcceptes(n);
                  }}
                />
              </li>
            ))}
          </ul>
        </>
      )}
      <Bouton onClick={terminer}>Continuer</Bouton>
    </div>
  );
}
