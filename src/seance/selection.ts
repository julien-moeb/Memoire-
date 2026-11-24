/** Choix des items de contenu pour un exercice : nouveauté d'abord, difficulté proche du niveau. */

export interface ItemDose {
  id: string;
  difficulte: number;
}

/**
 * Ordonne les items candidats pour une séance.
 * 1. Les items jamais vus dont la difficulté est au niveau ou juste en dessous ;
 * 2. puis les autres items jamais vus, du plus proche au plus éloigné du niveau ;
 * 3. enfin les items déjà vus, du moins récemment au plus récemment utilisé.
 * `vus` associe à chaque item déjà présenté la date (ou un rang) de sa dernière présentation.
 */
export function ordonnerItems<T extends ItemDose>(items: readonly T[], vus: ReadonlyMap<string, string>, niveau: number): T[] {
  const distance = (d: number) => (d === niveau || d === niveau - 1 ? 0 : Math.abs(d - niveau));
  const nouveaux = items.filter((i) => !vus.has(i.id));
  const anciens = items.filter((i) => vus.has(i.id));
  nouveaux.sort((a, b) => distance(a.difficulte) - distance(b.difficulte));
  anciens.sort((a, b) => (vus.get(a.id)! < vus.get(b.id)! ? -1 : vus.get(a.id)! > vus.get(b.id)! ? 1 : 0));
  return [...nouveaux, ...anciens];
}

/** Prochain item à la difficulté la plus proche du niveau courant, parmi ceux restant dans la file. */
export function prochainItem<T extends ItemDose>(file: T[], niveau: number): T | undefined {
  if (!file.length) return undefined;
  let meilleur = 0;
  let ecart = Infinity;
  // On ne regarde que la tête de file pour préserver la priorité aux items nouveaux.
  for (let k = 0; k < Math.min(file.length, 12); k++) {
    const e = Math.abs(file[k]!.difficulte - niveau) + (file[k]!.difficulte > niveau ? 0.5 : 0);
    if (e < ecart) {
      ecart = e;
      meilleur = k;
    }
  }
  return file.splice(meilleur, 1)[0];
}
