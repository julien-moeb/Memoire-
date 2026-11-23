import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Fichier } from '../src/contenu/verification';

export const RACINE_CONTENU = join(import.meta.dirname, '..', 'contenu');

export function lireFichiersContenu(dossier = RACINE_CONTENU): (Fichier | { chemin: string; erreur: string })[] {
  const resultats: (Fichier | { chemin: string; erreur: string })[] = [];
  const parcourir = (d: string) => {
    for (const nom of readdirSync(d)) {
      const complet = join(d, nom);
      const rel = relative(join(RACINE_CONTENU, '..'), complet);
      if (statSync(complet).isDirectory()) {
        if (nom !== 'schemas') parcourir(complet);
      } else if (nom.endsWith('.json')) {
        try {
          resultats.push({ chemin: rel, donnees: JSON.parse(readFileSync(complet, 'utf8')) });
        } catch (e) {
          resultats.push({ chemin: rel, erreur: `JSON illisible : ${(e as Error).message}` });
        }
      }
    }
  };
  parcourir(dossier);
  return resultats;
}
