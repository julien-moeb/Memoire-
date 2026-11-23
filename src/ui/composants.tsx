import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { haptique } from './haptique';

export const RESSORT = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;

/** En-tête « large title » ; reçoit le focus à chaque changement d'écran pour les lecteurs d'écran. */
export function GrandTitre({ children, sousTitre }: { children: ReactNode; sousTitre?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <header className="px-1 pt-6 pb-4">
      {sousTitre && <p className="text-[0.8125rem] font-semibold tracking-wide text-texte-2 uppercase">{sousTitre}</p>}
      <h1 ref={ref} tabIndex={-1} className="text-[2.125rem] leading-tight font-bold tracking-tight outline-none">
        {children}
      </h1>
    </header>
  );
}

export function Page({ children }: { children: ReactNode }) {
  const reduit = useReducedMotion();
  return (
    <motion.main
      id="contenu"
      initial={reduit ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduit ? { duration: 0.15 } : RESSORT}
      className="mx-auto w-full max-w-2xl px-4 pb-32"
    >
      {children}
    </motion.main>
  );
}

export function Carte({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`ombre-carte rounded-[18px] bg-surface p-5 ${className}`}>{children}</section>;
}

export function TitreSection({ children }: { children: ReactNode }) {
  return <h2 className="mt-8 mb-2 px-4 text-[0.8125rem] font-normal tracking-wide text-texte-2 uppercase">{children}</h2>;
}

/** Liste groupée à la manière des Réglages iOS. */
export function ListeGroupee({ titre, pied, children }: { titre?: string; pied?: ReactNode; children: ReactNode }) {
  return (
    <div>
      {titre && <TitreSection>{titre}</TitreSection>}
      <ul className="ombre-carte divide-y divide-separateur overflow-hidden rounded-[14px] bg-surface" role="list">
        {children}
      </ul>
      {pied && <p className="mt-2 px-4 text-[0.8125rem] leading-snug text-texte-2">{pied}</p>}
    </div>
  );
}

interface PropsLigne {
  libelle: ReactNode;
  valeur?: ReactNode;
  detail?: ReactNode;
  href?: string;
  onClick?: () => void;
  desactive?: boolean;
  droite?: ReactNode;
}

export function Ligne({ libelle, valeur, detail, href, onClick, desactive, droite }: PropsLigne) {
  const contenu = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem]">{libelle}</span>
        {detail && <span className="mt-0.5 block text-[0.875rem] leading-snug text-texte-2">{detail}</span>}
      </span>
      {valeur !== undefined && <span className="ml-3 shrink-0 text-[1.0625rem] text-texte-2">{valeur}</span>}
      {droite}
      {(href || onClick) && !desactive && (
        <svg aria-hidden="true" width="8" height="14" viewBox="0 0 8 14" className="ml-2 shrink-0 text-texte-2 opacity-60">
          <path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
  const classes = 'flex min-h-[44px] w-full items-center px-4 py-3 text-left';
  if (href && !desactive) {
    return (
      <li>
        <a href={href} className={`${classes} active:bg-surface-2`}>
          {contenu}
        </a>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} disabled={desactive} className={`${classes} active:bg-surface-2 disabled:opacity-50`}>
          {contenu}
        </button>
      </li>
    );
  }
  return <li className={`${classes} ${desactive ? 'opacity-50' : ''}`}>{contenu}</li>;
}

interface PropsSegment<T extends string | number> {
  libelle: string;
  options: readonly { valeur: T; texte: ReactNode; aria?: string }[];
  valeur: T;
  onChange: (v: T) => void;
}

/** Contrôle segmenté accessible (groupe de boutons radio, flèches du clavier). */
export function ControleSegmente<T extends string | number>({ libelle, options, valeur, onChange }: PropsSegment<T>) {
  const id = useId();
  const reduit = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const trouve = options.findIndex((o) => o.valeur === valeur);
  const index = Math.max(0, trouve);

  const clavier = (e: KeyboardEvent) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const suivant = (index + delta + options.length) % options.length;
    onChange(options[suivant]!.valeur);
    refs.current[suivant]?.focus();
    haptique(5);
  };

  return (
    <div role="radiogroup" aria-label={libelle} onKeyDown={clavier} className="relative flex rounded-[10px] bg-surface-2 p-0.5">
      {options.map((o, i) => {
        const actif = i === trouve;
        return (
          <button
            key={String(o.valeur)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={actif}
            aria-label={o.aria}
            tabIndex={i === index ? 0 : -1}
            onClick={() => {
              onChange(o.valeur);
              haptique(5);
            }}
            className="relative z-10 min-h-[36px] flex-1 rounded-[8px] px-2 text-[0.9375rem] font-medium"
          >
            {actif && (
              <motion.span
                layoutId={`segment-${id}`}
                transition={reduit ? { duration: 0 } : RESSORT}
                className="ombre-carte absolute inset-0 -z-10 rounded-[8px] bg-surface"
              />
            )}
            {o.texte}
          </button>
        );
      })}
    </div>
  );
}

interface PropsBouton {
  children: ReactNode;
  onClick?: () => void;
  variante?: 'plein' | 'teinte' | 'simple';
  desactive?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export function Bouton({ children, onClick, variante = 'plein', desactive, type = 'button', className = '' }: PropsBouton) {
  const styles = {
    plein: 'bg-accent text-sur-accent',
    teinte: 'bg-accent-doux text-accent',
    simple: 'text-accent',
  }[variante];
  return (
    <motion.button
      type={type}
      whileTap={desactive ? undefined : { scale: 0.97 }}
      transition={RESSORT}
      onClick={() => {
        haptique();
        onClick?.();
      }}
      disabled={desactive}
      className={`min-h-[50px] rounded-[14px] px-5 text-[1.0625rem] font-semibold disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Bandeau({ children, ton = 'info' }: { children: ReactNode; ton?: 'info' | 'attention' }) {
  return (
    <div
      role={ton === 'attention' ? 'alert' : 'status'}
      className={`rounded-[14px] px-4 py-3 text-[0.9375rem] leading-snug ${ton === 'attention' ? 'bg-[#ff9f0a]/15' : 'bg-accent-doux'}`}
    >
      {children}
    </div>
  );
}
