/** Lecture et écriture du journal des épisodes de manque du mot (exercice 22). */
import type { Base } from '../stockage/db';
import type { Carte, Episode, MotPersonnel } from '../stockage/types';
import { ajouterJours, dateLocale, type DateLocale } from '../moteur/dates';
import { normaliser, sansAccents } from '../moteur/saisie-libre';
import { dateDe } from './calculs';

export const PAQUET_JOURNAL = 'journal';

/** Identifiant stable de la carte d'un mot cherché : le même mot consigné deux fois ne crée qu'une carte. */
export function idCartePerso(mot: string): string {
  const slug = sansAccents(normaliser(mot)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `perso-${slug || 'mot'}`;
}

export function nouvelEpisode(maintenant: Date = new Date()): Episode {
  return {
    id: `episode-${maintenant.getTime().toString(36)}`, dateHeure: maintenant.toISOString(), situation: 'reunion', interlocuteur: 'pairs',
    enjeu: 3, fatigue: 3, motCherche: null, motProduit: null, strategie: null, issue: 'differee', notes: '',
  };
}

/**
 * Enregistre un épisode. Un mot cherché devient une carte de révision, à revoir dès le lendemain ;
 * une carte existante garde sa progression, seul son indice est complété s'il manquait.
 */
export async function enregistrerEpisode(db: Base, e: Episode, indice: string | null): Promise<void> {
  const tx = db.transaction(['episodes', 'cartes', 'meta'], 'readwrite');
  const propre: Episode = {
    ...e,
    motCherche: e.motCherche?.trim() || null,
    motProduit: e.motProduit?.trim() || null,
    strategie: e.strategie?.trim() || null,
    notes: e.notes.trim(),
  };
  await tx.objectStore('episodes').put(propre);
  if (propre.motCherche) {
    const id = idCartePerso(propre.motCherche);
    const perso: MotPersonnel = { mot: propre.motCherche, indice: indice?.trim() || null, motProduit: propre.motProduit, episodeId: propre.id };
    const existante = await tx.objectStore('cartes').get(id);
    if (!existante) {
      const jour = dateDe(propre);
      const carte: Carte = {
        id, paquet: PAQUET_JOURNAL, itemId: id, perso,
        etat: { facilite: 2.5, intervalle: 1, repetitions: 0, echeance: ajouterJours(jour, 1), echecs: 1, derniereRevision: jour },
      };
      await tx.objectStore('cartes').put(carte);
    } else if (existante.perso && !existante.perso.indice && perso.indice) {
      await tx.objectStore('cartes').put({ ...existante, perso: { ...existante.perso, indice: perso.indice } });
    }
  }
  await tx.objectStore('meta').put({ cle: `journal:${dateDe(propre)}`, valeur: 'episode' });
  await tx.done;
}

export async function supprimerEpisode(db: Base, id: string): Promise<void> {
  await db.delete('episodes', id);
}

export async function lireEpisodes(db: Base): Promise<Episode[]> {
  const tous = await db.getAll('episodes');
  return tous.sort((a, b) => (a.dateHeure < b.dateHeure ? 1 : -1));
}

/** « Aucun épisode aujourd'hui » compte aussi comme journal renseigné. */
export async function noterJournalSansEpisode(db: Base, date: DateLocale = dateLocale()): Promise<void> {
  const deja = await db.get('meta', `journal:${date}`);
  if (!deja) await db.put('meta', { cle: `journal:${date}`, valeur: 'aucun' });
}

export async function journalRenseigne(db: Base, date: DateLocale = dateLocale()): Promise<boolean> {
  if (await db.get('meta', `journal:${date}`)) return true;
  return (await db.getAll('episodes')).some((e) => dateDe(e) === date);
}

/** Mots cherchés du journal, du plus récent au plus ancien, sans doublon. */
export async function motsPersonnels(db: Base): Promise<string[]> {
  const vus = new Set<string>();
  const mots: string[] = [];
  for (const e of await lireEpisodes(db)) {
    if (!e.motCherche) continue;
    const id = idCartePerso(e.motCherche);
    if (vus.has(id)) continue;
    vus.add(id);
    mots.push(e.motCherche);
  }
  return mots;
}

/** Plan de la semaine choisi lors de la séance comportementale. */
export interface PlanSemaine {
  ficheId: string;
  situation: Episode['situation'];
  date: DateLocale;
}

export async function lirePlanSemaine(db: Base): Promise<PlanSemaine | null> {
  const m = await db.get('meta', 'plan-semaine');
  if (!m || typeof m.valeur !== 'string') return null;
  try {
    return JSON.parse(m.valeur) as PlanSemaine;
  } catch {
    return null;
  }
}

export async function ecrirePlanSemaine(db: Base, plan: PlanSemaine): Promise<void> {
  await db.put('meta', { cle: 'plan-semaine', valeur: JSON.stringify(plan) });
}
