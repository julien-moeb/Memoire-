/** Exercices lexicaux à son rythme : le mot juste, traits sémantiques, changement de registre, échauffement. */
import { useMemo, useRef, useState } from 'react';
import { enregistrerReponse, type EtatEscalier } from '../../moteur/escalier';
import { choisir } from '../../moteur/alea';
import { Bouton } from '../../ui/composants';
import { BarreTemps } from '../../bilan/composants/commun';
import { Fluence } from '../../bilan/composants/Fluence';
import { RappelMot } from '../composants/RappelMot';
import { ordonnerItems, prochainItem } from '../selection';
import * as C from '../contenu';
import { resultatVide, type EssaiExercice, type PropsExercice, type ResultatExercice } from '../types';
import { useTempsRestant } from '../composants/temps';
import type { ItemRegistre, ItemTraits } from '../../contenu/schemas';

/** Exercice 6 : de la définition au mot, avec indices. Escalier sur la difficulté des définitions. */
export function MotJuste({ dureeMs, escalier, ignorerAccents, modeOral, vus, onTerminer }: PropsExercice) {
  const file = useMemo(() => ordonnerItems(C.definitions(), vus, escalier!.niveau), [vus, escalier]);
  const etat = useRef<EtatEscalier>(escalier!);
  const essais = useRef<EssaiExercice[]>([]);
  const cartes = useRef<ResultatExercice['cartes']>([]);
  const [item, setItem] = useState(() => prochainItem(file, escalier!.niveau));
  const { reste, ecoule } = useTempsRestant(dureeMs);

  const terminer = () => {
    const n = essais.current.length;
    const sansIndice = essais.current.filter((e) => e.correcte && e.indice === 'aucun').length;
    onTerminer({
      ...resultatVide('definition-mot'),
      essais: essais.current,
      metrique: 'reussite-sans-indice', unite: '%', valeur: n ? Math.round((sansIndice / n) * 100) : NaN,
      niveauDepart: escalier!.niveau, niveauArrivee: etat.current.niveau, escalier: etat.current, cartes: cartes.current,
    });
  };

  if (!item) {
    return <FinContenu onContinuer={terminer} />;
  }
  return (
    <Cadre reste={reste} total={dureeMs}>
      <RappelMot
        fiche={{ id: item.id, question: item.definition, reponse: item.reponse, variantes: item.variantes, indices: item.indices }}
        modeOral={modeOral}
        ignorerAccents={ignorerAccents}
        onIssue={(r) => {
          const reussite = r.correcte && r.indice === 'aucun';
          essais.current.push({
            itemId: item.id, niveau: etat.current.niveau, stimulus: item.definition, reponse: r.reponse,
            correcte: r.correcte, tempsReponseMs: r.tempsMs, ecartAffichageMs: null, indice: r.indice,
          });
          if (!reussite) cartes.current.push({ paquet: item.paquet, itemId: item.id });
          etat.current = enregistrerReponse(etat.current, reussite);
          const suivant = ecoule() ? undefined : prochainItem(file, etat.current.niveau);
          if (suivant) setItem(suivant);
          else terminer();
        }}
      />
    </Cadre>
  );
}

const QUESTIONS_TRAITS: { cle: keyof ItemTraits['traits']; question: string }[] = [
  { cle: 'categorie', question: 'Dans quelle catégorie le rangez-vous ?' },
  { cle: 'usage', question: 'À quoi sert-il, que fait-on avec ?' },
  { cle: 'description', question: 'À quoi ressemble-t-il ? (forme, matière, propriétés)' },
  { cle: 'lieu', question: 'Où le trouve-t-on ?' },
  { cle: 'association', question: 'À quoi vous fait-il penser ?' },
];

/**
 * Exercice 7 : analyse des traits sémantiques (Semantic Feature Analysis). Pour un mot donné,
 * vous produisez ses traits ; les traits modèles sont ensuite affichés. Pas de note : c'est
 * l'activation du réseau sémantique autour du mot qui compte.
 */
export function TraitsSemantiques({ dureeMs, vus, onTerminer }: PropsExercice) {
  const file = useMemo(() => ordonnerItems(C.traits(), vus, 3), [vus]);
  const [item, setItem] = useState(() => prochainItem(file, 3));
  const [reponses, setReponses] = useState<Record<string, string>>({});
  const [corrige, setCorrige] = useState(false);
  const essais = useRef<EssaiExercice[]>([]);
  const debut = useRef(performance.now());
  const { reste, ecoule } = useTempsRestant(dureeMs);

  const terminer = () =>
    onTerminer({ ...resultatVide('traits-semantiques'), essais: essais.current, metrique: 'mots-travailles', unite: 'mots', valeur: essais.current.length });

  if (!item) return <FinContenu onContinuer={terminer} />;
  return (
    <Cadre reste={reste} total={dureeMs}>
      <p className="text-[0.875rem] text-texte-2">Décrivez ce mot sous tous ses aspects</p>
      <p className="text-center text-[2rem] font-semibold">{item.mot}</p>
      <div className="space-y-3">
        {QUESTIONS_TRAITS.map((q) => (
          <div key={q.cle} className="space-y-1">
            <label htmlFor={`trait-${q.cle}`} className="text-[0.9375rem] text-texte-2">{q.question}</label>
            <input
              id={`trait-${q.cle}`}
              value={reponses[q.cle] ?? ''}
              onChange={(e) => setReponses({ ...reponses, [q.cle]: e.target.value })}
              readOnly={corrige}
              autoComplete="off"
              className="min-h-[46px] w-full rounded-[12px] bg-surface px-3 text-[1.0625rem] shadow-sm outline-none focus:ring-2 focus:ring-accent"
            />
            {corrige && <p className="px-1 text-[0.9375rem] text-accent">{item.traits[q.cle]}</p>}
          </div>
        ))}
      </div>
      {!corrige ? (
        <Bouton onClick={() => setCorrige(true)}>Comparer avec des traits modèles</Bouton>
      ) : (
        <Bouton
          onClick={() => {
            essais.current.push({
              itemId: item.id, niveau: null, stimulus: item.mot, reponse: JSON.stringify(reponses), correcte: null,
              tempsReponseMs: Math.round(performance.now() - debut.current), ecartAffichageMs: null, indice: null,
            });
            const suivant = ecoule() ? undefined : prochainItem(file, 3);
            if (!suivant) return terminer();
            setItem(suivant);
            setReponses({});
            setCorrige(false);
            debut.current = performance.now();
          }}
        >
          Mot suivant
        </Bouton>
      )}
    </Cadre>
  );
}

const CRITERES_REGISTRE = [
  'Le sens est conservé',
  'Le vocabulaire est précis et soutenu',
  'La phrase est fluide et correctement construite',
] as const;

/** Exercice 10 : reformulation dans un registre professionnel, avec grille d'autoévaluation. */
export function Registre({ dureeMs, vus, onTerminer }: PropsExercice) {
  const file = useMemo(() => ordonnerItems(C.registres(), vus, 3), [vus]);
  const [item, setItem] = useState<ItemRegistre | undefined>(() => prochainItem(file, 3));
  const [texte, setTexte] = useState('');
  const [phase, setPhase] = useState<'saisie' | 'evaluation'>('saisie');
  const [criteres, setCriteres] = useState<boolean[]>([false, false, false]);
  const essais = useRef<EssaiExercice[]>([]);
  const debut = useRef(performance.now());
  const { reste, ecoule } = useTempsRestant(dureeMs);

  const terminer = () => {
    const notes = essais.current.map((e) => Number(e.reponse.split('|')[0]));
    const moyenne = notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : NaN;
    onTerminer({ ...resultatVide('registre'), essais: essais.current, metrique: 'autoevaluation', unite: 'sur 3', valeur: Math.round(moyenne * 10) / 10 });
  };

  if (!item) return <FinContenu onContinuer={terminer} />;
  return (
    <Cadre reste={reste} total={dureeMs}>
      <p className="text-[0.875rem] text-texte-2">{item.contexte}</p>
      <blockquote className="rounded-[14px] bg-surface p-4 text-[1.125rem] leading-relaxed italic shadow-sm">« {item.phrase} »</blockquote>
      <label htmlFor="reformulation" className="text-texte-2">Reformulez dans un registre adapté à cette situation :</label>
      <textarea
        id="reformulation"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        readOnly={phase === 'evaluation'}
        rows={3}
        className="w-full rounded-[14px] bg-surface p-3 text-[1.0625rem] shadow-sm outline-none focus:ring-2 focus:ring-accent"
      />
      {phase === 'saisie' ? (
        <Bouton desactive={!texte.trim()} onClick={() => setPhase('evaluation')}>Voir des reformulations possibles</Bouton>
      ) : (
        <>
          <ul className="space-y-2">
            {item.reformulations.map((r) => <li key={r} className="rounded-[12px] bg-accent-doux px-4 py-3">{r}</li>)}
          </ul>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-texte-2">Votre reformulation :</legend>
            {CRITERES_REGISTRE.map((c, k) => (
              <label key={c} className="flex min-h-[44px] items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-[var(--c-accent)]" checked={criteres[k]} onChange={(e) => setCriteres(criteres.map((v, j) => (j === k ? e.target.checked : v)))} />
                {c}
              </label>
            ))}
          </fieldset>
          <Bouton
            onClick={() => {
              const note = criteres.filter(Boolean).length;
              essais.current.push({
                itemId: item.id, niveau: null, stimulus: item.phrase, reponse: `${note}|${texte}`, correcte: null,
                tempsReponseMs: Math.round(performance.now() - debut.current), ecartAffichageMs: null, indice: null,
              });
              const suivant = ecoule() ? undefined : prochainItem(file, 3);
              if (!suivant) return terminer();
              setItem(suivant);
              setTexte('');
              setCriteres([false, false, false]);
              setPhase('saisie');
              debut.current = performance.now();
            }}
          >
            Phrase suivante
          </Bouton>
        </>
      )}
    </Cadre>
  );
}

/** Exercices 4 et 5 : fluence d'échauffement, sur une catégorie ou une lettre hors bilan. */
export function Echauffement({ dureeMs, alea, vus, onTerminer }: PropsExercice) {
  const item = useMemo(() => {
    const items = C.fluences();
    const ordre = ordonnerItems(items.map((i) => ({ ...i, difficulte: 1 })), vus, 1);
    return ordre[0] ?? choisir(items, alea);
  }, [vus, alea]);
  if (!item) return <FinContenu onContinuer={() => onTerminer(resultatVide('fluence'))} />;
  return (
    <Fluence
      consigne={item.consigne}
      item={item}
      dureeMs={dureeMs}
      sansArbitragePhonemique
      onTerminer={(r) =>
        onTerminer({
          ...resultatVide('fluence'),
          essais: r.saisies.map((s) => ({
            itemId: item.id, niveau: null, stimulus: item.consigne, reponse: s.mot, correcte: null,
            tempsReponseMs: Math.round(s.tMs), ecartAffichageMs: null, indice: null,
          })),
          metrique: `mots-valides-${item.modalite}`, unite: 'mots', valeur: r.score.valides,
        })
      }
    />
  );
}

export function Cadre({ reste, total, children }: { reste: number; total: number; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-6">
      <BarreTemps resteMs={reste} totalMs={total} />
      {children}
    </div>
  );
}

export function FinContenu({ onContinuer }: { onContinuer: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-10 text-center">
      <p className="text-[1.0625rem]">Tous les éléments disponibles pour cet exercice ont été vus aujourd'hui.</p>
      <Bouton onClick={onContinuer}>Continuer</Bouton>
    </div>
  );
}
