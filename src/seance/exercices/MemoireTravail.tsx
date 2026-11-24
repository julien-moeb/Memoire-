/** Exercices de mémoire de travail : n-back verbal, chiffres à rebours, dernières lettres. */
import { useEffect, useRef, useState } from 'react';
import { enregistrerReponse, estimationSeuil, type EtatEscalier } from '../../moteur/escalier';
import { attendre } from '../../bilan/composants/commun';
import { Reponse, useSerie } from '../../bilan/composants/Empan';
import { inverse, scoreMiseAJour } from '../../bilan/scoring';
import { fluxMiseAJour, sequenceChiffres } from '../../bilan/generateurs';
import { entier } from '../../moteur/alea';
import { haptique } from '../../ui/haptique';
import { Cadre } from './Lexicaux';
import { useTempsRestant } from '../composants/temps';
import { fluxNBack } from '../generateurs';
import * as N from '../niveaux';
import { EXERCICES } from '../catalogue';
import { resultatVide, type EssaiExercice, type PropsExercice } from '../types';

const LONGUEUR_BLOC = 20;

/**
 * Exercice 13 : n-back verbal. Appuyer quand la lettre est identique à celle vue n rangs plus tôt.
 * Le niveau (rang et cadence) change entre deux blocs de 20 lettres, selon l'exactitude du bloc.
 */
export function NBack({ dureeMs, escalier, alea, onTerminer }: PropsExercice) {
  const zone = useRef<HTMLDivElement>(null);
  const appui = useRef<number | null>(null);
  const [niveau, setNiveau] = useState(escalier!.niveau);
  const [pause, setPause] = useState<string | null>(null);
  const { reste } = useTempsRestant(dureeMs);
  const fin = useRef(onTerminer);
  fin.current = onTerminer;

  const appuyer = (t: number) => {
    if (appui.current === null) {
      appui.current = t;
      haptique(5);
    }
  };

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        appuyer(e.timeStamp);
      }
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, []);

  useEffect(() => {
    let annule = false;
    const debut = performance.now();
    (async () => {
      let n = escalier!.niveau;
      const essais: EssaiExercice[] = [];
      const exactitudes: number[] = [];
      const max = EXERCICES['n-back'].niveauMax;
      while (!annule && performance.now() - debut < dureeMs - 20_000) {
        const p = N.nBack(n);
        setNiveau(n);
        setPause(`${p.n}-back : appuyez quand la lettre est la même que celle vue ${p.n} lettres plus tôt.`);
        await attendre(2500);
        setPause(null);
        const flux = fluxNBack(p.n, LONGUEUR_BLOC + p.n, alea);
        let justes = 0;
        for (const [k, item] of flux.entries()) {
          if (annule || !zone.current) return;
          appui.current = null;
          const apparition = await new Promise<number>((r) => requestAnimationFrame((t) => {
            zone.current!.textContent = item.lettre;
            r(t);
          }));
          await attendre(p.dureeStimulusMs);
          requestAnimationFrame(() => zone.current && (zone.current.textContent = ''));
          await attendre(p.intervalleMs - p.dureeStimulusMs);
          if (k < p.n) continue;
          const repondu = appui.current !== null;
          const correcte = repondu === item.cible;
          if (correcte) justes++;
          essais.push({
            itemId: null, niveau: n, stimulus: `${item.lettre}${item.cible ? '*' : ''}`, reponse: repondu ? 'appui' : '',
            correcte, tempsReponseMs: repondu ? Math.round(appui.current! - apparition) : null, ecartAffichageMs: null, indice: null,
          });
        }
        const exactitude = justes / LONGUEUR_BLOC;
        exactitudes.push(exactitude);
        n = N.niveauApresBloc(n, exactitude, max);
      }
      if (annule) return;
      const moyenne = exactitudes.length ? exactitudes.reduce((a, b) => a + b, 0) / exactitudes.length : NaN;
      fin.current({
        ...resultatVide('n-back'), essais, metrique: 'exactitude', unite: '%', valeur: Math.round(moyenne * 100),
        niveauDepart: escalier!.niveau, niveauArrivee: n, escalier: { ...escalier!, niveau: n },
      });
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Cadre reste={reste} total={dureeMs}>
      <p className="text-center text-[0.875rem] text-texte-2">Niveau {niveau} · {N.nBack(niveau).n}-back</p>
      {pause && <p className="rounded-[12px] bg-accent-doux px-4 py-3 text-center" role="status">{pause}</p>}
      <div className="flex h-40 items-center justify-center">
        <div ref={zone} className="text-[3.5rem] font-semibold select-none" aria-live="off" />
      </div>
      <button
        type="button"
        onPointerDown={(e) => { e.preventDefault(); appuyer(e.timeStamp); }}
        className="min-h-[80px] rounded-[16px] bg-surface text-[1.125rem] font-semibold shadow-sm active:bg-surface-2"
      >
        Même lettre
        <span className="mt-1 block text-[0.75rem] font-normal text-texte-2">touche Espace</span>
      </button>
    </Cadre>
  );
}

/** Exercices 14 et 15 : séries présentées une à une, réponse tapée, escalier 3/1 sur la longueur. */
export function SeriesMemoire({ id, dureeMs, escalier, alea, onTerminer }: PropsExercice & { id: 'empan-inverse' | 'mise-a-jour' }) {
  const etat = useRef<EtatEscalier>(escalier!);
  const essais = useRef<EssaiExercice[]>([]);
  const [serie, setSerie] = useState<string[] | null>(null);
  const [phase, setPhase] = useState<'pret' | 'presentation' | 'reponse' | 'retour'>('pret');
  const [retour, setRetour] = useState('');
  const { reste, ecoule } = useTempsRestant(dureeMs);
  const courant = useSerie(phase === 'presentation' ? serie : null, () => setPhase('reponse'));

  const nouvelle = () => {
    const n = etat.current.niveau;
    const s = id === 'empan-inverse'
      ? sequenceChiffres(N.empanInverse(n).longueur, alea)
      : (() => {
          // flux d'une longueur imprévisible, au moins égale au nombre de lettres à retenir + 2
          const a = N.miseAJour(n).aRetenir;
          let f = fluxMiseAJour(alea);
          while (f.length < a + 2) f = [...f, ...fluxMiseAJour(alea)].slice(0, a + entier(alea, 2, 6));
          return f;
        })();
    setSerie(s);
    setPhase('presentation');
  };

  const terminer = () => {
    const e = etat.current;
    onTerminer({
      ...resultatVide(id), essais: essais.current, metrique: 'seuil', unite: id === 'empan-inverse' ? 'chiffres' : 'lettres',
      valeur: Math.round(((estimationSeuil(e, 6) ?? e.niveau) + 2) * 10) / 10,
      niveauDepart: escalier!.niveau, niveauArrivee: e.niveau, escalier: e,
    });
  };

  const valider = (v: string) => {
    const s = serie!;
    const n = etat.current.niveau;
    let correcte: boolean;
    let attendu: string;
    if (id === 'empan-inverse') {
      attendu = inverse(s);
      correcte = v.replace(/\D/g, '') === attendu;
    } else {
      const a = N.miseAJour(n).aRetenir;
      attendu = s.slice(-a).join('');
      correcte = scoreMiseAJour(s, v, a) === a;
    }
    essais.current.push({
      itemId: null, niveau: n, stimulus: s.join(''), reponse: v, correcte, tempsReponseMs: null, ecartAffichageMs: null, indice: null,
    });
    etat.current = enregistrerReponse(etat.current, correcte);
    setRetour(correcte ? 'Juste.' : `Réponse attendue : ${attendu}`);
    setPhase('retour');
  };

  const n = etat.current.niveau;
  const consigne = id === 'empan-inverse'
    ? `Retenez ${N.empanInverse(n).longueur} chiffres, puis tapez-les à rebours.`
    : `Des lettres défilent ; tapez les ${N.miseAJour(n).aRetenir} dernières, dans l'ordre.`;
  return (
    <Cadre reste={reste} total={dureeMs}>
      <p className="text-center text-texte-2">{consigne}</p>
      <div className="flex h-40 items-center justify-center">
        {phase === 'presentation' && <span className="text-[3.5rem] font-semibold" aria-live="off">{courant ?? ''}</span>}
        {phase === 'retour' && <p role="status" className="text-center text-[1.125rem]">{retour}</p>}
      </div>
      {phase === 'pret' && <button type="button" onClick={nouvelle} className="min-h-[50px] rounded-[14px] bg-accent font-semibold text-sur-accent">Commencer</button>}
      {phase === 'reponse' && <Reponse invite={id === 'empan-inverse' ? 'Les chiffres à rebours :' : 'Les dernières lettres :'} numerique={id === 'empan-inverse'} onValider={valider} />}
      {phase === 'retour' && (
        <button
          type="button"
          autoFocus
          onClick={() => (ecoule() ? terminer() : nouvelle())}
          className="min-h-[50px] rounded-[14px] bg-accent font-semibold text-sur-accent"
        >
          {ecoule() ? 'Terminer' : 'Suivante'}
        </button>
      )}
    </Cadre>
  );
}
