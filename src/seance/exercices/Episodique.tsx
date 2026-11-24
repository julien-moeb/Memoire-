/** Exercices de mémoire épisodique : liste avec stratégies, rappel différé, note à retenir, méthode des lieux. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { enregistrerReponse, type EtatEscalier } from '../../moteur/escalier';
import { correspond } from '../../moteur/saisie-libre';
import { melanger } from '../../moteur/alea';
import { corrigerRappel } from '../../bilan/scoring';
import { Rappel } from '../../bilan/composants/Rappel';
import { BarreTemps, useCompteARebours } from '../../bilan/composants/commun';
import { Bouton, Carte } from '../../ui/composants';
import { useApp } from '../../etat/contexte';
import type { Lieu } from '../../stockage/types';
import * as C from '../contenu';
import * as N from '../niveaux';
import { ordonnerItems } from '../selection';
import { codeListe, decoderListe, strategieDuJour, unitesRetrouvees } from '../scoring';
import { resultatVide, type EssaiExercice, type PropsExercice, type ResultatExercice } from '../types';
import { FinContenu } from './Lexicaux';

const Ecran = ({ children }: { children: React.ReactNode }) => <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-6">{children}</div>;

/** Exercice 19 : apprendre une liste avec une stratégie d'encodage ; rappel immédiat, puis le lendemain. */
export function ListeStrategies({ escalier, vus, onTerminer, rang }: PropsExercice & { rang: number }) {
  const item = useMemo(() => ordonnerItems(C.listes().map((l) => ({ ...l, difficulte: 3 })), vus, 3)[0], [vus]);
  const longueur = N.listeStrategies(escalier!.niveau).longueur;
  const mots = useMemo(() => item?.mots.slice(0, longueur) ?? [], [item, longueur]);
  const strategie = strategieDuJour(rang);
  const etude = longueur * 4000;
  const [phase, setPhase] = useState<'strategie' | 'etude' | 'rappel' | 'bilan'>('strategie');
  const [resultat, setResultat] = useState<ReturnType<typeof corrigerRappel> | null>(null);
  const reste = useCompteARebours(etude, phase === 'etude', () => setPhase('rappel'));

  if (!item) return <FinContenu onContinuer={() => onTerminer(resultatVide('liste-strategies'))} />;

  if (phase === 'strategie') {
    return (
      <Ecran>
        <p className="text-[0.875rem] text-texte-2">Stratégie du jour</p>
        <h2 className="text-[1.5rem] font-semibold">{strategie.titre}</h2>
        <p className="text-[1.0625rem] leading-relaxed">{strategie.texte}</p>
        <p className="text-texte-2">
          Vous allez voir {longueur} mots ({item.theme}) pendant {Math.round(etude / 1000)} secondes. Vous les rappellerez tout de suite, puis lors de
          votre prochaine séance.
        </p>
        <Bouton onClick={() => setPhase('etude')}>Voir la liste</Bouton>
      </Ecran>
    );
  }
  if (phase === 'etude') {
    return (
      <Ecran>
        <BarreTemps resteMs={reste} totalMs={etude} />
        <p className="text-texte-2">{strategie.titre}</p>
        <ul className="grid grid-cols-2 gap-2">
          {mots.map((m) => <li key={m} className="rounded-[12px] bg-surface px-4 py-3 text-center text-[1.125rem] shadow-sm">{m}</li>)}
        </ul>
        <Bouton variante="teinte" onClick={() => setPhase('rappel')}>J'ai mémorisé</Bouton>
      </Ecran>
    );
  }
  if (phase === 'rappel') {
    return (
      <Rappel
        titre="Rappel immédiat"
        onTerminer={(saisies) => {
          setResultat(corrigerRappel(saisies, mots));
          setPhase('bilan');
        }}
      />
    );
  }
  const r = resultat!;
  const oublies = mots.filter((m) => !r.corrects.some((c) => c.toLowerCase() === m.toLowerCase()));
  return (
    <Ecran>
      <h2 className="text-[1.375rem] font-semibold">{r.corrects.length} mots sur {longueur}</h2>
      {oublies.length > 0 && <p className="text-texte-2">Non rappelés : {oublies.join(', ')}.</p>}
      <p className="text-texte-2">Cette liste vous sera redemandée en ouverture de votre prochaine séance.</p>
      <Bouton
        onClick={() => {
          const reussite = r.corrects.length / longueur >= 0.8;
          const fin: EtatEscalier = enregistrerReponse(escalier!, reussite);
          onTerminer({
            ...resultatVide('liste-strategies'),
            essais: [{ itemId: item.id, niveau: escalier!.niveau, stimulus: `${strategie.id}|${mots.join(',')}`, reponse: r.corrects.join(','), correcte: reussite, tempsReponseMs: null, ecartAffichageMs: null, indice: null }],
            metrique: 'rappel-immediat', unite: '%', valeur: Math.round((r.corrects.length / longueur) * 100),
            niveauDepart: escalier!.niveau, niveauArrivee: fin.niveau, escalier: fin, rappelListe: codeListe(item.id, longueur),
          });
        }}
      >
        Continuer
      </Bouton>
    </Ecran>
  );
}

/** Rappel différé, en ouverture de la séance suivante (exercice 19). */
export function RappelDiffere({ listeId, onTerminer }: { listeId: string; onTerminer: (r: ResultatExercice) => void }) {
  const { itemId, longueur } = decoderListe(listeId);
  const liste = C.listes().find((l) => l.id === itemId);
  const mots = liste?.mots.slice(0, longueur) ?? [];
  const [resultat, setResultat] = useState<ReturnType<typeof corrigerRappel> | null>(null);
  if (!liste) return <FinContenu onContinuer={() => onTerminer(resultatVide('liste-strategies'))} />;
  if (!resultat) {
    return <Rappel titre={`Rappel différé : la liste « ${liste.theme} »`} onTerminer={(s) => setResultat(corrigerRappel(s, mots))} />;
  }
  return (
    <Ecran>
      <h2 className="text-[1.375rem] font-semibold">{resultat.corrects.length} mots sur {longueur} après un délai</h2>
      <p className="text-texte-2">La liste complète : {mots.join(', ')}.</p>
      <Bouton
        onClick={() =>
          onTerminer({
            ...resultatVide('liste-strategies'),
            essais: [{ itemId, niveau: null, stimulus: `differe|${mots.join(',')}`, reponse: resultat.corrects.join(','), correcte: null, tempsReponseMs: null, ecartAffichageMs: null, indice: null }],
            metrique: 'rappel-differe', unite: '%', valeur: Math.round((resultat.corrects.length / longueur) * 100),
          })
        }
      >
        Continuer
      </Bouton>
    </Ecran>
  );
}

/** Exercice 20 : lire une note administrative, la rappeler librement, puis répondre à des questions. */
export function Paragraphe({ vus, onTerminer }: PropsExercice) {
  const item = useMemo(() => ordonnerItems(C.paragraphes(), vus, 3)[0], [vus]);
  const lecture = item ? Math.max(60_000, Math.round(item.texte.split(/\s+/).length * 400)) : 60_000;
  const [phase, setPhase] = useState<'lecture' | 'libre' | 'questions' | 'bilan'>('lecture');
  const [libre, setLibre] = useState('');
  const [q, setQ] = useState(0);
  const [reponse, setReponse] = useState('');
  const reponses = useRef<{ question: string; reponse: string; correcte: boolean }[]>([]);
  const reste = useCompteARebours(lecture, phase === 'lecture', () => setPhase('libre'));

  if (!item) return <FinContenu onContinuer={() => onTerminer(resultatVide('paragraphe'))} />;
  const unites = unitesRetrouvees(libre, item.unites);

  if (phase === 'lecture') {
    return (
      <Ecran>
        <BarreTemps resteMs={reste} totalMs={lecture} />
        <h2 className="text-[1.25rem] font-semibold">{item.titre}</h2>
        <p className="text-[1.0625rem] leading-relaxed whitespace-pre-line">{item.texte}</p>
        <Bouton variante="teinte" onClick={() => setPhase('libre')}>J'ai lu et retenu</Bouton>
      </Ecran>
    );
  }
  if (phase === 'libre') {
    return (
      <Ecran>
        <h2 className="text-[1.25rem] font-semibold">Que retenez-vous de cette note ?</h2>
        <p className="text-texte-2">Restituez-en l'essentiel avec vos mots : faits, chiffres, acteurs, décisions.</p>
        <textarea
          value={libre}
          onChange={(e) => setLibre(e.target.value)}
          rows={7}
          autoFocus
          aria-label="Rappel libre"
          className="w-full rounded-[14px] bg-surface p-3 text-[1.0625rem] shadow-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Bouton onClick={() => setPhase('questions')}>Passer aux questions</Bouton>
      </Ecran>
    );
  }
  if (phase === 'questions') {
    const question = item.questions[q]!;
    return (
      <Ecran>
        <p className="text-[0.875rem] text-texte-2">Question {q + 1} sur {item.questions.length}</p>
        <p className="text-[1.125rem] font-medium">{question.question}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            reponses.current.push({ question: question.question, reponse, correcte: correspond(reponse, [question.reponse, ...question.variantes], { ignorerAccents: true }) });
            setReponse('');
            if (q + 1 < item.questions.length) setQ(q + 1);
            else setPhase('bilan');
          }}
          className="flex flex-col gap-3"
        >
          <input
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            autoFocus
            autoComplete="off"
            aria-label="Votre réponse"
            className="min-h-[50px] rounded-[14px] bg-surface px-4 text-[1.0625rem] shadow-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <Bouton type="submit">Valider</Bouton>
        </form>
      </Ecran>
    );
  }
  const justes = reponses.current.filter((r) => r.correcte).length;
  return (
    <Ecran>
      <h2 className="text-[1.375rem] font-semibold">Bilan de la note</h2>
      <Carte>
        <p>Idées clés restituées : {unites.retrouvees.length} sur {item.unites.length}.</p>
        {unites.manquees.length > 0 && <p className="mt-2 text-texte-2">Non mentionnées : {unites.manquees.join(', ')}.</p>}
        <p className="mt-3">Questions : {justes} sur {item.questions.length}.</p>
        <ul className="mt-2 space-y-1 text-[0.9375rem] text-texte-2">
          {item.questions.map((qq, k) => (
            <li key={qq.question}>{reponses.current[k]?.correcte ? '✓' : '✗'} {qq.question} {qq.reponse}</li>
          ))}
        </ul>
      </Carte>
      <Bouton
        onClick={() => {
          const essais: EssaiExercice[] = [
            { itemId: item.id, niveau: null, stimulus: 'rappel-libre', reponse: libre, correcte: null, tempsReponseMs: null, ecartAffichageMs: null, indice: null },
            ...reponses.current.map((r) => ({ itemId: item.id, niveau: null, stimulus: r.question, reponse: r.reponse, correcte: r.correcte, tempsReponseMs: null, ecartAffichageMs: null, indice: null })),
          ];
          onTerminer({
            ...resultatVide('paragraphe'), essais, metrique: 'idees-cles', unite: '%',
            valeur: Math.round((unites.retrouvees.length / item.unites.length) * 100),
          });
        }}
      >
        Continuer
      </Bouton>
    </Ecran>
  );
}

const ETAPES_SUGGEREES = ["Porte d'entrée", 'Paillasson', 'Couloir', 'Porte-manteau', 'Salon', 'Canapé', 'Fenêtre', 'Cuisine', 'Réfrigérateur', 'Évier'];

/** Exercice 21 : méthode des lieux, sur un parcours personnel réutilisable. */
export function MethodeLieux({ escalier, alea, vus, onTerminer }: PropsExercice) {
  const { db } = useApp();
  const [lieu, setLieu] = useState<Lieu | null | undefined>(undefined);
  const [saisie, setSaisie] = useState<string[]>(ETAPES_SUGGEREES);
  const n = N.methodeLieux(escalier!.niveau).elements;
  const elements = useMemo(() => {
    const listes = ordonnerItems(C.listes().map((l) => ({ ...l, difficulte: 3 })), vus, 3);
    const source = listes.at(-1) ?? listes[0];
    return source ? melanger(source.mots, alea).slice(0, n) : [];
  }, [vus, alea, n]);
  const [phase, setPhase] = useState<'encodage' | 'rappel' | 'bilan'>('encodage');
  const [k, setK] = useState(0);
  const [reponses, setReponses] = useState<string[]>([]);

  useEffect(() => {
    if (!db) return setLieu(null);
    void db.get('lieux', 'parcours-1').then((l) => setLieu(l ?? null));
  }, [db]);

  if (lieu === undefined) return null;
  if (lieu === null) {
    return (
      <Ecran>
        <h2 className="text-[1.375rem] font-semibold">Votre parcours</h2>
        <p className="text-[1.0625rem] leading-relaxed">
          La méthode des lieux consiste à déposer mentalement chaque élément à retenir le long d'un trajet que vous connaissez par cœur.
          Décrivez une fois pour toutes dix étapes successives de ce trajet (votre logement, votre trajet vers le bureau…).
        </p>
        <ol className="space-y-2">
          {saisie.map((e, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="w-6 text-right text-texte-2">{i + 1}</span>
              <input
                value={e}
                onChange={(ev) => setSaisie(saisie.map((x, j) => (j === i ? ev.target.value : x)))}
                aria-label={`Étape ${i + 1}`}
                className="min-h-[44px] flex-1 rounded-[12px] bg-surface px-3 shadow-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </li>
          ))}
        </ol>
        <Bouton
          desactive={saisie.some((e) => !e.trim())}
          onClick={async () => {
            const l: Lieu = { id: 'parcours-1', nom: 'Parcours principal', etapes: saisie.map((e) => e.trim()) };
            await db?.put('lieux', l);
            setLieu(l);
          }}
        >
          Enregistrer ce parcours
        </Bouton>
      </Ecran>
    );
  }

  const etapes = lieu.etapes.slice(0, elements.length);
  if (phase === 'encodage') {
    return (
      <Ecran>
        <p className="text-[0.875rem] text-texte-2">Étape {k + 1} sur {etapes.length} : imaginez la scène</p>
        <Carte>
          <p className="text-texte-2">{etapes[k]}</p>
          <p className="mt-2 text-[1.75rem] font-semibold">{elements[k]}</p>
        </Carte>
        <p className="text-texte-2">Faites interagir l'élément avec ce lieu dans une image vive, exagérée, en mouvement.</p>
        <Bouton onClick={() => (k + 1 < etapes.length ? setK(k + 1) : (setK(0), setPhase('rappel')))}>
          {k + 1 < etapes.length ? 'Étape suivante' : 'Passer au rappel'}
        </Bouton>
      </Ecran>
    );
  }
  if (phase === 'rappel') {
    return (
      <Ecran>
        <p className="text-texte-2">Parcourez mentalement votre trajet et retrouvez l'élément déposé à chaque étape.</p>
        <ol className="space-y-2">
          {etapes.map((e, i) => (
            <li key={e} className="space-y-1">
              <label htmlFor={`lieu-${i}`} className="text-[0.9375rem] text-texte-2">{i + 1}. {e}</label>
              <input
                id={`lieu-${i}`}
                value={reponses[i] ?? ''}
                onChange={(ev) => { const r = [...reponses]; r[i] = ev.target.value; setReponses(r); }}
                autoComplete="off"
                className="min-h-[44px] w-full rounded-[12px] bg-surface px-3 shadow-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </li>
          ))}
        </ol>
        <Bouton onClick={() => setPhase('bilan')}>Vérifier</Bouton>
      </Ecran>
    );
  }
  const justes = etapes.map((_, i) => correspond(reponses[i] ?? '', [elements[i]!], { ignorerAccents: true }));
  const score = justes.filter(Boolean).length;
  return (
    <Ecran>
      <h2 className="text-[1.375rem] font-semibold">{score} éléments sur {etapes.length} à leur place</h2>
      <ul className="space-y-1">
        {etapes.map((e, i) => <li key={e}>{justes[i] ? '✓' : '✗'} {e} : {elements[i]}</li>)}
      </ul>
      <Bouton
        onClick={() => {
          const reussite = score / etapes.length >= 0.8;
          const fin = enregistrerReponse(escalier!, reussite);
          onTerminer({
            ...resultatVide('methode-lieux'),
            essais: etapes.map((e, i) => ({ itemId: null, niveau: escalier!.niveau, stimulus: `${e}|${elements[i]}`, reponse: reponses[i] ?? '', correcte: justes[i]!, tempsReponseMs: null, ecartAffichageMs: null, indice: null })),
            metrique: 'elements-places', unite: '%', valeur: Math.round((score / etapes.length) * 100),
            niveauDepart: escalier!.niveau, niveauArrivee: fin.niveau, escalier: fin,
          });
        }}
      >
        Continuer
      </Bouton>
    </Ecran>
  );
}
