import { FournisseurApp, useApp } from './etat/contexte';
import { useRoute } from './etat/routeur';
import { BarreOnglets } from './ui/BarreOnglets';
import { Accueil } from './pages/Accueil';
import { Methode } from './pages/Methode';
import { Reglages } from './pages/Reglages';
import { Affichage } from './pages/Affichage';
import { Bientot } from './pages/Bientot';

function Ecran() {
  const route = useRoute();
  const { pret } = useApp();
  if (!pret) return <p className="p-8 text-center text-texte-2" role="status">Chargement…</p>;

  const page = (() => {
    switch (route) {
      case '/methode':
        return <Methode />;
      case '/reglages':
        return <Reglages />;
      case '/reglages/affichage':
        return <Affichage />;
      case '/bilan':
        return <Bientot titre="Bilan initial" texte="Le bilan évalue six domaines en deux parties d'environ 13 minutes. Il établit votre ligne de base personnelle, sans aucune comparaison à une norme." />;
      case '/seance':
        return <Bientot titre="Séance du jour" texte="La séance quotidienne dure environ 18 minutes et s'adapte à votre niveau pour maintenir près de 80 % de réussite." />;
      case '/progression':
        return <Bientot titre="Progression" texte="Vos courbes par domaine, lissées sur 7 jours, et la comparaison de vos bilans successifs apparaîtront ici." />;
      case '/journal':
        return <Bientot titre="Journal" texte="Vous pourrez consigner ici les épisodes de manque du mot, afin d'identifier vos situations à risque et d'entraîner les mots concernés." />;
      default:
        return <Accueil />;
    }
  })();

  return (
    <>
      <a href="#contenu" className="lien-evitement">Aller au contenu</a>
      <div key={route} className="pt-[env(safe-area-inset-top)]">{page}</div>
      <BarreOnglets route={route} />
    </>
  );
}

export function App() {
  return (
    <FournisseurApp>
      <Ecran />
    </FournisseurApp>
  );
}
