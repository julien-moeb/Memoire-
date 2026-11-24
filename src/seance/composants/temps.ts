import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Temps restant d'un exercice à son rythme. L'exercice ne s'interrompt pas au milieu d'un item :
 * `ecoule()` est consulté entre deux items pour décider d'en proposer un autre.
 */
export function useTempsRestant(dureeMs: number) {
  const debut = useRef(performance.now());
  const [reste, setReste] = useState(dureeMs);
  useEffect(() => {
    const id = setInterval(() => setReste(Math.max(0, dureeMs - (performance.now() - debut.current))), 500);
    return () => clearInterval(id);
  }, [dureeMs]);
  const ecoule = useCallback(() => performance.now() - debut.current >= dureeMs, [dureeMs]);
  return { reste, ecoule };
}
