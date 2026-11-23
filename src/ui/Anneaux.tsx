import { motion, useReducedMotion } from 'framer-motion';

export interface Anneau {
  libelle: string;
  /** Progression de 0 à 1 (au-delà, l'anneau reste plein). */
  valeur: number;
  couleur: string;
  detail: string;
}

/** Anneaux de progression concentriques, inspirés de l'app Activité. */
export function Anneaux({ anneaux, taille = 148 }: { anneaux: readonly Anneau[]; taille?: number }) {
  const reduit = useReducedMotion();
  const epaisseur = taille * 0.11;
  const ecart = epaisseur * 0.18;
  const description = anneaux.map((a) => `${a.libelle} : ${a.detail}`).join(', ');

  return (
    <div className="flex items-center gap-6">
      <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} role="img" aria-label={description} className="shrink-0">
        {anneaux.map((a, i) => {
          const r = taille / 2 - epaisseur / 2 - i * (epaisseur + ecart);
          const c = 2 * Math.PI * r;
          const p = Math.min(1, Math.max(0, a.valeur));
          return (
            <g key={a.libelle} transform={`rotate(-90 ${taille / 2} ${taille / 2})`}>
              <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={a.couleur} strokeOpacity={0.2} strokeWidth={epaisseur} />
              <motion.circle
                cx={taille / 2}
                cy={taille / 2}
                r={r}
                fill="none"
                stroke={a.couleur}
                strokeWidth={epaisseur}
                strokeLinecap="round"
                strokeDasharray={c}
                initial={{ strokeDashoffset: reduit ? c * (1 - p) : c }}
                animate={{ strokeDashoffset: c * (1 - p) }}
                transition={reduit ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 18, delay: 0.1 * i }}
                opacity={p === 0 ? 0 : 1}
              />
            </g>
          );
        })}
      </svg>
      <dl className="space-y-2" aria-hidden="true">
        {anneaux.map((a) => (
          <div key={a.libelle}>
            <dt className="text-[0.875rem] font-semibold" style={{ color: a.couleur }}>
              {a.libelle}
            </dt>
            <dd className="text-[0.9375rem] text-texte-2">{a.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
