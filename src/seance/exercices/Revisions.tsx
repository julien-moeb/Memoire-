/**
 * Exercice 11 : révisions espacées (SM-2). Cartes arrivées à échéance (15 au plus), complétées
 * le cas échéant par quelques cartes nouvelles du lexique professionnel.
 */
import { useMemo, useRef, useState } from 'react';
import { qualiteDepuisIssue, reviser, nouvelleCarte, type Qualite } from '../../moteur/sm2';
import type { DateLocale } from '../../moteur/dates';
import type { Carte } from '../../stockage/types';
import { Bouton } from '../../ui/composants';
import { RappelMot, type Fiche } from '../composants/RappelMot';
import * as C from '../contenu';
import { resultatVide, type EssaiExercice, type ResultatExercice } from '../types';

/** Nombre de cartes nouvelles introduites par séance, pour ne pas saturer les révisions futures. */
export const NOUVELLES_PAR_SEANCE = 4;

/** Index de toutes les fiches révisables : définitions et cartes du lexique professionnel. */
export function indexFiches(): Map<string, Fiche> {
  const m = new Map<string, Fiche>();
  for (const d of C.definitions()) {
    m.set(d.id, { id: d.id, question: d.definition, reponse: d.reponse, variantes: d.variantes, indices: d.indices });
  }
  for (const c of C.cartesLexique()) {
    m.set(c.id, { id: c.id, question: c.question, reponse: c.reponse, variantes: c.variantes, explication: c.explication });
  }
  return m;
}

/** Cartes du lexique professionnel encore jamais introduites, dans l'ordre des fichiers. */
export function nouvellesCartes(existantes: ReadonlySet<string>, n: number, aujourdhui: DateLocale): Carte[] {
  return C.cartesLexique()
    .filter((c) => !existantes.has(c.id))
    .slice(0, n)
    .map((c) => ({ id: c.id, paquet: c.paquet, itemId: c.id, etat: nouvelleCarte(aujourdhui) }));
}

export function Revisions({ cartes, aujourdhui, ignorerAccents, modeOral, onTerminer }: {
  cartes: readonly Carte[];
  aujourdhui: DateLocale;
  ignorerAccents: boolean;
  modeOral: boolean;
  onTerminer: (r: ResultatExercice, cartesRevisees: Carte[]) => void;
}) {
  const fiches = useMemo(() => indexFiches(), []);
  const file = useMemo(() => cartes.filter((c) => fiches.has(c.itemId)), [cartes, fiches]);
  const [k, setK] = useState(0);
  const revisees = useRef<Carte[]>([]);
  const essais = useRef<EssaiExercice[]>([]);

  const terminer = () => {
    const n = essais.current.length;
    const justes = essais.current.filter((e) => e.correcte && e.indice === 'aucun').length;
    onTerminer(
      { ...resultatVide('repetition-espacee'), essais: essais.current, metrique: 'rappel-sans-indice', unite: '%', valeur: n ? Math.round((justes / n) * 100) : NaN },
      revisees.current,
    );
  };

  if (file.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-10 text-center">
        <p className="text-[1.0625rem]">Aucune révision n'est due aujourd'hui.</p>
        <Bouton onClick={terminer}>Continuer</Bouton>
      </div>
    );
  }
  const carte = file[k]!;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-6">
      <RappelMot
        fiche={fiches.get(carte.itemId)!}
        modeOral={modeOral}
        ignorerAccents={ignorerAccents}
        entete={`Révision ${k + 1} sur ${file.length}${carte.etat.repetitions === 0 && carte.etat.derniereRevision === null ? ' · nouvelle carte' : ''}`}
        onIssue={(r) => {
          const q: Qualite = qualiteDepuisIssue({ correcte: r.correcte, indice: r.indice, tempsMs: r.tempsMs, reponseDonnee: r.reponseDonnee });
          revisees.current.push({ ...carte, etat: reviser(carte.etat, q, aujourdhui) });
          essais.current.push({
            itemId: carte.itemId, niveau: null, stimulus: carte.paquet, reponse: r.reponse, correcte: r.correcte,
            tempsReponseMs: r.tempsMs, ecartAffichageMs: null, indice: r.indice,
          });
          if (k + 1 < file.length) setK(k + 1);
          else terminer();
        }}
      />
    </div>
  );
}
