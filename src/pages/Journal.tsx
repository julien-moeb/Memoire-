/** Exercice 22 : journal des épisodes de manque du mot (auto-observation). */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Bandeau, Bouton, Carte, GrandTitre, ListeGroupee, Ligne, Page, TitreSection } from '../ui/composants';
import { useApp } from '../etat/contexte';
import { lien } from '../etat/routeur';
import { ajouterJours, dateLocale, formatDate } from '../moteur/dates';
import type { Episode } from '../stockage/types';
import { INTERLOCUTEURS, ISSUES, SITUATIONS, dateDe, syntheseJournal, type SyntheseJournal } from '../suivi/calculs';
import * as J from '../suivi/journal';
import { strategies } from '../seance/contenu';
import { ficheParId } from '../comportemental/Fiche';

const libelle = <T extends string>(liste: readonly { valeur: T; libelle: string }[], v: T) => liste.find((x) => x.valeur === v)?.libelle ?? v;

/** Valeur d'un champ datetime-local (heure locale) à partir d'un horodatage ISO. */
function versChampDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function Journal() {
  const { db } = useApp();
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [edition, setEdition] = useState<{ episode: Episode; indice: string; nouveau: boolean } | null>(null);
  const [renseigne, setRenseigne] = useState(false);
  const [plan, setPlan] = useState<J.PlanSemaine | null>(null);
  const [cartesPerso, setCartesPerso] = useState(0);

  const recharger = useCallback(async () => {
    if (!db) return;
    setEpisodes(await J.lireEpisodes(db));
    setRenseigne(await J.journalRenseigne(db));
    setPlan(await J.lirePlanSemaine(db));
    setCartesPerso((await db.getAllFromIndex('cartes', 'paquet', J.PAQUET_JOURNAL)).length);
  }, [db]);
  useEffect(() => void recharger(), [recharger]);

  if (!db) {
    return <Page><GrandTitre>Journal</GrandTitre><Bandeau ton="attention">Le stockage local est indisponible : le journal ne pourrait pas être conservé.</Bandeau></Page>;
  }
  if (!episodes) return <p className="p-8 text-center text-texte-2" role="status">Chargement…</p>;

  const ouvrir = async (e: Episode, nouveau: boolean) => {
    const carte = e.motCherche ? await db.get('cartes', J.idCartePerso(e.motCherche)) : undefined;
    setEdition({ episode: e, indice: carte?.perso?.indice ?? '', nouveau });
    window.scrollTo({ top: 0 });
  };

  if (edition) {
    return (
      <Formulaire
        initial={edition.episode}
        indiceInitial={edition.indice}
        nouveau={edition.nouveau}
        onAnnuler={() => setEdition(null)}
        onEnregistrer={async (e, indice) => {
          await J.enregistrerEpisode(db, e, indice);
          setEdition(null);
          await recharger();
        }}
        onSupprimer={async () => {
          await J.supprimerEpisode(db, edition.episode.id);
          setEdition(null);
          await recharger();
        }}
      />
    );
  }

  const aujourdhui = dateLocale();
  const synthese = syntheseJournal(episodes, ajouterJours(aujourdhui, -29), aujourdhui);
  const fichePlan = plan ? ficheParId(plan.ficheId) : undefined;

  return (
    <Page>
      <GrandTitre sousTitre="Manque du mot">Journal</GrandTitre>
      <p className="px-1 text-[0.9375rem] leading-relaxed text-texte-2">
        Consigner les épisodes permet de repérer vos situations à risque et ce qui vous aide. Chaque mot cherché devient
        une carte de révision personnelle.
      </p>

      {fichePlan && plan && (
        <div className="mt-4">
          <Bandeau>
            Stratégie de la semaine : <strong>{fichePlan.titre}</strong>, à essayer en situation « {libelle(SITUATIONS, plan.situation).toLowerCase()} ».
          </Bandeau>
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <Bouton onClick={() => void ouvrir(J.nouvelEpisode(), true)}>Consigner un épisode</Bouton>
        {!renseigne && (
          <Bouton variante="teinte" onClick={async () => { await J.noterJournalSansEpisode(db); setRenseigne(true); }}>
            Aucun épisode aujourd'hui
          </Bouton>
        )}
      </div>

      <Synthese s={synthese} />

      {episodes.length > 0 && (
        <ListeGroupee titre="Épisodes" pied={cartesPerso ? `${cartesPerso} mot${cartesPerso > 1 ? 's' : ''} du journal en révision espacée.` : undefined}>
          {episodes.slice(0, 60).map((e) => (
            <Ligne
              key={e.id}
              libelle={e.motCherche ? `« ${e.motCherche} »` : libelle(SITUATIONS, e.situation)}
              detail={`${formatDate(dateDe(e))} à ${new Date(e.dateHeure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${libelle(SITUATIONS, e.situation)} · ${libelle(ISSUES, e.issue)}`}
              onClick={() => void ouvrir(e, false)}
            />
          ))}
        </ListeGroupee>
      )}

      <ListeGroupee titre="Ressources">
        <Ligne libelle="Fiches de stratégies" detail="Que faire pendant l'échange, comment se préparer" href={lien('/fiches')} />
        <Ligne libelle="Respiration lente" detail="Avant une situation exigeante" href={lien('/respiration')} />
      </ListeGroupee>
    </Page>
  );
}

function Barres({ titre, valeurs }: { titre: string; valeurs: { libelle: string; n: number }[] }) {
  const max = Math.max(1, ...valeurs.map((v) => v.n));
  return (
    <div>
      <h3 className="text-[0.9375rem] font-semibold">{titre}</h3>
      <ul className="mt-2 space-y-1.5">
        {valeurs.map((v) => (
          <li key={v.libelle} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-2 text-[0.9375rem]">
            <span className="truncate text-texte-2">{v.libelle}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(v.n / max) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums">{v.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Synthese({ s }: { s: SyntheseJournal }) {
  return (
    <>
      <TitreSection>Trente derniers jours</TitreSection>
      <Carte className="space-y-5">
        {s.total === 0 ? (
          <p className="leading-relaxed text-texte-2">Aucun épisode consigné sur cette période.</p>
        ) : (
          <>
            <p className="text-[1.0625rem]">
              {s.total} épisode{s.total > 1 ? 's' : ''}
              {s.enjeuMoyen !== null && <span className="text-texte-2"> · enjeu moyen {s.enjeuMoyen.toLocaleString('fr-FR')}/5 · fatigue moyenne {s.fatigueMoyenne?.toLocaleString('fr-FR')}/5</span>}
            </p>
            <Barres titre="Par situation" valeurs={s.parSituation} />
            <Barres titre="Par moment de la journée" valeurs={s.parHeure} />
            <Barres titre="Issue" valeurs={s.parIssue} />
            {s.strategies.length > 0 && (
              <div>
                <h3 className="text-[0.9375rem] font-semibold">Stratégies employées</h3>
                <ul className="mt-2 space-y-1 text-[0.9375rem]">
                  {s.strategies.map((x) => (
                    <li key={x.strategie}>
                      {ficheParId(x.strategie)?.titre ?? x.strategie} <span className="text-texte-2">· {x.n} fois, mot revenu {x.retrouves} fois</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[0.8125rem] leading-snug text-texte-2">Ces décomptes décrivent vos observations ; ils ne permettent pas, à eux seuls, de conclure qu'une stratégie est la cause d'un résultat.</p>
          </>
        )}
      </Carte>
    </>
  );
}

function Choix<T extends string | number>({ legende, options, valeur, onChange, colonnes = 3 }: {
  legende: ReactNode; options: readonly { valeur: T; libelle: string }[]; valeur: T; onChange: (v: T) => void; colonnes?: 2 | 3 | 5;
}) {
  const grille = colonnes === 2 ? 'grid-cols-2' : colonnes === 5 ? 'grid-cols-5' : 'grid-cols-3';
  return (
    <fieldset>
      <legend className="mb-2 text-[1rem] font-semibold">{legende}</legend>
      <div className={`grid gap-2 ${grille}`}>
        {options.map((o) => (
          <button
            key={String(o.valeur)}
            type="button"
            aria-pressed={valeur === o.valeur}
            onClick={() => onChange(o.valeur)}
            className={`min-h-[46px] rounded-[12px] px-2 text-[0.9375rem] font-semibold shadow-sm ${valeur === o.valeur ? 'bg-accent text-sur-accent' : 'bg-surface'}`}
          >
            {o.libelle}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const ECHELLE = [1, 2, 3, 4, 5].map((n) => ({ valeur: n as 1 | 2 | 3 | 4 | 5, libelle: String(n) }));
const champ = 'min-h-[48px] w-full rounded-[12px] bg-surface px-3 text-[1.0625rem] shadow-sm outline-none focus:ring-2 focus:ring-accent';

function Formulaire({ initial, indiceInitial, nouveau, onAnnuler, onEnregistrer, onSupprimer }: {
  initial: Episode; indiceInitial: string; nouveau: boolean;
  onAnnuler: () => void; onEnregistrer: (e: Episode, indice: string) => void; onSupprimer: () => void;
}) {
  const [e, setE] = useState<Episode>(initial);
  const [indice, setIndice] = useState(indiceInitial);
  const [confirmer, setConfirmer] = useState(false);
  const maj = (m: Partial<Episode>) => setE((x) => ({ ...x, ...m }));
  const fiches = strategies();
  const strategieConnue = !e.strategie || fiches.some((f) => f.id === e.strategie);

  return (
    <Page>
      <GrandTitre sousTitre="Journal">{nouveau ? 'Nouvel épisode' : 'Épisode'}</GrandTitre>
      <form
        className="space-y-6"
        onSubmit={(ev) => {
          ev.preventDefault();
          onEnregistrer(e, indice);
        }}
      >
        <div>
          <label htmlFor="ep-date" className="mb-2 block text-[1rem] font-semibold">Date et heure</label>
          <input
            id="ep-date"
            type="datetime-local"
            className={champ}
            value={versChampDate(e.dateHeure)}
            max={versChampDate(new Date().toISOString())}
            onChange={(ev) => { const d = new Date(ev.target.value); if (!Number.isNaN(d.getTime())) maj({ dateHeure: d.toISOString() }); }}
          />
        </div>
        <Choix legende="Situation" options={SITUATIONS} valeur={e.situation} onChange={(v) => maj({ situation: v })} />
        <Choix legende="Interlocuteur" options={INTERLOCUTEURS} valeur={e.interlocuteur} onChange={(v) => maj({ interlocuteur: v })} />
        <Choix legende="Enjeu de la situation, de 1 (faible) à 5 (fort)" options={ECHELLE} valeur={e.enjeu} onChange={(v) => maj({ enjeu: v })} colonnes={5} />
        <Choix legende="Fatigue à ce moment, de 1 (aucune) à 5 (très forte)" options={ECHELLE} valeur={e.fatigue} onChange={(v) => maj({ fatigue: v })} colonnes={5} />

        <div className="space-y-2">
          <label htmlFor="ep-mot" className="block text-[1rem] font-semibold">Mot cherché <span className="font-normal text-texte-2">(facultatif)</span></label>
          <input id="ep-mot" className={champ} value={e.motCherche ?? ''} onChange={(ev) => maj({ motCherche: ev.target.value })} autoComplete="off" autoCapitalize="none" placeholder="Le mot, s'il est revenu depuis" />
          {e.motCherche?.trim() && (
            <>
              <label htmlFor="ep-indice" className="block pt-2 text-[0.9375rem] text-texte-2">Indice pour la révision : une courte définition ou la phrase où il manquait</label>
              <input id="ep-indice" className={champ} value={indice} onChange={(ev) => setIndice(ev.target.value)} autoComplete="off" placeholder="Par exemple : document qui fixe les engagements de chacun" />
            </>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="ep-produit" className="block text-[1rem] font-semibold">Mot employé à la place <span className="font-normal text-texte-2">(facultatif)</span></label>
          <input id="ep-produit" className={champ} value={e.motProduit ?? ''} onChange={(ev) => maj({ motProduit: ev.target.value })} autoComplete="off" autoCapitalize="none" />
        </div>
        <div className="space-y-2">
          <label htmlFor="ep-strategie" className="block text-[1rem] font-semibold">Stratégie employée</label>
          <select
            id="ep-strategie"
            className={champ}
            value={strategieConnue ? (e.strategie ?? '') : 'autre'}
            onChange={(ev) => maj({ strategie: ev.target.value === 'autre' ? 'Autre' : ev.target.value || null })}
          >
            <option value="">Aucune</option>
            {fiches.map((f) => <option key={f.id} value={f.id}>{f.titre}</option>)}
            <option value="autre">Autre</option>
          </select>
          {!strategieConnue && (
            <input aria-label="Stratégie employée, précisée" className={champ} value={e.strategie ?? ''} onChange={(ev) => maj({ strategie: ev.target.value })} placeholder="Précisez" />
          )}
        </div>
        <Choix legende="Le mot est-il revenu ?" options={ISSUES} valeur={e.issue} onChange={(v) => maj({ issue: v })} />
        <div className="space-y-2">
          <label htmlFor="ep-notes" className="block text-[1rem] font-semibold">Notes <span className="font-normal text-texte-2">(facultatif)</span></label>
          <textarea id="ep-notes" rows={3} className={`${champ} py-3`} value={e.notes} onChange={(ev) => maj({ notes: ev.target.value })} />
        </div>

        <div className="grid gap-3">
          <Bouton type="submit">Enregistrer</Bouton>
          <Bouton variante="teinte" onClick={onAnnuler}>Annuler</Bouton>
          {!nouveau && (confirmer ? (
            <div className="flex flex-wrap items-center justify-center gap-4 text-[0.9375rem]">
              <span>Supprimer cet épisode ? La carte de révision éventuelle est conservée.</span>
              <button type="button" className="min-h-[44px] font-semibold text-accent" onClick={onSupprimer}>Supprimer</button>
              <button type="button" className="min-h-[44px] text-texte-2" onClick={() => setConfirmer(false)}>Garder</button>
            </div>
          ) : (
            <Bouton variante="simple" onClick={() => setConfirmer(true)}>Supprimer l'épisode</Bouton>
          ))}
        </div>
      </form>
    </Page>
  );
}
