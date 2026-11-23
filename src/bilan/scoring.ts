/**
 * Métriques des épreuves du bilan. Fonctions pures, testées.
 * Chaque métrique est brute (mots, millisecondes, empans) : aucune norme de population.
 */
import { dedupliquer, equivalentes, normaliser, pente, productionParTranche, type SaisieHorodatee } from '../moteur/saisie-libre';
import { mediane, moyenne, ecartType } from '../moteur/statistiques';

const cle = (m: string) => normaliser(m, { ignorerAccents: true, retirerArticle: true });

/* ---------- Mémoire épisodique : liste de mots ---------- */

export interface ResultatRappel {
  corrects: string[];
  intrusions: string[];
  repetitions: number;
}

export function corrigerRappel(saisies: readonly string[], liste: readonly string[]): ResultatRappel {
  const cibles = liste.map(cle);
  const vus: string[] = [];
  const corrects: string[] = [];
  const intrusions: string[] = [];
  let repetitions = 0;
  for (const s of saisies) {
    const k = cle(s);
    if (!k) continue;
    if (vus.some((v) => equivalentes(v, k))) {
      repetitions++;
      continue;
    }
    vus.push(k);
    const i = cibles.findIndex((c) => equivalentes(c, k));
    if (i >= 0) corrects.push(liste[i]!);
    else intrusions.push(s);
  }
  return { corrects, intrusions, repetitions };
}

/* ---------- Fluences ---------- */

export interface ItemFluenceBilan {
  modalite: 'semantique' | 'phonemique';
  cle: string;
  reference: readonly string[];
  exclusions: readonly string[];
}

export type StatutMot = 'valide' | 'doublon' | 'hors-categorie' | 'a-arbitrer';

export function classerMotsFluence(saisies: readonly SaisieHorodatee[], item: ItemFluenceBilan) {
  const { uniques } = dedupliquer(saisies.map((s) => s.mot));
  const restants = [...uniques];
  const ref = item.reference.map(cle);
  const excl = item.exclusions.map(cle);
  const lettre = cle(item.cle);
  return saisies.map((s) => {
    const k = cle(s.mot);
    const i = restants.indexOf(s.mot);
    let statut: StatutMot;
    if (i < 0) statut = 'doublon';
    else {
      restants.splice(i, 1);
      if (item.modalite === 'phonemique' && !k.startsWith(lettre)) statut = 'hors-categorie';
      else if (excl.some((e) => equivalentes(e, k))) statut = 'hors-categorie';
      else if (ref.some((r) => equivalentes(r, k))) statut = 'valide';
      else statut = 'a-arbitrer';
    }
    return { ...s, statut };
  });
}

/** Après arbitrage, les mots « à arbitrer » acceptés deviennent valides. */
export function scoreFluence(classes: readonly (SaisieHorodatee & { statut: StatutMot })[], acceptes: ReadonlySet<string>, dureeMs = 60_000) {
  const valides = classes.filter((c) => c.statut === 'valide' || (c.statut === 'a-arbitrer' && acceptes.has(c.mot)));
  const tranches = productionParTranche(valides, dureeMs);
  return {
    valides: valides.length,
    doublons: classes.filter((c) => c.statut === 'doublon').length,
    refuses: classes.filter((c) => c.statut === 'hors-categorie' || (c.statut === 'a-arbitrer' && !acceptes.has(c.mot))).length,
    tranches,
    pente: pente(tranches),
  };
}

/* ---------- Temps de réponse ---------- */

export interface EssaiChoix {
  condition: string;
  correcte: boolean;
  /** null si aucune réponse dans le délai. */
  tempsMs: number | null;
}

/** Bornes d'exclusion des temps aberrants (anticipations et inattentions). */
export const TR_MIN = 200;
export const TR_MAX = 3000;

export function trValides(essais: readonly EssaiChoix[], condition?: string): number[] {
  return essais
    .filter((e) => (condition === undefined || e.condition === condition) && e.correcte && e.tempsMs !== null)
    .map((e) => e.tempsMs!)
    .filter((t) => t >= TR_MIN && t <= TR_MAX);
}

export function exactitude(essais: readonly EssaiChoix[], condition?: string): number {
  const sel = essais.filter((e) => condition === undefined || e.condition === condition);
  return sel.length ? sel.filter((e) => e.correcte).length / sel.length : NaN;
}

export function decisionLexicale(essais: readonly EssaiChoix[]) {
  return { trMedian: mediane(trValides(essais)), exactitude: exactitude(essais) };
}

/** Coût d'une condition par rapport à une autre (Stroop : incongruent − congruent ; alternance : changement − répétition). */
export function coutConditions(essais: readonly EssaiChoix[], difficile: string, facile: string) {
  return {
    coutMs: mediane(trValides(essais, difficile)) - mediane(trValides(essais, facile)),
    coutExactitude: exactitude(essais, facile) - exactitude(essais, difficile),
  };
}

export function goNoGo(essais: readonly EssaiChoix[]) {
  const go = essais.filter((e) => e.condition === 'go');
  const nogo = essais.filter((e) => e.condition === 'nogo');
  const tr = trValides(go);
  const m = moyenne(tr);
  return {
    omissions: go.filter((e) => e.tempsMs === null).length,
    faussesAlarmes: nogo.filter((e) => e.tempsMs !== null).length,
    trMoyen: m,
    /** Coefficient de variation : indice d'instabilité attentionnelle. */
    coefficientVariation: tr.length > 1 ? ecartType(tr) / m : NaN,
  };
}

export function doubleTache(simple: readonly EssaiChoix[], double: readonly EssaiChoix[], flashsPresentes: number, flashsRapportes: number) {
  const trS = mediane(trValides(simple));
  const trD = mediane(trValides(double));
  return {
    coutRelatif: (trD - trS) / trS,
    exactitudeDouble: exactitude(double),
    erreurComptage: Math.abs(flashsPresentes - flashsRapportes),
  };
}

/* ---------- Mémoire de travail ---------- */

export interface EssaiEmpan {
  longueur: number;
  correct: boolean;
}

/** Empan : plus grande longueur réussie au moins une fois. */
export function empanMaximal(essais: readonly EssaiEmpan[]): number {
  return essais.filter((e) => e.correct).reduce((m, e) => Math.max(m, e.longueur), 0);
}

/** Règle d'arrêt : deux échecs à une même longueur. */
export function arretEmpan(essais: readonly EssaiEmpan[], longueur: number): boolean {
  return essais.filter((e) => e.longueur === longueur && !e.correct).length >= 2;
}

/** Inverse attendu de la séquence présentée. */
export function inverse(sequence: readonly string[]): string {
  return [...sequence].reverse().join('');
}

/** Mise à jour : nombre d'éléments rappelés à la bonne position parmi les n derniers. */
export function scoreMiseAJour(flux: readonly string[], reponse: string, n: number): number {
  const attendu = flux.slice(-n);
  const donne = reponse.replace(/\s/g, '').toUpperCase().split('');
  return attendu.reduce((s, c, i) => s + (donne[i] === c.toUpperCase() ? 1 : 0), 0);
}
