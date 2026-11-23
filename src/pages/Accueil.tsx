import { Anneaux } from '../ui/Anneaux';
import { Bandeau, Carte, GrandTitre, ListeGroupee, Ligne, Page } from '../ui/composants';
import { useApp } from '../etat/contexte';
import { lien } from '../etat/routeur';

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function Accueil() {
  const { reglages, modeDegrade } = useApp();
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
            { libelle: 'Séance', valeur: 0, couleur: 'var(--c-anneau-1)', detail: 'Pas encore réalisée' },
            { libelle: 'Entraînement', valeur: 0, couleur: 'var(--c-anneau-2)', detail: '0 sur 18 min' },
            { libelle: 'Journal', valeur: 0, couleur: 'var(--c-anneau-3)', detail: 'Non renseigné' },
          ]}
        />
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
        <Ligne libelle="Bilan initial" detail="Deux parties d'environ 13 minutes, sur deux jours" href={lien('/bilan')} />
        <Ligne libelle="Séance du jour" detail="Disponible après le bilan initial" desactive />
      </ListeGroupee>

      <ListeGroupee titre="Comprendre">
        <Ligne libelle="Méthode et limites" detail="Références, niveau de preuve, avertissement" href={lien('/methode')} />
      </ListeGroupee>
    </Page>
  );
}
