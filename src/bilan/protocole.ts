/**
 * Protocole du bilan : épreuves, parties, métrique principale de chaque épreuve
 * et bornes du « pourcentage du maximum possible » utilisées par le radar indicatif.
 *
 * Les bornes sont des conventions internes à l'application, fixées une fois pour toutes
 * afin que les bilans successifs restent comparables. Ce ne sont PAS des normes.
 */
import { pourcentageDuMaximum, type Sens } from '../moteur/statistiques';
import type { Domaine } from '../stockage/types';

export type IdEpreuve =
  | 'liste-apprentissage' | 'fluence-semantique' | 'fluence-phonemique' | 'denomination'
  | 'decision-lexicale' | 'double-decision' | 'liste-differe'
  | 'empan-inverse' | 'mise-a-jour' | 'go-nogo' | 'double-tache' | 'stroop' | 'alternance';

export interface DefinitionEpreuve {
  id: IdEpreuve;
  partie: 1 | 2;
  domaine: Domaine;
  titre: string;
  consigne: string;
  dureeMin: number;
  /** Métrique principale retenue pour le radar. */
  metrique: string;
  unite: string;
  sens: Sens;
  borneMin: number;
  borneMax: number;
}

export const EPREUVES: readonly DefinitionEpreuve[] = [
  {
    id: 'liste-apprentissage', partie: 1, domaine: 'memoire-episodique', titre: 'Liste de mots',
    consigne: "Quinze mots vont s'afficher l'un après l'autre. Retenez-en le plus possible, puis écrivez tous ceux dont vous vous souvenez, dans l'ordre de votre choix. La liste sera présentée trois fois.",
    dureeMin: 3.5, metrique: 'total-3-essais', unite: 'mots', sens: 'haut', borneMin: 0, borneMax: 45,
  },
  {
    id: 'fluence-semantique', partie: 1, domaine: 'acces-lexical', titre: 'Fluence sémantique',
    consigne: "Pendant 60 secondes, écrivez le plus de mots possible appartenant à la catégorie indiquée. Validez chaque mot avec la touche Entrée.",
    dureeMin: 1.5, metrique: 'mots-valides', unite: 'mots', sens: 'haut', borneMin: 0, borneMax: 40,
  },
  {
    id: 'fluence-phonemique', partie: 1, domaine: 'acces-lexical', titre: 'Fluence phonémique',
    consigne: "Pendant 60 secondes, écrivez le plus de mots possible commençant par la lettre indiquée. Ni noms propres, ni mots de la même famille (par exemple « porte » puis « portail »).",
    dureeMin: 1.5, metrique: 'mots-valides', unite: 'mots', sens: 'haut', borneMin: 0, borneMax: 30,
  },
  {
    id: 'denomination', partie: 1, domaine: 'acces-lexical', titre: 'Dénomination sur définition',
    consigne: "Une définition s'affiche : écrivez le mot correspondant. Si le mot ne vient pas, vous pouvez demander un indice, puis un second.",
    dureeMin: 2, metrique: 'reussites-sans-indice', unite: 'items', sens: 'haut', borneMin: 0, borneMax: 12,
  },
  {
    id: 'decision-lexicale', partie: 1, domaine: 'vitesse', titre: 'Décision lexicale',
    consigne: "Une suite de lettres s'affiche. Indiquez le plus vite possible s'il s'agit d'un mot français (touche J) ou non (touche F), sans sacrifier la justesse.",
    dureeMin: 1.5, metrique: 'tr-median', unite: 'ms', sens: 'bas', borneMin: 400, borneMax: 1400,
  },
  {
    id: 'double-decision', partie: 1, domaine: 'vitesse', titre: 'Double décision',
    consigne: "Fixez le centre. Une forme apparaît brièvement au centre, et un point en périphérie. Indiquez ensuite quelle forme était au centre, puis où se trouvait le point. La durée d'affichage s'adapte à vos réponses.",
    dureeMin: 2, metrique: 'seuil-ms', unite: 'ms', sens: 'bas', borneMin: 17, borneMax: 500,
  },
  {
    id: 'liste-differe', partie: 1, domaine: 'memoire-episodique', titre: 'Rappel différé',
    consigne: "Écrivez tous les mots dont vous vous souvenez de la liste apprise au début du bilan.",
    dureeMin: 1, metrique: 'mots-rappeles', unite: 'mots', sens: 'haut', borneMin: 0, borneMax: 15,
  },
  {
    id: 'empan-inverse', partie: 2, domaine: 'memoire-travail', titre: 'Empan inverse',
    consigne: "Des chiffres s'affichent l'un après l'autre. Écrivez-les ensuite dans l'ordre inverse. La série s'allonge progressivement.",
    dureeMin: 2, metrique: 'empan', unite: 'chiffres', sens: 'haut', borneMin: 2, borneMax: 8,
  },
  {
    id: 'mise-a-jour', partie: 2, domaine: 'memoire-travail', titre: 'Mise à jour',
    consigne: "Des lettres défilent ; la série s'arrête à un moment imprévisible. Écrivez alors les quatre dernières lettres, dans l'ordre.",
    dureeMin: 2, metrique: 'items-corrects', unite: 'lettres', sens: 'haut', borneMin: 0, borneMax: 32,
  },
  {
    id: 'go-nogo', partie: 2, domaine: 'attention', titre: 'Go / no-go',
    consigne: "Des lettres s'affichent. Appuyez le plus vite possible pour chaque lettre, sauf pour la lettre X, pour laquelle il ne faut rien faire.",
    dureeMin: 2, metrique: 'erreurs', unite: 'erreurs', sens: 'bas', borneMin: 0, borneMax: 20,
  },
  {
    id: 'double-tache', partie: 2, domaine: 'attention', titre: 'Double tâche',
    consigne: "Indiquez si chaque chiffre est pair ou impair. Dans la seconde phase, comptez en plus les éclairs qui apparaissent sur le bord de l'écran.",
    dureeMin: 2.5, metrique: 'cout-relatif-pct', unite: '%', sens: 'bas', borneMin: 0, borneMax: 100,
  },
  {
    id: 'stroop', partie: 2, domaine: 'flexibilite', titre: 'Interférence',
    consigne: "Un nom de couleur s'affiche, écrit dans une couleur. Indiquez la couleur de l'encre, sans tenir compte du mot écrit.",
    dureeMin: 2, metrique: 'cout-ms', unite: 'ms', sens: 'bas', borneMin: 0, borneMax: 400,
  },
  {
    id: 'alternance', partie: 2, domaine: 'flexibilite', titre: 'Alternance',
    consigne: "Une paire lettre-chiffre s'affiche. En haut de l'écran, jugez le chiffre (pair ou impair) ; en bas, jugez la lettre (voyelle ou consonne).",
    dureeMin: 2, metrique: 'cout-ms', unite: 'ms', sens: 'bas', borneMin: 0, borneMax: 600,
  },
];

export const epreuve = (id: IdEpreuve) => EPREUVES.find((e) => e.id === id)!;

export function epreuvesDeLaPartie(p: 1 | 2): DefinitionEpreuve[] {
  return EPREUVES.filter((e) => e.partie === p);
}

export function dureePartie(p: 1 | 2): number {
  return epreuvesDeLaPartie(p).reduce((s, e) => s + e.dureeMin, 0);
}

/** Clé d'une métrique principale dans l'objet `metriques` d'un bilan. */
export const cleMetrique = (e: DefinitionEpreuve) => `${e.id}.${e.metrique}`;

/** Score indicatif de 0 à 100 par épreuve, puis moyenne par domaine. */
export function scoresIndicatifs(metriques: Record<string, number>): Partial<Record<Domaine, number>> {
  const parDomaine = new Map<Domaine, number[]>();
  for (const e of EPREUVES) {
    const v = metriques[cleMetrique(e)];
    if (v === undefined || Number.isNaN(v)) continue;
    const p = pourcentageDuMaximum(v, e.borneMin, e.borneMax, e.sens);
    parDomaine.set(e.domaine, [...(parDomaine.get(e.domaine) ?? []), p]);
  }
  const res: Partial<Record<Domaine, number>> = {};
  for (const [d, v] of parDomaine) res[d] = Math.round(v.reduce((s, x) => s + x, 0) / v.length);
  return res;
}

/** Rang interne indicatif : domaines du plus faible au plus élevé. */
export function rangInterne(scores: Partial<Record<Domaine, number>>): Domaine[] {
  return (Object.entries(scores) as [Domaine, number][]).sort((a, b) => a[1] - b[1]).map(([d]) => d);
}

/* ---------- Double décision : échelle des durées ---------- */

/** Durées visées (ms) du niveau 1 (facile) au niveau 13 (difficile). Converties en images selon l'écran. */
export const DUREES_DOUBLE_DECISION = [500, 400, 320, 260, 200, 160, 130, 100, 80, 65, 50, 35, 17] as const;

export function dureeDuNiveau(niveau: number): number {
  const i = Math.min(DUREES_DOUBLE_DECISION.length, Math.max(1, Math.round(niveau))) - 1;
  return DUREES_DOUBLE_DECISION[i]!;
}

/** Seuil en ms à partir d'un niveau éventuellement fractionnaire (moyenne des inversions), par interpolation. */
export function seuilEnMs(niveau: number): number {
  const bas = Math.floor(niveau);
  const haut = Math.ceil(niveau);
  if (bas === haut) return dureeDuNiveau(bas);
  const f = niveau - bas;
  return dureeDuNiveau(bas) * (1 - f) + dureeDuNiveau(haut) * f;
}
