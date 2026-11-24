/**
 * Exercice 24 : régulation de l'activation par la respiration lente, autour de six cycles par
 * minute (inspiration de 4 s, expiration de 6 s). Le rythme reste indicatif : il doit demeurer
 * confortable. En mouvement réduit, seul le texte guide la respiration.
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BarreTemps } from '../bilan/composants/commun';
import { Bouton } from '../ui/composants';

export const INSPIRATION_MS = 4000;
export const EXPIRATION_MS = 6000;
const CYCLE_MS = INSPIRATION_MS + EXPIRATION_MS;

/** Phase et progression (0 à 1) à un instant donné du cycle. */
export function phaseRespiration(ecouleMs: number): { phase: 'inspiration' | 'expiration'; progression: number; resteS: number } {
  const t = ((ecouleMs % CYCLE_MS) + CYCLE_MS) % CYCLE_MS;
  if (t < INSPIRATION_MS) return { phase: 'inspiration', progression: t / INSPIRATION_MS, resteS: Math.ceil((INSPIRATION_MS - t) / 1000) };
  const e = t - INSPIRATION_MS;
  return { phase: 'expiration', progression: e / EXPIRATION_MS, resteS: Math.ceil((EXPIRATION_MS - e) / 1000) };
}

export function Respiration({ dureeMs, onTerminer, libelleFin = 'Terminer' }: { dureeMs: number; onTerminer: () => void; libelleFin?: string }) {
  const reduit = useReducedMotion();
  const [actif, setActif] = useState(false);
  const [ecoule, setEcoule] = useState(0);
  const debut = useRef(0);
  const cercle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!actif) return;
    debut.current = performance.now();
    let id = 0;
    const tick = () => {
      const t = performance.now() - debut.current;
      // Le cercle est animé directement dans le DOM, sans rendu React à chaque image.
      const { phase, progression } = phaseRespiration(t);
      const echelle = phase === 'inspiration' ? 0.6 + 0.4 * progression : 1 - 0.4 * progression;
      if (cercle.current && !reduit) cercle.current.style.transform = `scale(${echelle.toFixed(3)})`;
      setEcoule((avant) => (Math.floor(t / 250) !== Math.floor(avant / 250) ? t : avant));
      if (t < dureeMs) id = requestAnimationFrame(tick);
      else setEcoule(dureeMs);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [actif, dureeMs, reduit]);

  const fini = ecoule >= dureeMs;
  const { phase, resteS } = phaseRespiration(ecoule);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-6">
      <div className="w-full"><BarreTemps resteMs={Math.max(0, dureeMs - ecoule)} totalMs={dureeMs} /></div>
      <div className="flex h-[240px] w-[240px] items-center justify-center" aria-hidden="true">
        <div
          ref={cercle}
          className="flex h-[240px] w-[240px] items-center justify-center rounded-full bg-accent-doux"
          style={{ transform: reduit ? 'scale(0.85)' : 'scale(0.6)', willChange: 'transform' }}
        >
          <div className="h-3 w-3 rounded-full bg-accent" />
        </div>
      </div>
      <p className="min-h-[2.5rem] text-center text-[1.75rem] font-semibold" aria-live="polite">
        {!actif ? 'Prêt' : fini ? 'Terminé' : phase === 'inspiration' ? 'Inspirez' : 'Expirez'}
      </p>
      <p className="-mt-4 min-h-[1.5rem] text-center text-texte-2 tabular-nums" aria-hidden="true">
        {actif && !fini ? `${resteS} s` : ' '}
      </p>
      {!actif ? (
        <>
          <p className="text-center text-[1.0625rem] leading-relaxed">
            Inspirez par le nez pendant que le cercle grandit, puis expirez lentement pendant qu'il diminue, épaules
            relâchées. Si le rythme vous gêne, respirez simplement un peu plus lentement que d'habitude.
          </p>
          <Bouton className="w-full" onClick={() => setActif(true)}>Commencer</Bouton>
          <Bouton className="w-full" variante="simple" onClick={onTerminer}>Passer</Bouton>
        </>
      ) : (
        <Bouton className="w-full" variante={fini ? 'plein' : 'teinte'} onClick={onTerminer}>{fini ? libelleFin : 'Arrêter'}</Bouton>
      )}
    </div>
  );
}
