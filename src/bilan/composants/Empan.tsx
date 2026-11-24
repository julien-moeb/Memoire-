import { useEffect, useRef, useState } from 'react';
import { Bouton } from '../../ui/composants';
import { attendre } from './commun';
import { arretEmpan, empanMaximal, inverse, scoreMiseAJour, type EssaiEmpan } from '../scoring';

/** Présente une série de symboles (un par seconde), puis demande une réponse tapée. */
export function useSerie(serie: readonly string[] | null, onFin: () => void) {
  const [courant, setCourant] = useState<string | null>(null);
  const fin = useRef(onFin);
  fin.current = onFin;
  useEffect(() => {
    if (!serie) return;
    let annule = false;
    (async () => {
      await attendre(800);
      for (const s of serie) {
        if (annule) return;
        setCourant(s);
        await attendre(750);
        setCourant(null);
        await attendre(250);
      }
      if (!annule) fin.current();
    })();
    return () => {
      annule = true;
    };
  }, [serie]);
  return courant;
}

export function Reponse({ invite, numerique, onValider }: { invite: string; numerique?: boolean; onValider: (v: string) => void }) {
  const [v, setV] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onValider(v); }} className="flex w-full flex-col gap-3">
      <label htmlFor="rep" className="text-center text-[1.0625rem]">{invite}</label>
      <input
        id="rep"
        ref={ref}
        value={v}
        onChange={(e) => setV(e.target.value)}
        inputMode={numerique ? 'numeric' : 'text'}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="min-h-[56px] rounded-[14px] bg-surface px-4 text-center text-[1.5rem] tracking-[0.3em] shadow-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <Bouton type="submit">Valider</Bouton>
    </form>
  );
}

export interface ResultatEmpan {
  essais: (EssaiEmpan & { serie: string; reponse: string })[];
  empan: number;
}

export function EmpanInverse({ generer, onTerminer }: { generer: (longueur: number) => string[]; onTerminer: (r: ResultatEmpan) => void }) {
  const [longueur, setLongueur] = useState(2);
  const [essaiDansLongueur, setEssaiDansLongueur] = useState(0);
  const [serie, setSerie] = useState<string[] | null>(null);
  const [saisie, setSaisie] = useState(false);
  const res = useRef<ResultatEmpan['essais']>([]);

  useEffect(() => {
    setSaisie(false);
    setSerie(generer(longueur));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [longueur, essaiDansLongueur]);

  const courant = useSerie(serie, () => setSaisie(true));

  const valider = (v: string) => {
    const correct = v.replace(/\D/g, '') === inverse(serie!);
    res.current.push({ longueur, correct, serie: serie!.join(''), reponse: v });
    const fini = arretEmpan(res.current, longueur) || (essaiDansLongueur === 1 && longueur === 8);
    if (fini) onTerminer({ essais: res.current, empan: empanMaximal(res.current) });
    else if (essaiDansLongueur === 0) setEssaiDansLongueur(1);
    else {
      setEssaiDansLongueur(0);
      setLongueur(longueur + 1);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-4">
      <p className="text-[0.875rem] text-texte-2">Série de {longueur} chiffres</p>
      {saisie ? <Reponse invite="Écrivez les chiffres dans l'ordre inverse" numerique onValider={valider} /> : <p className="h-20 text-[3.5rem] font-semibold tabular-nums">{courant ?? ''}</p>}
    </div>
  );
}

export interface ResultatMiseAJour {
  essais: { flux: string; reponse: string; score: number }[];
  total: number;
}

export function MiseAJour({ flux, onTerminer }: { flux: readonly string[][]; onTerminer: (r: ResultatMiseAJour) => void }) {
  const [i, setI] = useState(0);
  const [saisie, setSaisie] = useState(false);
  const res = useRef<ResultatMiseAJour['essais']>([]);
  const courant = useSerie(saisie ? null : flux[i]!, () => setSaisie(true));
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-4">
      <p className="text-[0.875rem] text-texte-2">Série {i + 1} sur {flux.length}</p>
      {saisie ? (
        <Reponse
          key={i}
          invite="Écrivez les quatre dernières lettres, dans l'ordre"
          onValider={(v) => {
            res.current.push({ flux: flux[i]!.join(''), reponse: v, score: scoreMiseAJour(flux[i]!, v, 4) });
            if (i + 1 < flux.length) {
              setI(i + 1);
              setSaisie(false);
            } else onTerminer({ essais: res.current, total: res.current.reduce((s, e) => s + e.score, 0) });
          }}
        />
      ) : (
        <p className="h-20 text-[3.5rem] font-semibold">{courant ?? ''}</p>
      )}
    </div>
  );
}
