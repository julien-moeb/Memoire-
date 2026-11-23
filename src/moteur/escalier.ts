/**
 * Escalier adaptatif « n réussites / 1 échec » (Levitt, 1971).
 *
 * Convention : le niveau mesure la DIFFICULTÉ (plus haut = plus difficile).
 * Après `reussitesPourMonter` réussites consécutives, la difficulté augmente d'un cran ;
 * après un échec, elle diminue d'un cran.
 *
 * Taux de réussite visé à l'équilibre : p tel que p^n = 0,5, soit p = 0,5^(1/n).
 *   n = 2 → 70,7 %   n = 3 → 79,4 % (valeur retenue pour Lexique)
 */

export interface ConfigEscalier {
  niveauMin: number;
  niveauMax: number;
  niveauInitial: number;
  reussitesPourMonter: number;
}

export interface EtatEscalier extends ConfigEscalier {
  niveau: number;
  reussitesConsecutives: number;
  derniereDirection: 'plus-difficile' | 'plus-facile' | null;
  /** Niveaux auxquels la direction s'est inversée, du plus ancien au plus récent. */
  inversions: number[];
  essais: number;
}

export const CONFIG_PAR_DEFAUT: Omit<ConfigEscalier, 'niveauMax'> = {
  niveauMin: 1,
  niveauInitial: 1,
  reussitesPourMonter: 3,
};

export function tauxCible(reussitesPourMonter: number): number {
  return Math.pow(0.5, 1 / reussitesPourMonter);
}

function borner(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function creerEscalier(config: ConfigEscalier): EtatEscalier {
  if (config.niveauMin > config.niveauMax) throw new Error('niveauMin doit être inférieur ou égal à niveauMax');
  if (config.reussitesPourMonter < 1) throw new Error('reussitesPourMonter doit valoir au moins 1');
  return {
    ...config,
    niveau: borner(config.niveauInitial, config.niveauMin, config.niveauMax),
    reussitesConsecutives: 0,
    derniereDirection: null,
    inversions: [],
    essais: 0,
  };
}

/** Renvoie un nouvel état ; l'état passé n'est jamais modifié. */
export function enregistrerReponse(etat: EtatEscalier, correcte: boolean): EtatEscalier {
  const suivant: EtatEscalier = { ...etat, inversions: [...etat.inversions], essais: etat.essais + 1 };
  let direction: EtatEscalier['derniereDirection'] = null;

  if (correcte) {
    suivant.reussitesConsecutives = etat.reussitesConsecutives + 1;
    if (suivant.reussitesConsecutives >= etat.reussitesPourMonter) {
      suivant.reussitesConsecutives = 0;
      direction = 'plus-difficile';
    }
  } else {
    suivant.reussitesConsecutives = 0;
    direction = 'plus-facile';
  }

  if (direction) {
    if (etat.derniereDirection && etat.derniereDirection !== direction) {
      suivant.inversions.push(etat.niveau);
    }
    suivant.derniereDirection = direction;
    const pas = direction === 'plus-difficile' ? 1 : -1;
    suivant.niveau = borner(etat.niveau + pas, etat.niveauMin, etat.niveauMax);
  }
  return suivant;
}

/**
 * Reprise en début de séance : recul d'un cran pour que les premiers essais réussissent
 * (échauffement), sans effacer l'historique des inversions.
 */
export function debutDeSeance(etat: EtatEscalier): EtatEscalier {
  return {
    ...etat,
    inversions: [...etat.inversions],
    niveau: borner(etat.niveau - 1, etat.niveauMin, etat.niveauMax),
    reussitesConsecutives: 0,
    derniereDirection: null,
  };
}

/** Estimation du seuil : moyenne des niveaux aux `n` dernières inversions (null si insuffisant). */
export function estimationSeuil(etat: EtatEscalier, n = 6): number | null {
  if (etat.inversions.length < Math.min(n, 4)) return null;
  const dernieres = etat.inversions.slice(-n);
  return dernieres.reduce((s, v) => s + v, 0) / dernieres.length;
}
