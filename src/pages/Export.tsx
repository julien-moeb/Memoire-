/** Export : archive CSV pour un professionnel, synthèse imprimable, sauvegarde complète. */
import { useEffect, useState } from 'react';
import { Bandeau, GrandTitre, ListeGroupee, Ligne, Page } from '../ui/composants';
import { useApp } from '../etat/contexte';
import { lien } from '../etat/routeur';
import { exporterTout, nomFichierSauvegarde } from '../stockage/sauvegarde';
import { archiveCsv, nomArchive } from '../export/csv';
import { telecharger } from '../export/telecharger';

export function Export() {
  const { db, modifierReglages } = useApp();
  const [message, setMessage] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<{ seances: number; essais: number; episodes: number } | null>(null);

  useEffect(() => {
    if (!db) return;
    void Promise.all([db.count('seances'), db.count('essais'), db.count('episodes')]).then(([seances, essais, episodes]) => setVolumes({ seances, essais, episodes }));
  }, [db]);

  if (!db) return <Page><GrandTitre>Export</GrandTitre><Bandeau ton="attention">Le stockage local est indisponible.</Bandeau></Page>;

  const csv = async () => {
    const zip = archiveCsv(await exporterTout(db));
    telecharger(nomArchive(), zip, 'application/zip');
    setMessage('Archive enregistrée dans vos téléchargements.');
  };
  const sauvegarde = async () => {
    telecharger(nomFichierSauvegarde(), JSON.stringify(await exporterTout(db)), 'application/json');
    await modifierReglages({ derniereSauvegarde: new Date().toISOString() });
    setMessage('Sauvegarde enregistrée dans vos téléchargements.');
  };

  return (
    <Page>
      <GrandTitre sousTitre="Vos données">Export</GrandTitre>
      <p className="px-1 text-[0.9375rem] leading-relaxed text-texte-2">
        Vos données ne quittent l'appareil que par ces fichiers, que vous transmettez vous-même.
        {volumes && ` Actuellement : ${volumes.seances} séance(s), ${volumes.essais} essai(s), ${volumes.episodes} épisode(s) du journal.`}
      </p>

      <ListeGroupee titre="Pour un professionnel" pied="L'archive contient un fichier par type de données, vos courbes calculées, un dictionnaire décrivant chaque colonne et son unité, et une notice. Elle s'ouvre avec un tableur ou un logiciel de statistiques.">
        <Ligne libelle={<span className="text-accent">Archive CSV</span>} detail="Fichier .zip, toutes les données brutes et calculées" onClick={() => void csv()} />
        <Ligne libelle="Synthèse de deux pages" detail="À imprimer ou à enregistrer en PDF" href={lien('/synthese')} />
      </ListeGroupee>

      <ListeGroupee titre="Pour vous" pied="La sauvegarde complète se réimporte sur un autre appareil depuis les Réglages. Une sauvegarde mensuelle est recommandée.">
        <Ligne libelle={<span className="text-accent">Sauvegarde complète</span>} detail="Fichier .json, réimportable" onClick={() => void sauvegarde()} />
        <Ligne libelle="Importer une sauvegarde" detail="Dans les Réglages" href={lien('/reglages')} />
      </ListeGroupee>

      {message && <div className="mt-4"><Bandeau>{message}</Bandeau></div>}
    </Page>
  );
}
