/** Contrôles de cohérence au-delà du schéma : partagés par le script de validation et les tests. */
import { serie, type Serie } from './schemas';
import { normaliser, sansAccents } from '../moteur/saisie-libre';

export interface Fichier {
  chemin: string;
  donnees: unknown;
}

export interface Anomalie {
  chemin: string;
  message: string;
}

function contientMot(texte: string, mot: string): boolean {
  const t = sansAccents(normaliser(texte));
  const m = sansAccents(normaliser(mot));
  if (m.length < 3) return false;
  return new RegExp(`(^|[^\\p{L}])${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(t);
}

/** Items identifiés d'une série (les séries de décision lexicale n'en ont pas). */
export function itemsDe(s: Serie): readonly { id: string }[] {
  if (s.type === 'forme-bilan') return s.definitions;
  if (s.type === 'decision-lexicale') return [];
  return s.items;
}

/** Nombre d'unités de contenu, pour le récapitulatif de validation. */
export function tailleDe(s: Serie): number {
  if (s.type === 'decision-lexicale') return s.mots.length + s.pseudoMots.length;
  return itemsDe(s).length;
}

export function verifierContenu(fichiers: readonly Fichier[]): { series: Serie[]; anomalies: Anomalie[] } {
  const anomalies: Anomalie[] = [];
  const series: Serie[] = [];
  const ids = new Map<string, string>();

  const enregistrerId = (id: string, chemin: string) => {
    const deja = ids.get(id);
    if (deja) anomalies.push({ chemin, message: `Identifiant « ${id} » déjà utilisé dans ${deja}.` });
    else ids.set(id, chemin);
  };

  for (const { chemin, donnees } of fichiers) {
    const r = serie.safeParse(donnees);
    if (!r.success) {
      for (const e of r.error.issues) {
        const ou = e.path.length ? e.path.join(' › ') : 'racine';
        anomalies.push({ chemin, message: `${ou} : ${e.message}` });
      }
      continue;
    }
    const s = r.data;
    series.push(s);
    enregistrerId(s.id, chemin);
    for (const item of itemsDe(s)) enregistrerId(item.id, chemin);

    if (s.type === 'forme-bilan') {
      const doublons = (mots: readonly string[]) => mots.filter((m, i) => mots.findIndex((x) => normaliser(x) === normaliser(m)) !== i);
      const tous = [...s.liste, ...s.decisionLexicale.mots, ...s.decisionLexicale.pseudoMots];
      for (const d of doublons(s.liste)) anomalies.push({ chemin, message: `Mot répété dans la liste : « ${d} ».` });
      for (const d of doublons(tous).filter((m) => !doublons(s.liste).includes(m))) {
        anomalies.push({ chemin, message: `Mot présent deux fois entre la liste et la décision lexicale : « ${d} ».` });
      }
      const lettre = sansAccents(normaliser(s.fluencePhonemique.cle));
      const fautifs = s.fluencePhonemique.reference.filter((m) => !sansAccents(normaliser(m)).startsWith(lettre));
      if (fautifs.length) anomalies.push({ chemin, message: `Fluence phonémique : mots hors lettre : ${fautifs.join(', ')}.` });
    }

    const definitions = s.type === 'definition-mot' ? s.items : s.type === 'forme-bilan' ? s.definitions : [];
    {
      for (const it of definitions) {
        for (const forme of [it.reponse, ...it.variantes]) {
          if (contientMot(it.definition, forme)) {
            anomalies.push({ chemin, message: `${it.id} : la définition contient la réponse « ${forme} ».` });
          }
        }
        if (!normaliser(it.reponse).startsWith(normaliser(it.indices.syllabe))) {
          anomalies.push({ chemin, message: `${it.id} : l'indice syllabique « ${it.indices.syllabe} » n'est pas le début de « ${it.reponse} ».` });
        }
        if (contientMot(it.indices.trait, it.reponse)) {
          anomalies.push({ chemin, message: `${it.id} : l'indice sémantique dévoile la réponse.` });
        }
      }
    }
    if (s.type === 'discrimination') {
      for (const it of s.items) {
        if (!it.options.some((o) => normaliser(o) === normaliser(it.reponse))) {
          anomalies.push({ chemin, message: `${it.id} : la réponse « ${it.reponse} » ne figure pas parmi les options.` });
        }
        if (!it.phrase.includes('___')) anomalies.push({ chemin, message: `${it.id} : la phrase doit contenir « ___ ».` });
        if (new Set(it.options.map((o) => normaliser(o))).size !== it.options.length) {
          anomalies.push({ chemin, message: `${it.id} : options en double.` });
        }
      }
    }
    if (s.type === 'intrus') {
      for (const it of s.items) {
        if (!it.mots.some((m) => normaliser(m) === normaliser(it.intrus))) {
          anomalies.push({ chemin, message: `${it.id} : l'intrus « ${it.intrus} » ne figure pas parmi les mots.` });
        }
      }
    }
    if (s.type === 'liste-memoire') {
      for (const it of s.items) {
        const vus = new Set<string>();
        for (const m of it.mots) {
          const k = normaliser(m);
          if (vus.has(k)) anomalies.push({ chemin, message: `${it.id} : mot répété « ${m} ».` });
          vus.add(k);
        }
      }
    }
    if (s.type === 'decision-lexicale') {
      const mots = new Set(s.mots.map((m) => normaliser(m)));
      const communs = s.pseudoMots.filter((p) => mots.has(normaliser(p)));
      if (communs.length) anomalies.push({ chemin, message: `Présents à la fois comme mots et pseudo-mots : ${communs.join(', ')}.` });
    }
    if (s.type === 'fluence') {
      // (contrôle des fluences d'entraînement)
      for (const it of s.items) {
        if (it.modalite === 'phonemique') {
          const lettre = sansAccents(normaliser(it.cle));
          const fautifs = it.reference.filter((m) => !sansAccents(normaliser(m)).startsWith(lettre));
          if (fautifs.length) {
            anomalies.push({ chemin, message: `${it.id} : mots ne commençant pas par « ${it.cle} » : ${fautifs.join(', ')}.` });
          }
        }
      }
    }
  }
  // Les items du bilan ne doivent jamais apparaître en entraînement (ni entre deux formes).
  const reponses = new Map<string, string>();
  for (const s of series) {
    const defs = s.type === 'definition-mot' ? s.items : s.type === 'forme-bilan' ? s.definitions : [];
    for (const d of defs) {
      const k = sansAccents(normaliser(d.reponse));
      const deja = reponses.get(k);
      if (deja) anomalies.push({ chemin: s.id, message: `Réponse « ${d.reponse} » déjà utilisée dans ${deja}.` });
      else reponses.set(k, s.id);
    }
  }
  const listes = series.filter((s) => s.type === 'forme-bilan');
  const vusListe = new Map<string, string>();
  for (const f of listes) {
    for (const m of f.liste) {
      const k = sansAccents(normaliser(m));
      const deja = vusListe.get(k);
      if (deja) anomalies.push({ chemin: f.id, message: `Mot de liste « ${m} » déjà présent dans ${deja}.` });
      else vusListe.set(k, f.id);
    }
  }
  // Les mots du bilan ne doivent pas être entraînés ailleurs : traits, listes, décision lexicale, cartes.
  const reserves = new Map<string, string>();
  for (const f of listes) {
    for (const m of [...f.liste, ...f.definitions.map((d) => d.reponse), ...f.decisionLexicale.mots, ...f.decisionLexicale.pseudoMots]) {
      reserves.set(sansAccents(normaliser(m)), f.id);
    }
  }
  const signalerReserve = (chemin: string, mot: string) => {
    const f = reserves.get(sansAccents(normaliser(mot)));
    if (f) anomalies.push({ chemin, message: `« ${mot} » est réservé au bilan (${f}).` });
  };
  for (const s of series) {
    if (s.type === 'traits') for (const it of s.items) signalerReserve(it.id, it.mot);
    if (s.type === 'liste-memoire') for (const it of s.items) for (const m of it.mots) signalerReserve(it.id, m);
    if (s.type === 'decision-lexicale') for (const m of [...s.mots, ...s.pseudoMots]) signalerReserve(s.id, m);
    if (s.type === 'carte-lexique') for (const it of s.items) signalerReserve(it.id, it.reponse);
  }

  // Les catégories et lettres de fluence du bilan restent réservées au bilan.
  const clesBilan = new Map<string, string>();
  for (const f of listes) {
    for (const fl of [f.fluenceSemantique, f.fluencePhonemique]) clesBilan.set(sansAccents(normaliser(fl.cle)), f.id);
  }
  for (const s of series) {
    if (s.type !== 'fluence') continue;
    for (const it of s.items) {
      const deja = clesBilan.get(sansAccents(normaliser(it.cle)));
      if (deja) anomalies.push({ chemin: it.id, message: `Catégorie ou lettre « ${it.cle} » réservée au bilan (${deja}).` });
    }
  }
  return { series, anomalies };
}
