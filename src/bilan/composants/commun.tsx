import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bouton } from '../../ui/composants';

export const attendre = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Écran de consigne avant chaque épreuve. */
export function Consigne({ titre, numero, total, children, onCommencer }: {
  titre: string; numero: number; total: number; children: ReactNode; onCommencer: () => void;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-6 px-4">
      <p className="text-[0.8125rem] font-semibold tracking-wide text-texte-2 uppercase">Épreuve {numero} sur {total}</p>
      <h2 ref={ref} tabIndex={-1} className="text-[1.75rem] font-bold outline-none">{titre}</h2>
      <div className="text-[1.0625rem] leading-relaxed">{children}</div>
      <Bouton onClick={onCommencer} className="w-full">Commencer</Bouton>
    </div>
  );
}

/** Compte à rebours visible (secondes restantes), sans dramatisation. */
export function useCompteARebours(dureeMs: number, actif: boolean, onFin: () => void) {
  const [reste, setReste] = useState(dureeMs);
  const fin = useRef(onFin);
  fin.current = onFin;
  useEffect(() => {
    if (!actif) return;
    const debut = performance.now();
    let id = 0;
    const tick = () => {
      const r = Math.max(0, dureeMs - (performance.now() - debut));
      setReste(r);
      if (r <= 0) fin.current();
      else id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [actif, dureeMs]);
  return reste;
}

export function BarreTemps({ resteMs, totalMs }: { resteMs: number; totalMs: number }) {
  const s = Math.ceil(resteMs / 1000);
  return (
    <div className="flex items-center gap-3" aria-live="off">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${(resteMs / totalMs) * 100}%` }} />
      </div>
      <span className="w-10 text-right text-[0.9375rem] text-texte-2 tabular-nums" aria-label={`${s} secondes restantes`}>{s} s</span>
    </div>
  );
}

/** Saisie de mots un par un, validés par Entrée ; renvoie les mots horodatés depuis le début. */
export function SaisieMots({ onMot, desactive, placeholder = 'Écrivez un mot puis Entrée' }: {
  onMot: (mot: string, t: number) => void; desactive?: boolean; placeholder?: string;
}) {
  const [valeur, setValeur] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const valider = () => {
    const m = valeur.trim();
    if (m) onMot(m, performance.now());
    setValeur('');
    ref.current?.focus();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        valider();
      }}
      className="flex gap-2"
    >
      <input
        ref={ref}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        disabled={desactive}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="next"
        placeholder={placeholder}
        aria-label="Mot"
        className="min-h-[50px] flex-1 rounded-[14px] bg-surface px-4 text-[1.125rem] shadow-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <button type="submit" disabled={desactive} className="min-h-[50px] rounded-[14px] bg-accent-doux px-4 font-semibold text-accent">Ajouter</button>
    </form>
  );
}

export function ListeSaisie({ mots }: { mots: readonly string[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Mots saisis">
      {mots.map((m, i) => <li key={`${m}-${i}`} className="rounded-full bg-surface px-3 py-1 text-[0.9375rem]">{m}</li>)}
    </ul>
  );
}
