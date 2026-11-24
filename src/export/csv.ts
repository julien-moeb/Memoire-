/**
 * Archive CSV destinée à un professionnel : un fichier par magasin de données, deux fichiers
 * de valeurs calculées (séries lissées et scores de domaine), un dictionnaire des variables et
 * une notice. Chaque colonne est déclarée une seule fois, avec son type, son unité et sa
 * description : le dictionnaire est produit à partir des mêmes déclarations, il ne peut donc
 * pas diverger des fichiers.
 *
 * Conventions : séparateur virgule et point décimal (RFC 4180, lisibles sans réglage par R,
 * Python, SPSS ou Jamovi), UTF-8 avec marque d'ordre des octets pour qu'Excel affiche les
 * accents, dates locales AAAA-MM-JJ, horodatages ISO 8601 en UTC, booléens 1 ou 0, valeur
 * absente laissée vide, listes séparées par une barre verticale.
 */
import type { Sauvegarde } from '../stockage/sauvegarde';
import type {
  Annotation, Appareil, Bilan, Carte, Confusion, Episode, EscalierEnregistre, Essai, Lieu, Meta, RappelDiffere, Reglages, Resultat, Seance,
} from '../stockage/types';
import { EPREUVES, cleMetrique } from '../bilan/protocole';
import { regrouper } from '../bilan/historique';
import { dateDe, scoresDomaines, seriesExercices } from '../suivi/calculs';
import { DOMAINES } from '../stockage/types';
import { creerZip, type FichierZip } from './zip';
import { completerReglages } from '../stockage/reglages';

export type TypeColonne = 'texte' | 'entier' | 'décimal' | 'booléen' | 'date' | 'horodatage' | 'liste';

export interface Colonne<T> {
  nom: string;
  type: TypeColonne;
  unite?: string;
  description: string;
  valeur: (r: T) => unknown;
}

export interface Table<T> {
  fichier: string;
  description: string;
  colonnes: readonly Colonne<T>[];
  lignes: (s: Sauvegarde) => readonly T[];
}

/* ---------- Sérialisation ---------- */

export function cellule(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
  if (Array.isArray(v)) return cellule(v.map((x) => String(x)).join('|'));
  const s = String(v);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function versCsv<T>(colonnes: readonly Colonne<T>[], lignes: readonly T[]): string {
  const entete = colonnes.map((c) => cellule(c.nom)).join(',');
  const corps = lignes.map((l) => colonnes.map((c) => cellule(c.valeur(l))).join(','));
  return `﻿${[entete, ...corps].join('\r\n')}\r\n`;
}

/* ---------- Déclaration des tables ---------- */

const de = <T>(s: Sauvegarde, nom: keyof Sauvegarde['magasins']) => (s.magasins[nom] ?? []) as T[];
const col = <T>(nom: string, type: TypeColonne, description: string, valeur: (r: T) => unknown, unite?: string): Colonne<T> => ({ nom, type, description, valeur, unite });
const dureeMin = (s: Seance) => (s.fin ? Math.round(((Date.parse(s.fin) - Date.parse(s.debut)) / 60_000) * 10) / 10 : null);
const UNITES_BILAN = new Map(EPREUVES.map((e) => [cleMetrique(e), e.unite]));

interface MetriqueBilan { bilan: Bilan; cle: string; valeur: number }
interface ValeurSerie { exercice: string; metrique: string; unite: string; domaine: string; date: string; brute: number; lissee: number | null; ecart: number | null; dansScore: boolean }
interface ScoreDomaine { date: string; domaine: string; ecart: number }
interface Reglage { cle: string; valeur: unknown }

function valeursSeries(s: Sauvegarde): ValeurSerie[] {
  const bilans = regrouper(de<Bilan>(s, 'bilans')).filter((b) => b.complet);
  const series = seriesExercices(de<Resultat>(s, 'resultats'), bilans);
  return series.flatMap((x) =>
    x.brutes.map((p) => ({
      exercice: x.exercice, metrique: x.metrique, unite: x.unite, domaine: x.domaine, date: p.date, brute: p.valeur,
      lissee: x.lissees.find((l) => l.date === p.date)?.valeur ?? null,
      ecart: x.ecarts.find((e) => e.date === p.date)?.valeur ?? null,
      dansScore: x.dansScore,
    })),
  );
}

function valeursDomaines(s: Sauvegarde): ScoreDomaine[] {
  const bilans = regrouper(de<Bilan>(s, 'bilans')).filter((b) => b.complet);
  const scores = scoresDomaines(seriesExercices(de<Resultat>(s, 'resultats'), bilans));
  return DOMAINES.flatMap((d) => scores[d].map((p) => ({ date: p.date, domaine: d, ecart: p.valeur })));
}

const arrondi = (v: number | null, n = 3) => (v === null ? null : Math.round(v * 10 ** n) / 10 ** n);

/** Efface le type des lignes : chaque table reste vérifiée à sa déclaration. */
const table = <T>(t: Table<T>) => t as unknown as Table<unknown>;

export const TABLES: readonly Table<unknown>[] = [
  table({
    fichier: 'seances.csv',
    description: 'Une ligne par séance quotidienne, terminée ou interrompue.',
    lignes: (s) => de<Seance>(s, 'seances').sort((a, b) => (a.debut < b.debut ? -1 : 1)),
    colonnes: [
      col<Seance>('id', 'texte', 'Identifiant de la séance', (r) => r.id),
      col<Seance>('date', 'date', 'Date locale de la séance', (r) => r.date),
      col<Seance>('debut', 'horodatage', 'Début (UTC)', (r) => r.debut),
      col<Seance>('fin', 'horodatage', 'Fin (UTC) ; vide si la séance a été interrompue', (r) => r.fin),
      col<Seance>('duree', 'décimal', 'Durée entre le début et la fin', dureeMin, 'min'),
      col<Seance>('sommeil', 'entier', "Heures de sommeil la nuit précédente, saisies avant la séance (4 = 4 h ou moins, 10 = 10 h ou plus)", (r) => r.contexte.sommeilHeures, 'h'),
      col<Seance>('fatigue', 'entier', 'Fatigue ressentie avant la séance, de 1 (aucune) à 5 (très forte)', (r) => r.contexte.fatigue, '1 à 5'),
      col<Seance>('plan', 'liste', 'Blocs prévus, au format rang:exercice', (r) => r.plan),
      col<Seance>('blocs_realises', 'liste', 'Blocs terminés, au format rang:exercice', (r) => r.blocsRealises),
      col<Seance>('volet_comportemental', 'booléen', 'La séance comportait le volet comportemental hebdomadaire', (r) => r.blocsRealises.some((k) => k.endsWith(':comportemental'))),
      col<Seance>('appareil_id', 'texte', 'Appareil utilisé (voir appareils.csv)', (r) => r.appareilId),
    ],
  } satisfies Table<Seance>),
  table({
    fichier: 'resultats.csv',
    description: "Métrique principale de chaque exercice, une ligne par exercice et par séance. Source des courbes.",
    lignes: (s) => de<Resultat>(s, 'resultats'),
    colonnes: [
      col<Resultat>('id', 'entier', 'Identifiant', (r) => r.id),
      col<Resultat>('seance_id', 'texte', 'Séance (voir seances.csv)', (r) => r.seanceId),
      col<Resultat>('bilan_id', 'texte', 'Partie de bilan, le cas échéant', (r) => r.bilanId),
      col<Resultat>('exercice', 'texte', "Identifiant de l'exercice (voir METHODE.md)", (r) => r.exerciceId),
      col<Resultat>('domaine', 'texte', 'Domaine cognitif principal', (r) => r.domaine),
      col<Resultat>('date', 'date', 'Date locale', (r) => r.date),
      col<Resultat>('metrique', 'texte', 'Nom de la métrique (seuil, exactitude, tr-median…)', (r) => r.metrique),
      col<Resultat>('unite', 'texte', "Unité de la valeur (ms : plus bas = mieux ; autres unités : plus haut = mieux)", (r) => r.unite),
      col<Resultat>('valeur', 'décimal', 'Valeur de la métrique, dans son unité', (r) => r.valeur, 'voir unite'),
      col<Resultat>('niveau_depart', 'décimal', "Niveau de difficulté au début du bloc", (r) => r.niveauDepart, 'niveau'),
      col<Resultat>('niveau_arrivee', 'décimal', 'Niveau de difficulté à la fin du bloc', (r) => r.niveauArrivee, 'niveau'),
    ],
  } satisfies Table<Resultat>),
  table({
    fichier: 'essais.csv',
    description: 'Donnée brute : un essai par ligne (bilan et séances). Permet de recalculer toute métrique.',
    lignes: (s) => de<Essai>(s, 'essais'),
    colonnes: [
      col<Essai>('id', 'entier', 'Identifiant', (r) => r.id),
      col<Essai>('seance_id', 'texte', 'Séance, le cas échéant', (r) => r.seanceId),
      col<Essai>('bilan_id', 'texte', 'Partie de bilan, le cas échéant', (r) => r.bilanId),
      col<Essai>('exercice', 'texte', "Exercice ou épreuve", (r) => r.exerciceId),
      col<Essai>('item_id', 'texte', 'Item de contenu présenté (définition, carte…)', (r) => r.itemId),
      col<Essai>('date', 'date', 'Date locale', (r) => r.date),
      col<Essai>('horodatage', 'horodatage', "Enregistrement de l'essai (UTC)", (r) => r.horodatage),
      col<Essai>('niveau', 'décimal', "Niveau de difficulté de l'essai", (r) => r.niveau, 'niveau'),
      col<Essai>('stimulus', 'texte', 'Stimulus présenté', (r) => r.stimulus),
      col<Essai>('reponse', 'texte', 'Réponse donnée', (r) => r.reponse),
      col<Essai>('correcte', 'booléen', 'Réponse correcte ; vide si sans objet', (r) => r.correcte),
      col<Essai>('temps_reponse', 'décimal', "Temps de réponse depuis l'affichage", (r) => r.tempsReponseMs, 'ms'),
      col<Essai>('ecart_affichage', 'décimal', "Écart entre la durée d'affichage visée et la durée mesurée", (r) => r.ecartAffichageMs, 'ms'),
      col<Essai>('indice', 'texte', 'Indice utilisé : aucun, semantique ou syllabe', (r) => r.indice),
    ],
  } satisfies Table<Essai>),
  table({
    fichier: 'bilans.csv',
    description: 'Une ligne par partie de bilan.',
    lignes: (s) => de<Bilan>(s, 'bilans'),
    colonnes: [
      col<Bilan>('id', 'texte', 'Identifiant de la partie', (r) => r.id),
      col<Bilan>('groupe', 'texte', 'Identifiant commun aux deux parties du même bilan', (r) => r.groupe),
      col<Bilan>('date', 'date', 'Date locale', (r) => r.date),
      col<Bilan>('debut', 'horodatage', 'Début (UTC)', (r) => r.debut),
      col<Bilan>('fin', 'horodatage', 'Fin (UTC)', (r) => r.fin),
      col<Bilan>('forme', 'texte', 'Forme parallèle utilisée (A à D)', (r) => r.forme),
      col<Bilan>('partie', 'entier', 'Partie 1 ou 2', (r) => r.partie),
      col<Bilan>('appareil_id', 'texte', 'Appareil utilisé', (r) => r.appareilId),
    ],
  } satisfies Table<Bilan>),
  table({
    fichier: 'bilans_metriques.csv',
    description: 'Toutes les métriques des bilans, au format long (une ligne par métrique).',
    lignes: (s) => de<Bilan>(s, 'bilans').flatMap((b) => Object.entries(b.metriques).map(([cle, valeur]) => ({ bilan: b, cle, valeur }))),
    colonnes: [
      col<MetriqueBilan>('bilan_id', 'texte', 'Partie de bilan (voir bilans.csv)', (r) => r.bilan.id),
      col<MetriqueBilan>('date', 'date', 'Date locale', (r) => r.bilan.date),
      col<MetriqueBilan>('forme', 'texte', 'Forme parallèle', (r) => r.bilan.forme),
      col<MetriqueBilan>('metrique', 'texte', 'Épreuve et métrique, au format epreuve.metrique ; plainte.* : gêne ressentie de 1 à 5', (r) => r.cle),
      col<MetriqueBilan>('valeur', 'décimal', 'Valeur', (r) => r.valeur, 'voir unite'),
      col<MetriqueBilan>('unite', 'texte', 'Unité, pour les métriques principales des épreuves', (r) => UNITES_BILAN.get(r.cle) ?? (r.cle.startsWith('plainte.') ? '1 à 5' : null)),
    ],
  } satisfies Table<MetriqueBilan>),
  table({
    fichier: 'series_exercices.csv',
    description: "Valeurs calculées par l'application : par exercice et par jour, valeur brute, valeur lissée sur 7 jours et écart à la ligne de base.",
    lignes: valeursSeries,
    colonnes: [
      col<ValeurSerie>('exercice', 'texte', 'Exercice', (r) => r.exercice),
      col<ValeurSerie>('metrique', 'texte', 'Métrique', (r) => r.metrique),
      col<ValeurSerie>('unite', 'texte', 'Unité de la valeur', (r) => r.unite),
      col<ValeurSerie>('domaine', 'texte', 'Domaine', (r) => r.domaine),
      col<ValeurSerie>('date', 'date', 'Date locale', (r) => r.date),
      col<ValeurSerie>('valeur_brute', 'décimal', 'Valeur du jour (moyenne si plusieurs)', (r) => arrondi(r.brute), 'voir unite'),
      col<ValeurSerie>('valeur_lissee', 'décimal', 'Moyenne sur les 7 jours calendaires se terminant à cette date', (r) => arrondi(r.lissee), 'voir unite'),
      col<ValeurSerie>('ecart_ligne_de_base', 'décimal', "Écart de la valeur lissée à la ligne de base (bilan et 7 premières séances), orienté pour que positif = mieux", (r) => arrondi(r.ecart), 'écart-type'),
      col<ValeurSerie>('dans_score_domaine', 'booléen', 'La métrique entre dans le score du domaine', (r) => r.dansScore),
    ],
  } satisfies Table<ValeurSerie>),
  table({
    fichier: 'scores_domaines.csv',
    description: "Score de domaine calculé par l'application : moyenne des écarts de ses exercices (dernière valeur de moins de 7 jours).",
    lignes: valeursDomaines,
    colonnes: [
      col<ScoreDomaine>('date', 'date', 'Date locale', (r) => r.date),
      col<ScoreDomaine>('domaine', 'texte', 'Domaine', (r) => r.domaine),
      col<ScoreDomaine>('ecart_ligne_de_base', 'décimal', 'Écart moyen à la ligne de base, positif = mieux', (r) => r.ecart, 'écart-type'),
    ],
  } satisfies Table<ScoreDomaine>),
  table({
    fichier: 'episodes.csv',
    description: 'Journal des épisodes de manque du mot.',
    lignes: (s) => de<Episode>(s, 'episodes').sort((a, b) => (a.dateHeure < b.dateHeure ? -1 : 1)),
    colonnes: [
      col<Episode>('id', 'texte', 'Identifiant', (r) => r.id),
      col<Episode>('date_heure', 'horodatage', "Moment de l'épisode (UTC)", (r) => r.dateHeure),
      col<Episode>('date', 'date', 'Date locale', (r) => dateDe(r)),
      col<Episode>('heure', 'entier', 'Heure locale (0 à 23)', (r) => new Date(r.dateHeure).getHours(), 'h'),
      col<Episode>('situation', 'texte', 'reunion, ecrit, telephone, echange-informel, presentation, autre', (r) => r.situation),
      col<Episode>('interlocuteur', 'texte', 'hierarchie, pairs, partenaires, public, proches, autre', (r) => r.interlocuteur),
      col<Episode>('enjeu', 'entier', 'Enjeu de la situation, de 1 (faible) à 5 (fort)', (r) => r.enjeu, '1 à 5'),
      col<Episode>('fatigue', 'entier', 'Fatigue à ce moment, de 1 à 5', (r) => r.fatigue, '1 à 5'),
      col<Episode>('mot_cherche', 'texte', 'Mot cherché, s\'il est revenu', (r) => r.motCherche),
      col<Episode>('mot_produit', 'texte', 'Mot employé à la place', (r) => r.motProduit),
      col<Episode>('strategie', 'texte', 'Stratégie employée (identifiant de fiche ou texte libre)', (r) => r.strategie),
      col<Episode>('issue', 'texte', 'immediate (retrouvé vite), differee (plus tard), non-retrouve', (r) => r.issue),
      col<Episode>('notes', 'texte', 'Notes libres', (r) => r.notes),
    ],
  } satisfies Table<Episode>),
  table({
    fichier: 'cartes.csv',
    description: 'Cartes de répétition espacée (algorithme SM-2) et leur état.',
    lignes: (s) => de<Carte>(s, 'cartes'),
    colonnes: [
      col<Carte>('id', 'texte', 'Identifiant', (r) => r.id),
      col<Carte>('paquet', 'texte', 'Paquet (série de contenu, ou journal pour les mots personnels)', (r) => r.paquet),
      col<Carte>('item_id', 'texte', 'Item de contenu', (r) => r.itemId),
      col<Carte>('facilite', 'décimal', 'Facteur de facilité SM-2 (1,3 au minimum)', (r) => r.etat.facilite),
      col<Carte>('intervalle', 'entier', 'Intervalle courant', (r) => r.etat.intervalle, 'jours'),
      col<Carte>('repetitions', 'entier', 'Réussites consécutives', (r) => r.etat.repetitions),
      col<Carte>('echeance', 'date', 'Prochaine révision', (r) => r.etat.echeance),
      col<Carte>('echecs', 'entier', "Nombre d'échecs cumulés", (r) => r.etat.echecs),
      col<Carte>('derniere_revision', 'date', 'Dernière révision', (r) => r.etat.derniereRevision),
      col<Carte>('mot_personnel', 'texte', 'Mot issu du journal, le cas échéant', (r) => r.perso?.mot),
      col<Carte>('indice_personnel', 'texte', 'Indice noté pour ce mot', (r) => r.perso?.indice),
    ],
  } satisfies Table<Carte>),
  table({
    fichier: 'confusions.csv',
    description: 'Paires de mots confondues dans les exercices de discrimination.',
    lignes: (s) => de<Confusion>(s, 'confusions'),
    colonnes: [
      col<Confusion>('attendu', 'texte', 'Mot attendu', (r) => r.attendu),
      col<Confusion>('choisi', 'texte', 'Mot choisi à tort', (r) => r.choisi),
      col<Confusion>('erreurs', 'entier', "Nombre d'erreurs", (r) => r.erreurs),
      col<Confusion>('derniere', 'date', 'Dernière occurrence', (r) => r.derniere),
    ],
  } satisfies Table<Confusion>),
  table({
    fichier: 'escaliers.csv',
    description: "État de l'escalier adaptatif (règle 3 réussites / 1 échec) de chaque exercice.",
    lignes: (s) => de<EscalierEnregistre>(s, 'escaliers'),
    colonnes: [
      col<EscalierEnregistre>('exercice', 'texte', 'Exercice', (r) => r.exerciceId),
      col<EscalierEnregistre>('niveau', 'entier', 'Niveau courant', (r) => r.etat.niveau, 'niveau'),
      col<EscalierEnregistre>('niveau_max', 'entier', 'Niveau maximal', (r) => r.etat.niveauMax, 'niveau'),
      col<EscalierEnregistre>('essais', 'entier', "Nombre d'essais cumulés", (r) => r.etat.essais),
      col<EscalierEnregistre>('inversions', 'liste', 'Niveaux des dernières inversions', (r) => r.etat.inversions),
    ],
  } satisfies Table<EscalierEnregistre>),
  table({
    fichier: 'rappels.csv',
    description: 'Rappels différés des listes apprises.',
    lignes: (s) => de<RappelDiffere>(s, 'rappels'),
    colonnes: [
      col<RappelDiffere>('id', 'texte', 'Identifiant', (r) => r.id),
      col<RappelDiffere>('liste', 'texte', 'Liste et longueur, au format item:longueur', (r) => r.listeId),
      col<RappelDiffere>('appris_le', 'date', "Date d'apprentissage", (r) => r.apprisLe),
      col<RappelDiffere>('echeance', 'date', 'Date prévue du rappel', (r) => r.echeance),
      col<RappelDiffere>('statut', 'texte', 'en-attente, fait ou expire', (r) => r.statut),
    ],
  } satisfies Table<RappelDiffere>),
  table({
    fichier: 'annotations.csv',
    description: 'Événements datés saisis par vous et portés sur les courbes.',
    lignes: (s) => de<Annotation>(s, 'annotations'),
    colonnes: [
      col<Annotation>('date', 'date', 'Date', (r) => r.date),
      col<Annotation>('texte', 'texte', 'Texte saisi', (r) => r.texte),
    ],
  } satisfies Table<Annotation>),
  table({
    fichier: 'appareils.csv',
    description: "Appareils utilisés et leur profil d'affichage, mesuré au premier usage.",
    lignes: (s) => de<Appareil>(s, 'appareils'),
    colonnes: [
      col<Appareil>('id', 'texte', 'Identifiant', (r) => r.id),
      col<Appareil>('cree_le', 'horodatage', 'Premier usage (UTC)', (r) => r.creeLe),
      col<Appareil>('navigateur', 'texte', 'Chaîne d\'identification du navigateur', (r) => r.userAgent),
      col<Appareil>('largeur_ecran', 'entier', "Largeur de l'écran", (r) => r.largeurEcran, 'px CSS'),
      col<Appareil>('hauteur_ecran', 'entier', "Hauteur de l'écran", (r) => r.hauteurEcran, 'px CSS'),
      col<Appareil>('frequence', 'décimal', "Fréquence de rafraîchissement mesurée", (r) => r.frequenceHz, 'Hz'),
      col<Appareil>('gigue', 'décimal', 'Écart-type des intervalles entre images', (r) => r.gigueMs, 'ms'),
    ],
  } satisfies Table<Appareil>),
  table({
    fichier: 'lieux.csv',
    description: 'Parcours définis pour la méthode des lieux.',
    lignes: (s) => de<Lieu>(s, 'lieux'),
    colonnes: [
      col<Lieu>('id', 'texte', 'Identifiant', (r) => r.id),
      col<Lieu>('nom', 'texte', 'Nom du parcours', (r) => r.nom),
      col<Lieu>('etapes', 'liste', 'Étapes, dans l\'ordre', (r) => r.etapes),
    ],
  } satisfies Table<Lieu>),
  table({
    fichier: 'reglages.csv',
    description: "Réglages de l'application au moment de l'export.",
    lignes: (s) => Object.entries(completerReglages(de<Reglages>(s, 'reglages')[0]) as unknown as Record<string, unknown>)
      .filter(([cle]) => cle !== 'id')
      .map(([cle, valeur]) => ({ cle, valeur: typeof valeur === 'object' && valeur !== null ? JSON.stringify(valeur) : valeur })),
    colonnes: [
      col<Reglage>('cle', 'texte', 'Nom du réglage', (r) => r.cle),
      col<Reglage>('valeur', 'texte', 'Valeur (objet au format JSON)', (r) => r.valeur),
    ],
  } satisfies Table<Reglage>),
  table({
    fichier: 'meta.csv',
    description: 'Informations techniques (versions, marqueurs du journal).',
    lignes: (s) => de<Meta>(s, 'meta'),
    colonnes: [
      col<Meta>('cle', 'texte', 'Clé', (r) => r.cle),
      col<Meta>('valeur', 'texte', 'Valeur', (r) => r.valeur),
    ],
  } satisfies Table<Meta>),
];

/* ---------- Dictionnaire et notice ---------- */

interface LigneDictionnaire { fichier: string; colonne: string; type: TypeColonne; unite: string; description: string }

export function dictionnaire(): string {
  const lignes: LigneDictionnaire[] = TABLES.flatMap((t) =>
    t.colonnes.map((c) => ({ fichier: t.fichier, colonne: c.nom, type: c.type, unite: c.unite ?? '', description: c.description })),
  );
  return versCsv<LigneDictionnaire>([
    col('fichier', 'texte', '', (r) => r.fichier),
    col('colonne', 'texte', '', (r) => r.colonne),
    col('type', 'texte', '', (r) => r.type),
    col('unite', 'texte', '', (r) => r.unite),
    col('description', 'texte', '', (r) => r.description),
  ], lignes);
}

export function notice(s: Sauvegarde): string {
  const fichiers = TABLES.map((t) => `- ${t.fichier} : ${t.description}`).join('\n');
  return `LEXIQUE : EXPORT DES DONNÉES
Exporté le ${new Date(s.exporteeLe).toLocaleString('fr-FR')} (schéma de données version ${s.versionSchema}).

Lexique est une application d'entraînement cognitif à usage personnel. Elle n'est pas un dispositif
médical : ses mesures sont des repères internes, comparés uniquement à la ligne de base de la
personne, sans norme de population.

CONTENU
${fichiers}
- dictionnaire.csv : type, unité et description de chaque colonne de chaque fichier.

CONVENTIONS
- Encodage UTF-8 ; séparateur virgule ; point décimal (format RFC 4180).
- Dates locales au format AAAA-MM-JJ ; horodatages ISO 8601 en temps universel (UTC).
- Booléens : 1 (vrai) ou 0 (faux). Valeur absente : cellule vide. Listes : éléments séparés par « | ».
- Unités en ms : une valeur plus basse est meilleure. Autres unités : une valeur plus haute est meilleure.
- Écart à la ligne de base : (moyenne lissée sur 7 jours − moyenne de référence) / écart-type de
  référence, orienté pour que positif = mieux ; la référence réunit les 7 premières séances de
  l'exercice et, quand elle mesure la même grandeur, la valeur du bilan. Détails dans METHODE.md
  du dépôt de l'application.

OUVRIR DANS EXCEL (réglages français)
Données > À partir d'un fichier texte/CSV, puis choisir « Virgule » comme séparateur et le point
comme séparateur décimal. R : read.csv(fichier, encoding = "UTF-8"). Python : pandas.read_csv(fichier).
`;
}

export function fichiersArchive(s: Sauvegarde): FichierZip[] {
  return [
    { nom: 'LISEZMOI.txt', contenu: notice(s).replace(/\n/g, '\r\n') },
    { nom: 'dictionnaire.csv', contenu: dictionnaire() },
    ...TABLES.map((t) => ({ nom: t.fichier, contenu: versCsv(t.colonnes, t.lignes(s)) })),
  ];
}

export function archiveCsv(s: Sauvegarde): Uint8Array<ArrayBuffer> {
  return creerZip(fichiersArchive(s), new Date(s.exporteeLe));
}

export function nomArchive(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `lexique-donnees-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.zip`;
}
