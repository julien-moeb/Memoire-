/** Sauvegarde complète en un fichier JSON, et import sur un autre appareil. */
import { MAGASINS, VERSION_SCHEMA, type Base, type NomMagasin } from './db';

export const FORMAT_SAUVEGARDE = 'lexique-sauvegarde';

export interface Sauvegarde {
  format: typeof FORMAT_SAUVEGARDE;
  versionSchema: number;
  exporteeLe: string;
  magasins: Partial<Record<NomMagasin, unknown[]>>;
}

export async function exporterTout(db: Base, maintenant = new Date()): Promise<Sauvegarde> {
  const magasins: Sauvegarde['magasins'] = {};
  for (const nom of MAGASINS) {
    magasins[nom] = await db.getAll(nom);
  }
  return { format: FORMAT_SAUVEGARDE, versionSchema: VERSION_SCHEMA, exporteeLe: maintenant.toISOString(), magasins };
}

export class ErreurImport extends Error {}

export function verifierSauvegarde(donnees: unknown): Sauvegarde {
  if (typeof donnees !== 'object' || donnees === null) throw new ErreurImport("Le fichier n'est pas une sauvegarde Lexique.");
  const s = donnees as Partial<Sauvegarde>;
  if (s.format !== FORMAT_SAUVEGARDE) throw new ErreurImport("Le fichier n'est pas une sauvegarde Lexique.");
  if (typeof s.versionSchema !== 'number' || s.versionSchema > VERSION_SCHEMA) {
    throw new ErreurImport(
      "Cette sauvegarde provient d'une version plus récente de l'application. Mettez d'abord l'application à jour.",
    );
  }
  if (typeof s.magasins !== 'object' || s.magasins === null) throw new ErreurImport('La sauvegarde est incomplète.');
  for (const [nom, contenu] of Object.entries(s.magasins)) {
    if (!(MAGASINS as readonly string[]).includes(nom)) throw new ErreurImport(`Magasin inconnu dans la sauvegarde : ${nom}.`);
    if (!Array.isArray(contenu)) throw new ErreurImport(`Le magasin ${nom} est mal formé.`);
  }
  return s as Sauvegarde;
}

/**
 * Remplace intégralement les données locales par celles de la sauvegarde,
 * dans une seule transaction : en cas d'erreur, rien n'est modifié.
 */
export async function importerTout(db: Base, donnees: unknown): Promise<void> {
  const s = verifierSauvegarde(donnees);
  const tx = db.transaction([...MAGASINS], 'readwrite');
  for (const nom of MAGASINS) {
    const magasin = tx.objectStore(nom);
    await magasin.clear();
    for (const enreg of s.magasins[nom] ?? []) {
      await magasin.put(enreg as never);
    }
  }
  await tx.done;
}

export function nomFichierSauvegarde(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `lexique-sauvegarde-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}
