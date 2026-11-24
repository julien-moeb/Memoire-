/**
 * Paramètres de difficulté de chaque niveau. Le niveau 1 est toujours le plus facile.
 * Les valeurs sont des choix de conception, non des normes : elles visent une progression
 * régulière et sont documentées dans METHODE.md.
 */

/** Interpolation linéaire arrondie entre deux bornes sur une échelle de niveaux 1..n. */
export function interpoler(niveau: number, n: number, facile: number, difficile: number): number {
  const t = n <= 1 ? 0 : (Math.min(Math.max(niveau, 1), n) - 1) / (n - 1);
  return Math.round(facile + (difficile - facile) * t);
}

/** Décision lexicale : délai de réponse de 2 000 à 800 ms. */
export const decisionLexicale = (niveau: number) => ({ delaiMaxMs: interpoler(niveau, 10, 2000, 800) });

/** Appariement : suites de 3 à 7 symboles, délai de 3 500 à 1 800 ms. */
export const appariement = (niveau: number) => ({
  longueur: interpoler(niveau, 10, 3, 7),
  delaiMaxMs: interpoler(niveau, 10, 3500, 1800),
});

/** Go/no-go : délai de 900 à 450 ms, intervalle de 900 à 500 ms. */
export const goNogo = (niveau: number) => ({
  delaiMaxMs: interpoler(niveau, 10, 900, 450),
  intervalleMs: interpoler(niveau, 10, 900, 500),
});

/** Stroop : délai de 2 500 à 1 100 ms ; part d'essais en conflit de 40 à 75 %. */
export const stroop = (niveau: number) => ({
  delaiMaxMs: interpoler(niveau, 10, 2500, 1100),
  partConflit: interpoler(niveau, 10, 40, 75) / 100,
});

/** Alternance : délai de 3 000 à 1 300 ms. */
export const alternance = (niveau: number) => ({ delaiMaxMs: interpoler(niveau, 10, 3000, 1300) });

/** N-back : niveaux 1 à 3 en 2-back, 4 à 6 en 3-back ; cadence de 2 500 à 1 900 ms. */
export const nBack = (niveau: number) => {
  const n = niveau <= 3 ? 2 : 3;
  const palier = ((niveau - 1) % 3) as 0 | 1 | 2;
  return { n, intervalleMs: [2500, 2200, 1900][palier]!, dureeStimulusMs: 500 };
};

/** Exactitude d'un bloc de n-back : ≥ 85 % fait monter, < 65 % fait descendre. */
export function niveauApresBloc(niveau: number, exactitude: number, max: number): number {
  if (exactitude >= 0.85) return Math.min(max, niveau + 1);
  if (exactitude < 0.65) return Math.max(1, niveau - 1);
  return niveau;
}

/** Empan inverse : suites de 3 à 9 chiffres. */
export const empanInverse = (niveau: number) => ({ longueur: niveau + 2 });

/** Mise à jour : retenir les 3 à 7 dernières lettres d'un flux. */
export const miseAJour = (niveau: number) => ({ aRetenir: niveau + 2 });

/** Liste avec stratégies : 8 à 15 mots. */
export const listeStrategies = (niveau: number) => ({ longueur: niveau + 7 });

/** Méthode des lieux : 5 à 10 éléments à placer sur le parcours. */
export const methodeLieux = (niveau: number) => ({ elements: niveau + 4 });
