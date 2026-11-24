import { useEffect, useRef, useState } from 'react';
import { Bouton } from '../../ui/composants';
import { correspond } from '../../moteur/saisie-libre';
import type { FormeBilan } from '../../contenu/schemas';

type Definition = FormeBilan['definitions'][number];

export interface ResultatDenomination {
  itemId: string;
  reponse: string;
  correcte: boolean;
  indice: 'aucun' | 'semantique' | 'syllabe';
  premiereFrappeMs: number | null;
  tempsTotalMs: number;
}

/** Dénomination sur définition, avec indice sémantique puis syllabique à la demande. */
export function Denomination({ items, ignorerAccents, onTerminer }: {
  items: readonly Definition[]; ignorerAccents: boolean; onTerminer: (r: ResultatDenomination[]) => void;
}) {
  const [i, setI] = useState(0);
  const [indice, setIndice] = useState<'aucun' | 'semantique' | 'syllabe'>('aucun');
  const [valeur, setValeur] = useState('');
  const debut = useRef(performance.now());
  const premiere = useRef<number | null>(null);
  const resultats = useRef<ResultatDenomination[]>([]);
  const champ = useRef<HTMLInputElement>(null);
  const item = items[i]!;

  useEffect(() => {
    debut.current = performance.now();
    premiere.current = null;
    setIndice('aucun');
    setValeur('');
    champ.current?.focus();
  }, [i]);

  const suivant = (reponse: string) => {
    resultats.current.push({
      itemId: item.id,
      reponse,
      correcte: correspond(reponse, [item.reponse, ...item.variantes], { ignorerAccents }),
      indice,
      premiereFrappeMs: premiere.current === null ? null : premiere.current - debut.current,
      tempsTotalMs: performance.now() - debut.current,
    });
    if (i + 1 < items.length) setI(i + 1);
    else onTerminer(resultats.current);
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8">
      <p className="text-[0.875rem] text-texte-2">Définition {i + 1} sur {items.length}</p>
      <p className="text-[1.25rem] leading-relaxed font-medium">{item.definition}</p>
      {indice !== 'aucun' && <p className="rounded-[12px] bg-accent-doux px-4 py-3">{item.indices.trait}</p>}
      {indice === 'syllabe' && <p className="rounded-[12px] bg-accent-doux px-4 py-3">Le mot commence par « {item.indices.syllabe} ».</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valeur.trim()) suivant(valeur.trim());
        }}
        className="flex flex-col gap-3"
      >
        <input
          ref={champ}
          value={valeur}
          onChange={(e) => {
            if (premiere.current === null) premiere.current = performance.now();
            setValeur(e.target.value);
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-label="Votre réponse"
          className="min-h-[50px] rounded-[14px] bg-surface px-4 text-[1.125rem] shadow-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="grid grid-cols-2 gap-3">
          <Bouton
            variante="teinte"
            desactive={indice === 'syllabe'}
            onClick={() => setIndice(indice === 'aucun' ? 'semantique' : 'syllabe')}
          >
            {indice === 'aucun' ? 'Un indice' : 'Second indice'}
          </Bouton>
          <Bouton type="submit">Valider</Bouton>
        </div>
        <button type="button" onClick={() => suivant('')} className="min-h-[44px] text-accent">Le mot ne vient pas, passer</button>
      </form>
    </div>
  );
}
