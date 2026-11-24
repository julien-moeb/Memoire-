import { useEffect, useRef, useState } from 'react';
import { Bandeau, Bouton, ControleSegmente, GrandTitre, ListeGroupee, Ligne, Page } from '../ui/composants';
import { useApp } from '../etat/contexte';
import { lien } from '../etat/routeur';
import { estimationStockage } from '../stockage/db';
import { telecharger } from '../export/telecharger';
import { exporterTout, importerTout, nomFichierSauvegarde, resumeSauvegarde, ErreurImport, type ResumeSauvegarde } from '../stockage/sauvegarde';
import type { Theme } from '../stockage/types';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function formaterOctets(n: number): string {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ko`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
}

export function Reglages() {
  const { reglages, modifierReglages, rechargerReglages, db, stockagePersistant, modeDegrade } = useApp();
  const [stockage, setStockage] = useState<{ utilise: number; quota: number } | null>(null);
  const [message, setMessage] = useState<{ texte: string; ton: 'info' | 'attention' } | null>(null);
  const [aImporter, setAImporter] = useState<{ nom: string; donnees: unknown; resume: ResumeSauvegarde } | null>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    estimationStockage().then(setStockage).catch(() => setStockage(null));
  }, []);

  const exporter = async () => {
    if (!db) return;
    const s = await exporterTout(db);
    telecharger(nomFichierSauvegarde(), JSON.stringify(s), 'application/json');
    await modifierReglages({ derniereSauvegarde: new Date().toISOString() });
    setMessage({ texte: 'Sauvegarde enregistrée dans vos téléchargements.', ton: 'info' });
  };

  const choisirFichier = async (fichier: File | undefined) => {
    if (!fichier) return;
    try {
      const donnees: unknown = JSON.parse(await fichier.text());
      setAImporter({ nom: fichier.name, donnees, resume: resumeSauvegarde(donnees) });
      setMessage(null);
    } catch (e) {
      setAImporter(null);
      setMessage({ texte: e instanceof ErreurImport ? e.message : "Ce fichier n'est pas lisible.", ton: 'attention' });
    }
    if (champFichier.current) champFichier.current.value = '';
  };

  const confirmerImport = async () => {
    if (!db || !aImporter) return;
    try {
      await importerTout(db, aImporter.donnees);
      await rechargerReglages();
      setMessage({ texte: 'Sauvegarde importée. Vos données ont été remplacées.', ton: 'info' });
    } catch (e) {
      setMessage({ texte: e instanceof ErreurImport ? e.message : "L'import a échoué ; aucune donnée n'a été modifiée.", ton: 'attention' });
    }
    setAImporter(null);
  };

  const derniere = reglages.derniereSauvegarde
    ? new Date(reglages.derniereSauvegarde).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Jamais';

  return (
    <Page>
      <GrandTitre>Réglages</GrandTitre>

      <ListeGroupee titre="Apparence">
        <li className="space-y-2 px-4 py-3">
          <p id="theme" className="text-[1.0625rem]">Thème</p>
          <ControleSegmente<Theme>
            libelle="Thème"
            valeur={reglages.theme}
            onChange={(theme) => modifierReglages({ theme })}
            options={[
              { valeur: 'auto', texte: 'Automatique' },
              { valeur: 'clair', texte: 'Clair' },
              { valeur: 'sombre', texte: 'Sombre' },
            ]}
          />
        </li>
        <li className="space-y-2 px-4 py-3">
          <p className="text-[1.0625rem]">Taille du texte</p>
          <ControleSegmente<number>
            libelle="Taille du texte"
            valeur={reglages.taillePolice}
            onChange={(taillePolice) => modifierReglages({ taillePolice })}
            options={[
              { valeur: 90, texte: <span className="text-[0.8rem]">A</span>, aria: 'Petite' },
              { valeur: 100, texte: <span className="text-[0.95rem]">A</span>, aria: 'Normale' },
              { valeur: 115, texte: <span className="text-[1.1rem]">A</span>, aria: 'Grande' },
              { valeur: 130, texte: <span className="text-[1.25rem]">A</span>, aria: 'Très grande' },
            ]}
          />
        </li>
      </ListeGroupee>

      <ListeGroupee titre="Programme" pied="Aucune séance n'est proposée ce jour-là : le repos fait partie de l'entraînement.">
        <li className="flex min-h-[44px] items-center justify-between px-4 py-2">
          <label htmlFor="jour-repos" className="text-[1.0625rem]">Jour de repos</label>
          <select
            id="jour-repos"
            value={reglages.jourRepos}
            onChange={(e) => modifierReglages({ jourRepos: Number(e.target.value) })}
            className="min-h-[44px] rounded-lg bg-transparent px-2 text-right text-[1.0625rem] text-texte-2"
          >
            {JOURS.map((j, i) => <option key={j} value={i}>{j}</option>)}
          </select>
        </li>
        <li className="flex min-h-[44px] items-center justify-between px-4 py-2">
          <label htmlFor="accents" className="text-[1.0625rem]">Tolérer les fautes d'accent</label>
          <input
            id="accents"
            type="checkbox"
            role="switch"
            checked={reglages.ignorerAccents}
            onChange={(e) => modifierReglages({ ignorerAccents: e.target.checked })}
            className="h-6 w-11 accent-[var(--c-accent)]"
          />
        </li>
        <li className="flex min-h-[44px] items-center justify-between px-4 py-2">
          <label htmlFor="oral" className="text-[1.0625rem]">Mode oral pour les exercices de mots</label>
          <input
            id="oral"
            type="checkbox"
            role="switch"
            checked={reglages.modeOral}
            onChange={(e) => modifierReglages({ modeOral: e.target.checked })}
            className="h-6 w-11 accent-[var(--c-accent)]"
          />
        </li>
      </ListeGroupee>

      <ListeGroupee titre="Mesure" pied="Vérifie la fréquence d'affichage de cet appareil et la régularité des images, dont dépendent les épreuves chronométrées.">
        <Ligne libelle="Mesure de l'affichage" href={lien('/reglages/affichage')} />
      </ListeGroupee>

      <ListeGroupee
        titre="Données"
        pied="Toutes vos données restent sur cet appareil. Une sauvegarde mensuelle est recommandée, notamment avant de changer d'appareil."
      >
        <Ligne libelle="Stockage persistant" valeur={modeDegrade ? 'Indisponible' : stockagePersistant ? 'Accordé' : stockagePersistant === false ? 'Refusé' : 'Inconnu'} />
        {stockage && <Ligne libelle="Espace utilisé" valeur={formaterOctets(stockage.utilise)} />}
        <Ligne libelle="Dernière sauvegarde" valeur={derniere} />
        <Ligne libelle="Exporter pour un professionnel" detail="Archive CSV et synthèse imprimable" href={lien('/export')} />
        <Ligne libelle={<span className="text-accent">Exporter une sauvegarde</span>} onClick={exporter} desactive={!db} />
        <Ligne libelle={<span className="text-accent">Importer une sauvegarde</span>} onClick={() => champFichier.current?.click()} desactive={!db} />
      </ListeGroupee>
      <input
        ref={champFichier}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Fichier de sauvegarde à importer"
        onChange={(e) => choisirFichier(e.target.files?.[0])}
      />

      {aImporter && (
        <div className="mt-4 space-y-3">
          <Bandeau ton="attention">
            L'import de « {aImporter.nom} » remplacera toutes les données de cet appareil. Exportez d'abord une sauvegarde si
            vous souhaitez les conserver.
            <span className="mt-2 block">
              Sauvegarde du {new Date(aImporter.resume.exporteeLe).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })} :{' '}
              {aImporter.resume.seances} séance(s), {aImporter.resume.bilans} partie(s) de bilan, {aImporter.resume.episodes} épisode(s)
              du journal, {aImporter.resume.cartes} carte(s) de révision.
            </span>
          </Bandeau>
          <div className="flex gap-3">
            <Bouton onClick={confirmerImport} className="flex-1">Remplacer mes données</Bouton>
            <Bouton variante="teinte" onClick={() => setAImporter(null)} className="flex-1">Annuler</Bouton>
          </div>
        </div>
      )}
      {message && (
        <div className="mt-4">
          <Bandeau ton={message.ton}>{message.texte}</Bandeau>
        </div>
      )}

      <ListeGroupee titre="À propos">
        <Ligne libelle="Méthode et limites" href={lien('/methode')} />
        <Ligne libelle="Version" valeur={__VERSION__} />
      </ListeGroupee>
    </Page>
  );
}
