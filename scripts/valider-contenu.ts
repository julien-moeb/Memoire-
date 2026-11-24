/**
 * Valide tout le contenu : npm run valider
 * Exécuté aussi avant chaque compilation et dans GitHub Actions : un fichier invalide bloque la publication.
 */
import { tailleDe, verifierContenu, type Fichier } from '../src/contenu/verification';
import { lireFichiersContenu } from './lire-contenu';

const lus = lireFichiersContenu();
const illisibles = lus.filter((f): f is { chemin: string; erreur: string } => 'erreur' in f);
const fichiers = lus.filter((f): f is Fichier => 'donnees' in f);
const { series, anomalies } = verifierContenu(fichiers);
const toutes = [...illisibles.map((f) => ({ chemin: f.chemin, message: f.erreur })), ...anomalies];

if (toutes.length) {
  console.error(`\n✗ ${toutes.length} anomalie(s) dans le contenu :\n`);
  for (const a of toutes) console.error(`  ${a.chemin}\n    ${a.message}\n`);
  process.exit(1);
}
const items = series.reduce((n, s) => n + tailleDe(s), 0);
console.log(`✓ Contenu valide : ${series.length} série(s), ${items} item(s).`);
