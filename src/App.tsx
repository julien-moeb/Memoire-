import { FournisseurApp, useApp } from './etat/contexte';
import { useRoute } from './etat/routeur';
import { BarreOnglets } from './ui/BarreOnglets';
import { Accueil } from './pages/Accueil';
import { Methode } from './pages/Methode';
import { Reglages } from './pages/Reglages';
import { Affichage } from './pages/Affichage';
import { Bientot } from './pages/Bientot';
import { lazy, Suspense } from 'react';

const PageSeance = lazy(() => import('./pages/Seance').then((m) => ({ default: m.PageSeance })));
const PageBilan = lazy(() => import('./pages/Bilan').then((m) => ({ default: m.PageBilan })));

function Ecran() {
  const route = useRoute();
  const { pret, concentration } = useApp();
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
        return (
          <Suspense fallback={<p className="p-8 text-center text-texte-2" role="status">Chargement…</p>}>
            <PageBilan />
          </Suspense>
        );
      case '/seance':
        return (
          <Suspense fallback={<p className="p-8 text-center text-texte-2" role="status">Chargement…</p>}>
            <PageSeance />
          </Suspense>
        );
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
      {!concentration && <BarreOnglets route={route} />}
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
