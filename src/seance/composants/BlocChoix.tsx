/**
 * Bloc d'entraînement à choix rapide, d'une durée fixe, avec escalier 3 réussites / 1 échec par essai.
 * Chaque essai est généré au niveau courant. Comme dans le bilan, le stimulus est écrit dans le DOM
 * au sein d'un rappel requestAnimationFrame, et le temps de réponse vient de event.timeStamp.
 */
import { useEffect, useRef, useState } from 'react';
import { enregistrerReponse, type EtatEscalier } from '../../moteur/escalier';
import { attendre, BarreTemps } from '../../bilan/composants/commun';
import { haptique } from '../../ui/haptique';
import type { EssaiExercice } from '../types';

export interface OptionChoix {
  valeur: string;
  libelle: string;
  /** Touche du clavier (une lettre, un chiffre, ou « espace »). */
  touche: string;
}

export interface EssaiChoixGenere {
  itemId?: string | null;
  /** Texte du stimulus ; `couleur` et `taille` sont facultatifs. */
  texte: string;
  couleur?: string;
  taille?: string;
  /** Texte placé au-dessus du stimulus (phrase à compléter, consigne de règle). */
  contexte?: string;
  options: readonly OptionChoix[];
  /** null : ne pas répondre (essai no-go). */
  attendue: string | null;
  delaiMaxMs: number;
  dureeStimulusMs?: number;
  intervalleMs?: number;
  /** Explication affichée après une erreur (exercices lexicaux). */
  explication?: string;
  /** Réponse lente mais juste : comptée comme un échec pour l'escalier si `exigerDelai`. */
  exigerDelai?: boolean;
}

export interface IssueEssaiChoix {
  essai: EssaiChoixGenere;
  reponse: string | null;
  correcte: boolean;
  tempsMs: number | null;
}

interface Props {
  dureeMs: number;
  escalier: EtatEscalier;
  generer: (niveau: number, index: number) => EssaiChoixGenere | null;
  /** Retour après chaque essai : bref pour les tâches de vitesse, explicatif pour les tâches lexicales. */
  retour?: 'bref' | 'explicatif';
  onTerminer: (r: { essais: EssaiExercice[]; issues: IssueEssaiChoix[]; escalier: EtatEscalier }) => void;
}

export function BlocChoix({ dureeMs, escalier, generer, retour = 'bref', onTerminer }: Props) {
  const zone = useRef<HTMLDivElement>(null);
  const resoudre = useRef<((r: { valeur: string; t: number } | null) => void) | null>(null);
  const [essai, setEssai] = useState<EssaiChoixGenere | null>(null);
  const [message, setMessage] = useState<{ texte: string; detail?: string } | null>(null);
  const [debut] = useState(() => performance.now());
  const [reste, setReste] = useState(dureeMs);
  const [attenteSuite, setAttenteSuite] = useState<(() => void) | null>(null);
  const fin = useRef(onTerminer);
  fin.current = onTerminer;

  const repondre = (valeur: string, t: number) => {
    if (!resoudre.current) return;
    haptique(5);
    resoudre.current({ valeur, t });
    resoudre.current = null;
  };

  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (attenteSuite && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        attenteSuite();
        return;
      }
      const o = essai?.options.find((x) => x.touche === e.key.toLowerCase() || (x.touche === 'espace' && e.key === ' '));
      if (o) {
        e.preventDefault();
        repondre(o.valeur, e.timeStamp);
      }
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [essai, attenteSuite]);

  useEffect(() => {
    const id = setInterval(() => setReste(Math.max(0, dureeMs - (performance.now() - debut))), 250);
    return () => clearInterval(id);
  }, [debut, dureeMs]);

  useEffect(() => {
    let annule = false;
    (async () => {
      let etat = escalier;
      const essais: EssaiExercice[] = [];
      const issues: IssueEssaiChoix[] = [];
      for (let i = 0; !annule && performance.now() - debut < dureeMs; i++) {
        const e = generer(etat.niveau, i);
        if (!e) break;
        setEssai(e);
        await attendre(0);
        const el = zone.current;
        if (!el || annule) break;
        el.textContent = '+';
        el.style.color = '';
        await attendre(400);
        const reponse = new Promise<{ valeur: string; t: number } | null>((r) => {
          resoudre.current = r;
        });
        const apparition = await new Promise<number>((r) =>
          requestAnimationFrame((t) => {
            el.textContent = e.texte;
            el.style.color = e.couleur ?? '';
            el.style.fontSize = e.taille ?? '';
            el.style.visibility = 'visible';
            r(t);
          }),
        );
        let masque: ReturnType<typeof setTimeout> | undefined;
        if (e.dureeStimulusMs) {
          masque = setTimeout(() => requestAnimationFrame(() => (el.style.visibility = 'hidden')), e.dureeStimulusMs);
        }
        const delai = setTimeout(() => {
          resoudre.current?.(null);
          resoudre.current = null;
        }, e.delaiMaxMs);
        const r = await reponse;
        clearTimeout(delai);
        clearTimeout(masque);
        if (annule) break;
        el.textContent = '';
        el.style.visibility = 'visible';
        const correcte = r === null ? e.attendue === null : r.valeur === e.attendue;
        const tempsMs = r ? Math.round(r.t - apparition) : null;
        issues.push({ essai: e, reponse: r?.valeur ?? null, correcte, tempsMs });
        essais.push({
          itemId: e.itemId ?? null, niveau: etat.niveau, stimulus: e.contexte ? `${e.contexte} | ${e.texte}` : e.texte,
          reponse: r?.valeur ?? '', correcte, tempsReponseMs: tempsMs, ecartAffichageMs: null, indice: null,
        });
        etat = enregistrerReponse(etat, correcte);
        if (retour === 'explicatif' && !correcte && e.explication) {
          const bonne = e.options.find((o) => o.valeur === e.attendue)?.libelle ?? '';
          setMessage({ texte: r === null ? `Temps écoulé. Réponse : ${bonne}` : `Réponse : ${bonne}`, detail: e.explication });
          await new Promise<void>((ok) => setAttenteSuite(() => () => ok()));
          setAttenteSuite(null);
          setMessage(null);
        } else {
          setMessage({ texte: correcte ? 'Juste' : r === null ? (e.attendue === null ? '' : 'Trop lent') : 'Erreur' });
          await attendre(retour === 'explicatif' ? 600 : 350);
          setMessage(null);
        }
        await attendre(e.intervalleMs ?? 250);
      }
      if (!annule) fin.current({ essais, issues, escalier: etat });
    })();
    return () => {
      annule = true;
      resoudre.current = null;
    };
    // L'exercice démarre une seule fois ; les props suivantes sont figées pour sa durée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colonnes = Math.min(essai?.options.length ?? 2, essai && essai.options.length > 2 && essai.options.some((o) => o.libelle.length > 10) ? 2 : 4);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col gap-6 px-4 py-6">
      <BarreTemps resteMs={reste} totalMs={dureeMs} />
      {essai?.contexte && <p className="text-center text-[1.125rem] leading-relaxed">{essai.contexte}</p>}
      <div className={`relative flex w-full items-center justify-center ${essai && !essai.texte ? 'min-h-10' : 'min-h-40'}`}>
        <div ref={zone} className="text-center text-[2.5rem] leading-snug font-semibold tracking-wide whitespace-pre-line select-none" aria-live="off" />
        {message && !message.detail && message.texte && (
          <p role="status" className="absolute bottom-0 text-[1rem] text-texte-2">{message.texte}</p>
        )}
      </div>
      {message?.detail ? (
        <div className="space-y-3 rounded-[16px] bg-surface p-4 shadow-sm" role="status">
          <p className="font-semibold">{message.texte}</p>
          <p className="text-[0.9375rem] leading-relaxed text-texte-2">{message.detail}</p>
          <button type="button" onClick={() => attenteSuite?.()} className="min-h-[44px] w-full rounded-[12px] bg-accent font-semibold text-sur-accent">
            Continuer
          </button>
        </div>
      ) : (
        <div className="grid w-full gap-3" style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` }}>
          {essai?.options.map((o) => (
            <button
              key={o.valeur}
              type="button"
              onPointerDown={(ev) => {
                ev.preventDefault();
                repondre(o.valeur, ev.timeStamp);
              }}
              className="min-h-[64px] rounded-[16px] bg-surface px-2 text-[1.0625rem] font-semibold shadow-sm active:bg-surface-2"
            >
              {o.libelle}
              <span className="mt-1 block text-[0.75rem] font-normal text-texte-2">
                touche {o.touche === 'espace' ? 'Espace' : o.touche.toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
