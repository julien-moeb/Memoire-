import { Anneaux } from '../ui/Anneaux';
import { Bandeau, Carte, GrandTitre, ListeGroupee, Ligne, Page } from '../ui/composants';
import { useApp } from '../etat/contexte';
import { lien } from '../etat/routeur';
import { useEffect, useState } from 'react';
import { lireBilans, prochainBilanConseille, type BilanComplet } from '../bilan/historique';
import { dateLocale, formatDate } from '../moteur/dates';
import { minutesDuJour, OBJECTIF_MINUTES, serieEnCours, type EtatSerie } from '../suivi/calculs';
import { journalRenseigne } from '../suivi/journal';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function Accueil() {
  const { reglages, modeDegrade, db } = useApp();
  const [bilans, setBilans] = useState<BilanComplet[] | null>(null);
  const [seanceDuJour, setSeanceDuJour] = useState<'aucune' | 'en-cours' | 'faite'>('aucune');
  const [minutes, setMinutes] = useState(0);
  const [journal, setJournal] = useState(false);
  const [serie, setSerie] = useState<EtatSerie>({ jours: 0, reprise: false });
  useEffect(() => {
    void lireBilans(db).then(setBilans);
    if (!db) return;
    const aujourdhui = dateLocale();
    void (async () => {
      const seances = await db.getAll('seances');
      const duJour = seances.filter((x) => x.date === aujourdhui);
      setSeanceDuJour(duJour.some((x) => x.fin) ? 'faite' : duJour.length ? 'en-cours' : 'aucune');
      setMinutes(minutesDuJour(seances, aujourdhui));
      setSerie(serieEnCours(seances.filter((x) => x.fin).map((x) => x.date), aujourdhui, reglages.jourRepos));
      setJournal(await journalRenseigne(db, aujourdhui));
    })();
  }, [db, reglages.jourRepos]);
  const enCours = bilans?.find((b) => !b.complet) ?? null;
  const bilanFait = bilans?.some((b) => b.complet) ?? false;
  const prochain = bilans ? prochainBilanConseille(bilans) : null;
  const detailBilan = enCours
    ? 'Partie 2 à réaliser'
    : bilanFait
      ? `Réalisé ; prochain conseillé le ${prochain ? formatDate(prochain) : '…'}`
      : "Deux parties d'environ 13 minutes, sur deux jours";
  const aujourdhui = new Date();
  const dateLongue = aujourdhui.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const jourDeRepos = aujourdhui.getDay() === reglages.jourRepos;

  return (
    <Page>
      <GrandTitre sousTitre={dateLongue}>Aujourd'hui</GrandTitre>

      {modeDegrade && (
        <div className="mb-4">
          <Bandeau ton="attention">
            Le stockage local de ce navigateur est indisponible (navigation privée ou réglage restrictif). Les résultats ne
            pourraient pas être conservés : ouvrez Lexique dans une fenêtre normale.
          </Bandeau>
        </div>
      )}

      <Carte>
        <Anneaux
          anneaux={[
            { libelle: 'Séance', valeur: seanceDuJour === 'faite' ? 1 : seanceDuJour === 'en-cours' ? 0.5 : 0, couleur: 'var(--c-anneau-1)', detail: seanceDuJour === 'faite' ? 'Réalisée' : seanceDuJour === 'en-cours' ? 'Commencée' : 'Pas encore réalisée' },
            { libelle: 'Entraînement', valeur: minutes / OBJECTIF_MINUTES, couleur: 'var(--c-anneau-2)', detail: `${minutes} sur ${OBJECTIF_MINUTES} min` },
            { libelle: 'Journal', valeur: journal ? 1 : 0, couleur: 'var(--c-anneau-3)', detail: journal ? 'Renseigné' : 'Non renseigné' },
          ]}
        />
        {serie.jours >= 2 && <p className="mt-4 text-[0.9375rem] text-texte-2">{serie.jours} jours d'entraînement d'affilée, jours de repos non comptés.</p>}
        {serie.reprise && !jourDeRepos && seanceDuJour !== 'faite' && <p className="mt-4 text-[0.9375rem] text-texte-2">Reprise à votre rythme.</p>}
      </Carte>

      {jourDeRepos && (
        <div className="mt-4">
          <Bandeau>
            Aujourd'hui est votre jour de repos ({JOURS[reglages.jourRepos]}). La consolidation fait aussi partie de
            l'entraînement ; le journal et les fiches restent accessibles.
          </Bandeau>
        </div>
      )}

      <ListeGroupee titre="Programme" pied="Le bilan initial établit votre ligne de base personnelle ; la séance quotidienne en dépend.">
        <Ligne libelle={bilanFait ? 'Bilan et profil' : 'Bilan initial'} detail={detailBilan} href={lien('/bilan')} />
        <Ligne
          libelle="Séance du jour"
          detail={
            !bilanFait ? 'Disponible après le bilan initial'
            : jourDeRepos ? 'Jour de repos'
            : seanceDuJour === 'faite' ? 'Faite aujourd’hui'
            : seanceDuJour === 'en-cours' ? 'Commencée : reprendre'
            : 'À faire aujourd’hui'
          }
          href={bilanFait ? lien('/seance') : undefined}
          desactive={!bilanFait}
        />
      </ListeGroupee>

      <ListeGroupee titre="Au quotidien">
        <Ligne libelle="Journal" detail={journal ? 'Renseigné aujourd’hui' : 'Un mot vous a échappé ? Notez-le'} href={lien('/journal')} />
        <Ligne libelle="Fiches de stratégies" detail="Compenser pendant l'échange, se préparer" href={lien('/fiches')} />
        <Ligne libelle="Respiration lente" detail="Deux à cinq minutes" href={lien('/respiration')} />
      </ListeGroupee>

      <ListeGroupee titre="Comprendre">
        <Ligne libelle="Méthode et limites" detail="Références, niveau de preuve, avertissement" href={lien('/methode')} />
        <Ligne libelle="Exporter mes données" detail="Archive CSV, synthèse imprimable, sauvegarde" href={lien('/export')} />
      </ListeGroupee>
    </Page>
  );
}
