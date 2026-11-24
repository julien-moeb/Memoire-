/** Routage par ancre (#/chemin) : GitHub Pages ne sait pas servir les routes profondes. */
import { useEffect, useState } from 'react';

export type Route =
  | '/' | '/bilan' | '/seance' | '/progression' | '/journal' | '/fiches' | '/respiration' | '/export' | '/synthese' | '/reglages' | '/reglages/affichage' | '/methode';

const ROUTES: readonly Route[] = [
  '/', '/bilan', '/seance', '/progression', '/journal', '/fiches', '/respiration', '/export', '/synthese', '/reglages', '/reglages/affichage', '/methode',
];

function lire(): Route {
  const h = window.location.hash.replace(/^#/, '') || '/';
  return (ROUTES as readonly string[]).includes(h) ? (h as Route) : '/';
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(lire);
  useEffect(() => {
    const maj = () => {
      setRoute(lire());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', maj);
    return () => window.removeEventListener('hashchange', maj);
  }, []);
  return route;
}

export const lien = (r: Route) => `#${r}`;

export function naviguer(r: Route) {
  window.location.hash = r;
}
