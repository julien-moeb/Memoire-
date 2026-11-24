import type { ReactNode } from 'react';
import { lien, type Route } from '../etat/routeur';

const ONGLETS: { route: Route; texte: string; icone: ReactNode }[] = [
  {
    route: '/',
    texte: "Aujourd'hui",
    icone: <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />,
  },
  {
    route: '/progression',
    texte: 'Progression',
    icone: <path d="M4 18l5-6 4 3 7-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    route: '/journal',
    texte: 'Journal',
    icone: <path d="M6 4h10l2 2v14H6zM9 9h6M9 13h6M9 17h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  },
  {
    route: '/reglages',
    texte: 'Réglages',
    icone: (
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </g>
    ),
  },
];

export function BarreOnglets({ route }: { route: Route }) {
  const actif = (r: Route) =>
    r === '/' ? route === '/' : r === '/journal' ? ['/journal', '/fiches', '/respiration'].includes(route)
    : r === '/reglages' ? ['/reglages', '/reglages/affichage', '/export'].includes(route) : route.startsWith(r);
  return (
    <nav aria-label="Navigation principale" className="barre-translucide fixed inset-x-0 bottom-0 z-40 border-t border-separateur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {ONGLETS.map((o) => (
          <li key={o.route} className="flex-1">
            <a
              href={lien(o.route)}
              aria-current={actif(o.route) ? 'page' : undefined}
              className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium ${
                actif(o.route) ? 'text-accent' : 'text-texte-2'
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                {o.icone}
              </svg>
              {o.texte}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
