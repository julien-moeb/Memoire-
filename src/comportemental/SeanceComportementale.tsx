/**
 * Volet comportemental hebdomadaire (environ 10 minutes) : relecture de la semaine dans le journal,
 * une fiche de stratégie à essayer, puis régulation de l'activation par la respiration lente.
 * Il remplace les exercices ciblés un jour par semaine.
 */
import { useEffect, useState } from 'react';
import type { Base } from '../stockage/db';
import type { Episode } from '../stockage/types';
import { ajouterJours, type DateLocale } from '../moteur/dates';
import { Bouton } from '../ui/composants';
import { strategies } from '../seance/contenu';
import { SITUATIONS, syntheseJournal, type SyntheseJournal } from '../suivi/calculs';
import * as J from '../suivi/journal';
import { FicheDetail } from './Fiche';
import { Respiration } from './Respiration';

export const DUREE_RESPIRATION_SEANCE_MS = 3 * 60_000;

/** Fiche proposée : rotation dans l'ordre du fichier, selon le nombre de volets déjà réalisés. */
export function ficheDuVolet(rang: number) {
  const toutes = strategies();
  return toutes[rang % toutes.length]!;
}

export function SeanceComportementale({ db, date, onTerminer }: { db: Base; date: DateLocale; onTerminer: () => void }) {
  const [etape, setEtape] = useState<'semaine' | 'fiche' | 'respiration'>('semaine');
  const [synthese, setSynthese] = useState<SyntheseJournal | null>(null);
  const [rang, setRang] = useState<number | null>(null);
  const [situation, setSituation] = useState<Episode['situation'] | null>(null);

  useEffect(() => {
    (async () => {
      setSynthese(syntheseJournal(await J.lireEpisodes(db), ajouterJours(date, -6), date));
      const seances = await db.getAll('seances');
      setRang(seances.filter((s) => s.fin && s.blocsRealises.some((k) => k.endsWith(':comportemental'))).length);
    })();
  }, [db, date]);

  if (!synthese || rang === null) return <p className="p-8 text-center text-texte-2" role="status">Chargement…</p>;
  const fiche = ficheDuVolet(rang);
  const numero = etape === 'semaine' ? 1 : etape === 'fiche' ? 2 : 3;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-4">
      <p className="text-[0.8125rem] font-semibold tracking-wide text-texte-2 uppercase">Volet comportemental · {numero} sur 3</p>

      {etape === 'semaine' && (
        <>
          <h2 className="text-[1.5rem] font-bold">Votre semaine</h2>
          {synthese.total === 0 ? (
            <p className="text-[1.0625rem] leading-relaxed">
              Aucun épisode consigné ces sept derniers jours. Si des mots vous ont échappé, prenez un instant après la
              séance pour les noter dans le journal : ce sont ces mots qui deviennent vos cartes personnelles.
            </p>
          ) : (
            <div className="ombre-carte space-y-3 rounded-[18px] bg-surface p-5 text-[1.0625rem] leading-relaxed">
              <p>{synthese.total} épisode{synthese.total > 1 ? 's' : ''} consigné{synthese.total > 1 ? 's' : ''} ces sept derniers jours.</p>
              <p>
                Situations les plus fréquentes :{' '}
                {synthese.parSituation.filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 2).map((x) => `${x.libelle.toLowerCase()} (${x.n})`).join(', ')}.
              </p>
              <p>
                Mot revenu vite ou plus tard : {synthese.parIssue.slice(0, 2).reduce((n, x) => n + x.n, 0)} fois sur {synthese.total}.
              </p>
              <p className="text-[0.9375rem] text-texte-2">
                Demandez-vous ce que ces situations ont en commun (fatigue, enjeu, interlocuteur) : c'est là qu'une
                stratégie préparée sera la plus utile.
              </p>
            </div>
          )}
          <Bouton onClick={() => setEtape('fiche')}>Continuer</Bouton>
        </>
      )}

      {etape === 'fiche' && (
        <>
          <h2 className="text-[1.5rem] font-bold">Une stratégie pour la semaine</h2>
          <FicheDetail fiche={fiche} avecLienOutil={false} />
          <fieldset>
            <legend className="mb-2 text-[1.0625rem] font-semibold">Dans quelle situation l'essaierez-vous cette semaine ?</legend>
            <div className="grid grid-cols-2 gap-2">
              {SITUATIONS.map((s) => (
                <button
                  key={s.valeur}
                  type="button"
                  aria-pressed={situation === s.valeur}
                  onClick={() => setSituation(s.valeur)}
                  className={`min-h-[48px] rounded-[12px] font-semibold shadow-sm ${situation === s.valeur ? 'bg-accent text-sur-accent' : 'bg-surface'}`}
                >
                  {s.libelle}
                </button>
              ))}
            </div>
          </fieldset>
          <Bouton
            onClick={async () => {
              if (situation) await J.ecrirePlanSemaine(db, { ficheId: fiche.id, situation, date });
              setEtape('respiration');
            }}
          >
            {situation ? 'Retenir et continuer' : 'Continuer sans choisir'}
          </Bouton>
        </>
      )}

      {etape === 'respiration' && (
        <>
          <h2 className="text-[1.5rem] font-bold">Respiration lente</h2>
          <Respiration dureeMs={DUREE_RESPIRATION_SEANCE_MS} onTerminer={onTerminer} libelleFin="Continuer la séance" />
        </>
      )}
    </div>
  );
}
