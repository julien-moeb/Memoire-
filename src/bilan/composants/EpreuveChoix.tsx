/**
 * Moteur générique des épreuves à choix rapide (décision lexicale, go/no-go, Stroop, alternance, parité).
 * Le stimulus est écrit directement dans le DOM au sein d'un rappel requestAnimationFrame :
 * l'instant d'apparition est celui de l'image, et le temps de réponse vient de event.timeStamp.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { attendre } from './commun';
import type { EssaiChoix } from '../scoring';
import { haptique } from '../../ui/haptique';

export interface OptionReponse {
  valeur: string;
  libelle: string;
  touche: string;
}

export interface EssaiAExecuter<S> {
  condition: string;
  stimulus: S;
  attendue: string | null;
}

export interface ResultatEssaiChoix extends EssaiChoix {
  stimulus: string;
  reponse: string | null;
}

interface Props<S> {
  essais: readonly EssaiAExecuter<S>[];
  entrainement?: readonly EssaiAExecuter<S>[];
  options: readonly OptionReponse[];
  afficher: (el: HTMLElement, s: S) => void;
  decrire: (s: S) => string;
  /** Normalise la réponse donnée en valeur comparable à `attendue` (par ex. alternance). */
  correspond?: (reponse: string, essai: EssaiAExecuter<S>) => boolean;
  fixationMs?: number;
  delaiMaxMs?: number;
  intervalleMs?: number;
  /** Si défini, le stimulus disparaît après ce nombre de millisecondes (la réponse reste possible). */
  dureeStimulusMs?: number;
  /** Appelé à chaque essai pour décorer l'écran (ex. éclair périphérique). */
  avantEssai?: (index: number) => void;
  /** Élément de décor affiché derrière le stimulus (repères de position, par exemple). */
  decor?: ReactNode;
  onTerminer: (r: ResultatEssaiChoix[]) => void;
}

export function EpreuveChoix<S>({
  essais, entrainement = [], options, afficher, decrire, correspond, fixationMs = 500, delaiMaxMs = 2500,
  intervalleMs = 400, dureeStimulusMs, avantEssai, decor, onTerminer,
}: Props<S>) {
  const zone = useRef<HTMLDivElement>(null);
  const resoudre = useRef<((r: { valeur: string; t: number } | null) => void) | null>(null);
  const [phase, setPhase] = useState<'entrainement' | 'transition' | 'test'>(entrainement.length ? 'entrainement' : 'test');
  const [retour, setRetour] = useState<string | null>(null);
  const termine = useRef(onTerminer);
  termine.current = onTerminer;

  const repondre = (valeur: string, t: number) => {
    if (resoudre.current) {
      haptique(5);
      resoudre.current({ valeur, t });
      resoudre.current = null;
    }
  };

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      const o = options.find((x) => x.touche === e.key.toLowerCase() || (x.touche === 'espace' && e.key === ' '));
      if (o) {
        e.preventDefault();
        repondre(o.valeur, e.timeStamp);
      }
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [options]);

  useEffect(() => {
    let annule = false;
    const executer = async (liste: readonly EssaiAExecuter<S>[], avecRetour: boolean) => {
      const res: ResultatEssaiChoix[] = [];
      for (let i = 0; i < liste.length && !annule; i++) {
        const essai = liste[i]!;
        const el = zone.current!;
        el.textContent = '+';
        el.removeAttribute('style');
        if (!avecRetour) avantEssai?.(i);
        await attendre(fixationMs);
        const reponse = new Promise<{ valeur: string; t: number } | null>((r) => {
          resoudre.current = r;
        });
        const apparition = await new Promise<number>((r) =>
          requestAnimationFrame((t) => {
            el.textContent = '';
            afficher(el, essai.stimulus);
            r(t);
          }),
        );
        if (dureeStimulusMs) {
          setTimeout(() => requestAnimationFrame(() => {
            el.style.visibility = 'hidden';
          }), dureeStimulusMs);
        }
        const delai = setTimeout(() => {
          resoudre.current?.(null);
          resoudre.current = null;
        }, delaiMaxMs);
        const r = await reponse;
        clearTimeout(delai);
        el.textContent = '';
        el.removeAttribute('style');
        const correcte = r === null ? essai.attendue === null : correspond ? correspond(r.valeur, essai) : r.valeur === essai.attendue;
        res.push({
          condition: essai.condition,
          correcte,
          tempsMs: r ? r.t - apparition : null,
          stimulus: decrire(essai.stimulus),
          reponse: r?.valeur ?? null,
        });
        if (avecRetour) {
          setRetour(correcte ? 'Juste' : r === null ? 'Trop lent' : 'Erreur');
          await attendre(700);
          setRetour(null);
        }
        await attendre(intervalleMs);
      }
      return res;
    };
    (async () => {
      if (phase === 'entrainement') {
        await executer(entrainement, true);
        if (!annule) setPhase('transition');
      } else if (phase === 'test') {
        const r = await executer(essais, false);
        if (!annule) termine.current(r);
      }
    })();
    return () => {
      annule = true;
      resoudre.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-between gap-6 px-4 py-6">
      <p className="text-[0.875rem] text-texte-2">{phase === 'entrainement' ? 'Essais d’entraînement' : phase === 'test' ? '' : ''}</p>
      {phase === 'transition' ? (
        <div className="space-y-4 text-center">
          <p className="text-[1.125rem]">L'entraînement est terminé. L'épreuve commence.</p>
          <button type="button" onClick={() => setPhase('test')} className="min-h-[50px] rounded-[14px] bg-accent px-6 font-semibold text-sur-accent">Continuer</button>
        </div>
      ) : (
        <div className="relative flex h-48 w-full items-center justify-center">
          {decor}
          <div ref={zone} className="text-[2.5rem] font-semibold tracking-wide select-none" aria-live="off" />
          {retour && <p role="status" className="absolute bottom-0 text-[1rem] text-texte-2">{retour}</p>}
        </div>
      )}
      <div className="grid w-full gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.valeur}
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              repondre(o.valeur, e.timeStamp);
            }}
            className="min-h-[72px] rounded-[16px] bg-surface text-[1.0625rem] font-semibold shadow-sm active:bg-surface-2"
          >
            {o.libelle}
            <span className="mt-1 block text-[0.75rem] font-normal text-texte-2">touche {o.touche === 'espace' ? 'Espace' : o.touche.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
