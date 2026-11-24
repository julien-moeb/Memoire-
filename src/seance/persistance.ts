/** Lecture et écriture des données de séance dans IndexedDB. */
import type { Base } from '../stockage/db';
import type { Carte, Confusion, ContexteSeance, Essai, Resultat, Seance } from '../stockage/types';
import { ajouterJours, ecartJours, type DateLocale } from '../moteur/dates';
import { creerEscalier, debutDeSeance, type EtatEscalier } from '../moteur/escalier';
import { cartesDues } from '../moteur/sm2';
import { EXERCICES, type IdExercice } from './catalogue';
import type { Bloc, SeancePassee } from './composer';
import type { ResultatExercice } from './types';
import { nouvellesCartes, NOUVELLES_PAR_SEANCE } from './exercices/Revisions';

/** Clé d'un bloc dans le plan d'une séance, pour la reprise après interruption. */
export function cleBloc(b: Bloc, index: number): string {
  if (b.type === 'exercice') return `${index}:${b.exercice}`;
  if (b.type === 'rappel-differe') return `${index}:rappel:${b.rappelId}`;
  return `${index}:${b.type}`;
}

export async function historique(db: Base): Promise<SeancePassee[]> {
  const seances = await db.getAllFromIndex('seances', 'date');
  return seances
    .filter((s) => s.fin !== null)
    .map((s) => ({ date: s.date, exercices: s.blocsRealises.map((k) => k.split(':')[1] ?? '').filter((e) => e in EXERCICES) }));
}

export async function seanceOuverte(db: Base, date: DateLocale): Promise<Seance | undefined> {
  const s = await db.getAllFromIndex('seances', 'date', date);
  return s.find((x) => x.fin === null);
}

/** Rappels différés dus ; ceux en retard de plus de sept jours sont marqués expirés. */
export async function rappelsDus(db: Base, date: DateLocale): Promise<{ id: string; listeId: string }[]> {
  const tous = await db.getAll('rappels');
  const dus: { id: string; listeId: string }[] = [];
  for (const r of tous) {
    if (r.statut !== 'en-attente' || r.echeance > date) continue;
    if (ecartJours(r.echeance, date) > 7) await db.put('rappels', { ...r, statut: 'expire' });
    else dus.push({ id: r.id, listeId: r.listeId });
  }
  return dus;
}

export function escalierInitial(id: IdExercice): EtatEscalier {
  const def = EXERCICES[id];
  return creerEscalier({ niveauMin: 1, niveauMax: def.niveauMax, niveauInitial: id === 'double-decision' ? 3 : 1, reussitesPourMonter: 3 });
}

/** Escalier repris de la veille et reculé d'un cran (échauffement), ou escalier neuf. */
export async function escalierDuJour(db: Base, id: IdExercice): Promise<EtatEscalier | null> {
  if (EXERCICES[id].adaptation === 'aucun') return null;
  const e = await db.get('escaliers', id);
  return e ? debutDeSeance(e.etat) : escalierInitial(id);
}

/** Items déjà présentés pour un exercice, avec la date de leur dernière présentation. */
export async function itemsVus(db: Base, id: IdExercice): Promise<Map<string, string>> {
  const essais = await db.getAllFromIndex('essais', 'exercice', id);
  const m = new Map<string, string>();
  for (const e of essais) {
    if (!e.itemId) continue;
    const d = m.get(e.itemId);
    if (!d || e.date > d) m.set(e.itemId, e.date);
  }
  return m;
}

/** Cartes à réviser aujourd'hui : échues d'abord, puis quelques nouvelles si la place le permet. */
export async function cartesDuJour(db: Base, date: DateLocale, max: number): Promise<Carte[]> {
  const toutes = await db.getAll('cartes');
  const dues = cartesDues(toutes, date, max);
  const place = Math.min(max - dues.length, NOUVELLES_PAR_SEANCE);
  if (place <= 0) return dues;
  return [...dues, ...nouvellesCartes(new Set(toutes.map((c) => c.id)), place, date)];
}

export async function ouvrirSeance(db: Base, date: DateLocale, contexte: ContexteSeance, plan: string[], appareilId: string | null): Promise<Seance> {
  const s: Seance = {
    id: `seance-${date}-${Date.now().toString(36)}`, date, debut: new Date().toISOString(), fin: null, contexte, plan, blocsRealises: [], appareilId,
  };
  await db.put('seances', s);
  return s;
}

/**
 * Enregistre le résultat d'un bloc en une seule transaction : essais, résultat, escalier,
 * cartes à reprendre, confusions, rappel différé, et avancement de la séance.
 */
export async function enregistrerBloc(
  db: Base, seance: Seance, cle: string, r: ResultatExercice, date: DateLocale, cartesRevisees: Carte[] = [],
): Promise<Seance> {
  const tx = db.transaction(['essais', 'resultats', 'escaliers', 'cartes', 'confusions', 'rappels', 'seances'], 'readwrite');
  const horodatage = new Date().toISOString();
  for (const e of r.essais) {
    const essai: Omit<Essai, 'id'> = { ...e, seanceId: seance.id, bilanId: null, exerciceId: r.exercice, date, horodatage };
    await tx.objectStore('essais').add(essai as Essai);
  }
  if (r.metrique && Number.isFinite(r.valeur)) {
    const res: Omit<Resultat, 'id'> = {
      seanceId: seance.id, bilanId: null, exerciceId: r.exercice, domaine: EXERCICES[r.exercice].domaine, date,
      metrique: r.metrique, unite: r.unite, valeur: r.valeur, niveauDepart: r.niveauDepart, niveauArrivee: r.niveauArrivee,
    };
    await tx.objectStore('resultats').add(res as Resultat);
  }
  if (r.escalier) await tx.objectStore('escaliers').put({ exerciceId: r.exercice, etat: r.escalier });
  for (const c of cartesRevisees) await tx.objectStore('cartes').put(c);
  for (const c of r.cartes) {
    // Une définition manquée devient une carte, révisée dès le lendemain ; une carte existante n'est pas réinitialisée.
    const existante = await tx.objectStore('cartes').get(c.itemId);
    if (!existante) {
      await tx.objectStore('cartes').put({
        id: c.itemId, paquet: c.paquet, itemId: c.itemId,
        etat: { facilite: 2.5, intervalle: 1, repetitions: 0, echeance: ajouterJours(date, 1), echecs: 1, derniereRevision: date },
      });
    }
  }
  for (const c of r.confusions) {
    const id = `${c.attendu}→${c.choisi}`;
    const avant = await tx.objectStore('confusions').get(id);
    const conf: Confusion = { id, attendu: c.attendu, choisi: c.choisi, erreurs: (avant?.erreurs ?? 0) + 1, derniere: date };
    await tx.objectStore('confusions').put(conf);
  }
  if (r.rappelListe) {
    await tx.objectStore('rappels').put({ id: `rappel-${seance.id}`, listeId: r.rappelListe, apprisLe: date, echeance: ajouterJours(date, 1), statut: 'en-attente' });
  }
  if (cle.includes(':rappel:')) {
    const rappelId = cle.split(':rappel:')[1]!;
    const rap = await tx.objectStore('rappels').get(rappelId);
    if (rap) await tx.objectStore('rappels').put({ ...rap, statut: 'fait' });
  }
  const suivante: Seance = { ...seance, blocsRealises: [...seance.blocsRealises, cle] };
  await tx.objectStore('seances').put(suivante);
  await tx.done;
  return suivante;
}

export async function cloreSeance(db: Base, seance: Seance): Promise<Seance> {
  const s = { ...seance, fin: new Date().toISOString() };
  await db.put('seances', s);
  return s;
}
