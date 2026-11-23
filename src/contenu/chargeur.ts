/**
 * Chargement du contenu : tous les fichiers JSON de contenu/ (hors schémas) sont intégrés
 * à la compilation. Ajouter une série revient à déposer un fichier ; aucune modification de code.
 */
import { serie, type Serie } from './schemas';

const modules = import.meta.glob<unknown>(['/contenu/**/*.json', '!/contenu/schemas/**'], {
  eager: true,
  import: 'default',
});

function charger(): Serie[] {
  const series: Serie[] = [];
  for (const [chemin, donnees] of Object.entries(modules)) {
    const r = serie.safeParse(donnees);
    if (r.success) series.push(r.data);
    else console.warn(`[contenu] ${chemin} ignoré :`, r.error.issues);
  }
  return series;
}

export const SERIES: readonly Serie[] = charger();

export function seriesDeType<T extends Serie['type']>(type: T): Extract<Serie, { type: T }>[] {
  return SERIES.filter((s): s is Extract<Serie, { type: T }> => s.type === type);
}
