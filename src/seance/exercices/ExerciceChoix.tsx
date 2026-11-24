/** Exercices à choix : décision lexicale, appariement, go/no-go, Stroop, alternance, quasi-synonymes, intrus. */
import { useMemo } from 'react';
import { estimationSeuil, type EtatEscalier } from '../../moteur/escalier';
import { mediane } from '../../moteur/statistiques';
import { BlocChoix, type EssaiChoixGenere, type IssueEssaiChoix } from '../composants/BlocChoix';
import * as G from '../generateurs';
import * as C from '../contenu';
import { ordonnerItems, prochainItem } from '../selection';
import { resultatVide, type PropsExercice, type ResultatExercice } from '../types';
import type { IdExercice } from '../catalogue';

export type IdExerciceChoix = Extract<IdExercice, 'decision-lexicale' | 'appariement' | 'go-nogo' | 'stroop' | 'alternance' | 'discrimination' | 'intrus'>;

export const EXERCICES_CHOIX: readonly IdExerciceChoix[] = ['decision-lexicale', 'appariement', 'go-nogo', 'stroop', 'alternance', 'discrimination', 'intrus'];

const arrondi = (n: number) => Math.round(n * 10) / 10;

/** Métrique principale : seuil estimé (moyenne des inversions), ou exactitude pour les exercices lexicaux. */
export function syntheseChoix(id: IdExerciceChoix, issues: readonly IssueEssaiChoix[], escalier: EtatEscalier): Pick<ResultatExercice, 'metrique' | 'unite' | 'valeur'> {
  if (id === 'discrimination' || id === 'intrus') {
    const n = issues.length;
    return { metrique: 'exactitude', unite: '%', valeur: n ? Math.round((issues.filter((i) => i.correcte).length / n) * 100) : NaN };
  }
  if (id === 'decision-lexicale') {
    const tr = issues.filter((i) => i.correcte && i.tempsMs !== null).map((i) => i.tempsMs!);
    return { metrique: 'tr-median', unite: 'ms', valeur: tr.length ? Math.round(mediane(tr)) : NaN };
  }
  return { metrique: 'seuil', unite: 'niveau', valeur: arrondi(estimationSeuil(escalier, 6) ?? escalier.niveau) };
}

export function ExerciceChoix({ id, dureeMs, escalier, alea, vus, onTerminer }: PropsExercice & { id: IdExerciceChoix }) {
  const generer = useMemo(() => {
    if (id === 'decision-lexicale') {
      const { mots, pseudoMots } = C.motsDecision();
      return (n: number) => G.essaiDecisionLexicale(n, alea, mots, pseudoMots);
    }
    if (id === 'appariement') return (n: number) => G.essaiAppariement(n, alea);
    if (id === 'go-nogo') return (n: number) => G.essaiGoNogo(n, alea);
    if (id === 'stroop') return (n: number) => G.essaiStroop(n, alea);
    if (id === 'alternance') return (n: number, i: number) => G.essaiAlternance(n, alea, i);
    if (id === 'discrimination') {
      const file = ordonnerItems(C.discriminations(), vus, escalier!.niveau);
      return (n: number): EssaiChoixGenere | null => {
        const it = prochainItem(file, n);
        return it ? G.essaiDiscrimination(it, alea) : null;
      };
    }
    const file = ordonnerItems(C.intrus(), vus, escalier!.niveau);
    return (n: number): EssaiChoixGenere | null => {
      const it = prochainItem(file, n);
      return it ? G.essaiIntrus(it, alea) : null;
    };
  }, [id, alea, vus, escalier]);

  const lexical = id === 'discrimination' || id === 'intrus';
  return (
    <BlocChoix
      dureeMs={dureeMs}
      escalier={escalier!}
      generer={generer}
      retour={lexical ? 'explicatif' : 'bref'}
      onTerminer={({ essais, issues, escalier: fin }) => {
        const r = resultatVide(id);
        onTerminer({
          ...r,
          essais,
          ...syntheseChoix(id, issues, fin),
          niveauDepart: escalier!.niveau,
          niveauArrivee: fin.niveau,
          escalier: fin,
          confusions: lexical
            ? issues.filter((i) => !i.correcte && i.reponse && i.essai.attendue).map((i) => ({ attendu: i.essai.attendue!, choisi: i.reponse! }))
            : [],
        });
      }}
    />
  );
}
