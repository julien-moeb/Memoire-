import { useRef, useState } from 'react';
import { Bouton } from '../../ui/composants';
import { EpreuveChoix, type ResultatEssaiChoix } from './EpreuveChoix';
import type { EssaiGenere } from '../generateurs';

const OPTIONS = [
  { valeur: 'pair', libelle: 'Pair', touche: 'f' },
  { valeur: 'impair', libelle: 'Impair', touche: 'j' },
];

export interface ResultatDoubleTache {
  simple: ResultatEssaiChoix[];
  double: ResultatEssaiChoix[];
  presentes: number;
  rapportes: number;
}

/** Tâche simple (parité), puis la même tâche avec comptage d'éclairs périphériques. */
export function DoubleTache({ simple, double, eclairs, onTerminer }: {
  simple: readonly EssaiGenere<number>[]; double: readonly EssaiGenere<number>[]; eclairs: readonly number[];
  onTerminer: (r: ResultatDoubleTache) => void;
}) {
  const [phase, setPhase] = useState<'simple' | 'consigne-double' | 'double' | 'comptage'>('simple');
  const [compte, setCompte] = useState('');
  const resSimple = useRef<ResultatEssaiChoix[]>([]);
  const resDouble = useRef<ResultatEssaiChoix[]>([]);
  const eclair = useRef<HTMLDivElement>(null);
  const cotes = ['top-0 left-0 right-0 h-3', 'bottom-0 left-0 right-0 h-3', 'top-0 bottom-0 left-0 w-3', 'top-0 bottom-0 right-0 w-3'];

  const flash = (i: number) => {
    if (!eclairs.includes(i)) return;
    setTimeout(() => {
      const el = eclair.current;
      if (!el) return;
      el.className = `fixed z-50 bg-accent ${cotes[i % 4]}`;
      requestAnimationFrame(() => {
        el.style.visibility = 'visible';
        setTimeout(() => requestAnimationFrame(() => (el.style.visibility = 'hidden')), 150);
      });
    }, 900);
  };

  return (
    <>
      <div ref={eclair} style={{ visibility: 'hidden' }} aria-hidden="true" />
      {phase === 'simple' && (
        <EpreuveChoix
          essais={simple}
          entrainement={simple.slice(0, 4)}
          options={OPTIONS}
          afficher={(el, s) => (el.textContent = String(s))}
          decrire={String}
          onTerminer={(r) => {
            resSimple.current = r;
            setPhase('consigne-double');
          }}
        />
      )}
      {phase === 'consigne-double' && (
        <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-5 px-4">
          <h2 className="text-[1.5rem] font-semibold">Seconde phase</h2>
          <p className="text-[1.0625rem] leading-relaxed">
            Continuez à juger la parité. En même temps, comptez les éclairs bleus qui apparaîtront brièvement sur un bord de
            l'écran. Vous indiquerez leur nombre à la fin.
          </p>
          <Bouton onClick={() => setPhase('double')}>Commencer</Bouton>
        </div>
      )}
      {phase === 'double' && (
        <EpreuveChoix
          essais={double}
          options={OPTIONS}
          afficher={(el, s) => (el.textContent = String(s))}
          decrire={String}
          avantEssai={flash}
          fixationMs={600}
          delaiMaxMs={2000}
          intervalleMs={500}
          onTerminer={(r) => {
            resDouble.current = r;
            setPhase('comptage');
          }}
        />
      )}
      {phase === 'comptage' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onTerminer({ simple: resSimple.current, double: resDouble.current, presentes: eclairs.length, rapportes: Number(compte) || 0 });
          }}
          className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-4"
        >
          <label htmlFor="compte" className="text-[1.25rem] font-semibold">Combien d'éclairs avez-vous vus ?</label>
          <input id="compte" autoFocus inputMode="numeric" value={compte} onChange={(e) => setCompte(e.target.value)} className="min-h-[56px] rounded-[14px] bg-surface px-4 text-center text-[1.5rem] shadow-sm" />
          <Bouton type="submit">Valider</Bouton>
        </form>
      )}
    </>
  );
}
