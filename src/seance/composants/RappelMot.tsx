/**
 * Récupération d'un mot à partir d'une définition, avec indiçage progressif (trait sémantique,
 * puis début du mot). Utilisé par « Le mot juste » et par les révisions espacées.
 * En mode oral, le mot est dit à voix haute, puis la réponse est affichée et autoévaluée.
 */
import { useEffect, useRef, useState } from 'react';
import { Bouton } from '../../ui/composants';
import { correspond } from '../../moteur/saisie-libre';

export interface Fiche {
  id: string;
  question: string;
  reponse: string;
  variantes: readonly string[];
  indices?: { trait: string; syllabe: string };
  explication?: string;
}

export interface IssueRappelMot {
  reponse: string;
  correcte: boolean;
  /** Une réponse a-t-elle été proposée ? (faux pour « le mot ne vient pas ») */
  reponseDonnee: boolean;
  indice: 'aucun' | 'semantique' | 'syllabe';
  tempsMs: number;
}

/** Indice syllabique par défaut pour une fiche qui n'en a pas : les deux premières lettres. */
const syllabeParDefaut = (mot: string) => mot.slice(0, Math.min(2, Math.max(1, mot.length - 1)));

export function RappelMot({ fiche, modeOral, ignorerAccents, entete, onIssue }: {
  fiche: Fiche; modeOral: boolean; ignorerAccents: boolean; entete?: string; onIssue: (r: IssueRappelMot) => void;
}) {
  const [indice, setIndice] = useState<IssueRappelMot['indice']>('aucun');
  const [valeur, setValeur] = useState('');
  const [issue, setIssue] = useState<IssueRappelMot | null>(null);
  const [revele, setRevele] = useState(false);
  const debut = useRef(performance.now());
  const champ = useRef<HTMLInputElement>(null);
  const suite = useRef<HTMLButtonElement>(null);
  const trait = fiche.indices?.trait;
  const syllabe = fiche.indices?.syllabe ?? syllabeParDefaut(fiche.reponse);

  useEffect(() => {
    debut.current = performance.now();
    setIndice('aucun');
    setValeur('');
    setIssue(null);
    setRevele(false);
    champ.current?.focus();
  }, [fiche.id]);

  useEffect(() => {
    if (issue) suite.current?.focus();
  }, [issue]);

  const conclure = (reponse: string, correcte: boolean, reponseDonnee: boolean) =>
    setIssue({ reponse, correcte, reponseDonnee, indice, tempsMs: Math.round(performance.now() - debut.current) });

  const indiceSuivant = () => setIndice(indice === 'aucun' && trait ? 'semantique' : 'syllabe');

  return (
    <div className="flex flex-col gap-5">
      {entete && <p className="text-[0.875rem] text-texte-2">{entete}</p>}
      <p className="text-[1.25rem] leading-relaxed font-medium">{fiche.question}</p>
      {indice !== 'aucun' && trait && <p className="rounded-[12px] bg-accent-doux px-4 py-3">{trait}</p>}
      {indice === 'syllabe' && <p className="rounded-[12px] bg-accent-doux px-4 py-3">Le mot commence par « {syllabe} ».</p>}

      {issue ? (
        <div className="space-y-3 rounded-[16px] bg-surface p-4 shadow-sm" role="status">
          <p className="text-[1.125rem]">
            {issue.correcte ? 'Juste : ' : 'Le mot attendu : '}
            <strong>{fiche.reponse}</strong>
          </p>
          {fiche.explication && <p className="text-[0.9375rem] leading-relaxed text-texte-2">{fiche.explication}</p>}
          {!issue.correcte && <p className="text-[0.9375rem] text-texte-2">Ce mot vous sera reproposé lors des prochaines révisions.</p>}
          <button ref={suite} type="button" onClick={() => onIssue(issue)} className="min-h-[48px] w-full rounded-[12px] bg-accent font-semibold text-sur-accent">
            Continuer
          </button>
        </div>
      ) : modeOral ? (
        revele ? (
          <div className="space-y-3">
            <p className="text-center text-[1.5rem] font-semibold">{fiche.reponse}</p>
            <div className="grid grid-cols-2 gap-3">
              <Bouton variante="teinte" onClick={() => conclure('', false, true)}>Pas trouvé</Bouton>
              <Bouton onClick={() => conclure(fiche.reponse, true, true)}>Trouvé</Bouton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-texte-2">Dites le mot à voix haute, puis affichez la réponse.</p>
            <div className="grid grid-cols-2 gap-3">
              <Bouton variante="teinte" desactive={indice === 'syllabe'} onClick={indiceSuivant}>
                {indice === 'aucun' ? 'Un indice' : 'Second indice'}
              </Bouton>
              <Bouton onClick={() => setRevele(true)}>Afficher</Bouton>
            </div>
          </div>
        )
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = valeur.trim();
            if (v) conclure(v, correspond(v, [fiche.reponse, ...fiche.variantes], { ignorerAccents }), true);
          }}
          className="flex flex-col gap-3"
        >
          <input
            ref={champ}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="done"
            aria-label="Votre réponse"
            className="min-h-[50px] rounded-[14px] bg-surface px-4 text-[1.125rem] shadow-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="grid grid-cols-2 gap-3">
            <Bouton variante="teinte" desactive={indice === 'syllabe'} onClick={indiceSuivant}>
              {indice === 'aucun' ? 'Un indice' : 'Second indice'}
            </Bouton>
            <Bouton type="submit">Valider</Bouton>
          </div>
          <button type="button" onClick={() => conclure('', false, false)} className="min-h-[44px] text-accent">
            Le mot ne vient pas
          </button>
        </form>
      )}
    </div>
  );
}
