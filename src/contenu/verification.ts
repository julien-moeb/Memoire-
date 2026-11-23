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
    for (const item of s.items) enregistrerId(item.id, chemin);

    if (s.type === 'definition-mot') {
      for (const it of s.items) {
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
    if (s.type === 'fluence') {
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
  return { series, anomalies };
}
