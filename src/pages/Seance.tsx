/** Séance quotidienne : contexte, blocs composés par le moteur, clôture. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bandeau, Bouton, Carte, GrandTitre, ListeGroupee, Ligne, Page } from '../ui/composants';
import { useApp } from '../etat/contexte';
import { lien } from '../etat/routeur';
import { dateLocale } from '../moteur/dates';
import { creerAlea, graineDe } from '../moteur/alea';
import { estimationSeuil } from '../moteur/escalier';
import { lireBilans } from '../bilan/historique';
import { Consigne } from '../bilan/composants/commun';
import { DoubleDecision } from '../bilan/composants/DoubleDecision';
import { essaisDoubleDecision } from '../bilan/generateurs';
import { seuilEnMs } from '../bilan/protocole';
import type { Carte as CarteSm2, ContexteSeance, Episode, Seance } from '../stockage/types';
import { composerSeance, dureeEstimeeMin, DUREE_ECHAUFFEMENT_MS, type Bloc, type Composition } from '../seance/composer';
import { EXERCICES, type IdExercice } from '../seance/catalogue';
import { CONSIGNES } from '../seance/consignes';
import * as P from '../seance/persistance';
import { resultatVide, type PropsExercice, type ResultatExercice } from '../seance/types';
import { EXERCICES_CHOIX, ExerciceChoix, type IdExerciceChoix } from '../seance/exercices/ExerciceChoix';
import { Echauffement, MotJuste, Registre, TraitsSemantiques } from '../seance/exercices/Lexicaux';
import { NBack, SeriesMemoire } from '../seance/exercices/MemoireTravail';
import { ListeStrategies, MethodeLieux, Paragraphe, RappelDiffere } from '../seance/exercices/Episodique';
import { Revisions } from '../seance/exercices/Revisions';
import type { EtatEscalier } from '../moteur/escalier';
import { SeanceComportementale } from '../comportemental/SeanceComportementale';
import * as J from '../suivi/journal';
import { ISSUES, SITUATIONS } from '../suivi/calculs';

type Ecran =
  | { type: 'accueil' }
  | { type: 'contexte' }
  | { type: 'consigne'; index: number }
  | { type: 'bloc'; index: number; donnees: DonneesBloc }
  | { type: 'cloture' }
  | { type: 'fin' };

interface DonneesBloc {
  escalier: EtatEscalier | null;
  vus: Map<string, string>;
  cartes: CarteSm2[];
  motsPerso: string[];
}

const titreBloc = (b: Bloc) =>
  b.type === 'comportemental' ? 'Volet comportemental'
  : b.type === 'exercice' ? EXERCICES[b.exercice].titre
  : b.type === 'echauffement' ? EXERCICES.fluence.titre
  : b.type === 'repetition-espacee' ? EXERCICES['repetition-espacee'].titre
  : 'Rappel de la liste d’hier';

const consigneBloc = (b: Bloc) =>
  b.type === 'comportemental'
    ? "Une fois par semaine, ce volet remplace les exercices ciblés : vous relisez votre semaine dans le journal, choisissez une stratégie à essayer dans une situation précise, puis pratiquez trois minutes de respiration lente."
  : b.type === 'exercice' ? CONSIGNES[b.exercice]
  : b.type === 'echauffement' ? CONSIGNES.fluence
  : b.type === 'repetition-espacee' ? CONSIGNES['repetition-espacee']
  : 'Lors de votre dernière séance, vous avez appris une liste de mots. Écrivez tous ceux dont vous vous souvenez.';

const exerciceDuBloc = (b: Exclude<Bloc, { type: 'comportemental' }>): IdExercice =>
  b.type === 'exercice' ? b.exercice : b.type === 'echauffement' ? 'fluence' : b.type === 'repetition-espacee' ? 'repetition-espacee' : 'liste-strategies';

const formatValeur = (r: ResultatExercice) => (Number.isFinite(r.valeur) ? `${r.valeur} ${r.unite}` : '');

export function PageSeance() {
  const { db, reglages, setConcentration } = useApp();
  const date = useMemo(() => dateLocale(), []);
  const [composition, setComposition] = useState<Composition | null>(null);
  const [bilanFait, setBilanFait] = useState<boolean | null>(null);
  const [seance, setSeance] = useState<Seance | null>(null);
  const [ecran, setEcran] = useState<Ecran>({ type: 'accueil' });
  const [resultats, setResultats] = useState<{ titre: string; r: ResultatExercice }[]>([]);
  const [rang, setRang] = useState(0);
  const [confirmerArret, setConfirmerArret] = useState(false);
  /** Blocs dont l'enregistrement est lancé : un double appui sur « Continuer » ne doit rien enregistrer deux fois. */
  const enregistres = useRef(new Set<number>());
  const seanceRef = useRef<Seance | null>(null);
  seanceRef.current = seance;

  useEffect(() => {
    if (!db) return;
    (async () => {
      const bilans = await lireBilans(db);
      setBilanFait(bilans.some((b) => b.complet));
      const h = await P.historique(db);
      setRang(h.length);
      const ouverte = await P.seanceOuverte(db, date);
      setSeance(ouverte ?? null);
      setComposition(composerSeance({ date, jourRepos: reglages.jourRepos, domainePrioritaire: reglages.domainePrioritaire, historique: h, rappelsDus: await P.rappelsDus(db, date) }));
    })();
  }, [db, date, reglages.jourRepos, reglages.domainePrioritaire]);

  useEffect(() => {
    setConcentration(ecran.type !== 'accueil' && ecran.type !== 'fin');
    return () => setConcentration(false);
  }, [ecran.type, setConcentration]);

  if (!db) {
    return <Page><GrandTitre>Séance du jour</GrandTitre><Bandeau ton="attention">Le stockage local est indisponible : la séance ne pourrait pas être enregistrée.</Bandeau></Page>;
  }
  if (!composition || bilanFait === null) return <p className="p-8 text-center text-texte-2" role="status">Chargement…</p>;

  const blocs = composition.disponible ? composition.blocs : [];
  const prochainIndex = (depuis: number, s: Seance | null) => {
    for (let i = depuis; i < blocs.length; i++) if (!s?.blocsRealises.includes(P.cleBloc(blocs[i]!, i))) return i;
    return -1;
  };

  const preparerBloc = async (index: number) => {
    const b = blocs[index]!;
    if (b.type === 'comportemental') {
      setEcran({ type: 'bloc', index, donnees: { escalier: null, vus: new Map(), cartes: [], motsPerso: [] } });
      return;
    }
    const id = exerciceDuBloc(b);
    const donnees: DonneesBloc = {
      motsPerso: id === 'traits-semantiques' ? await J.motsPersonnels(db) : [],
      escalier: b.type === 'exercice' ? await P.escalierDuJour(db, id) : null,
      vus: await P.itemsVus(db, id),
      cartes: b.type === 'repetition-espacee' ? await P.cartesDuJour(db, date, b.max) : [],
    };
    // Méthode des lieux et liste : la liste du jour ne doit pas être celle d'un rappel en attente.
    if (id === 'methode-lieux' || id === 'liste-strategies') {
      for (const [k, v] of await P.itemsVus(db, 'liste-strategies')) donnees.vus.set(k, v);
    }
    setEcran({ type: 'bloc', index, donnees });
  };

  const apresBloc = async (index: number, r: ResultatExercice | null, cartesRevisees: CarteSm2[] = []) => {
    if (enregistres.current.has(index)) return;
    enregistres.current.add(index);
    const s = await P.enregistrerBloc(db, seanceRef.current!, P.cleBloc(blocs[index]!, index), r, date, cartesRevisees);
    seanceRef.current = s;
    setSeance(s);
    if (r) setResultats((t) => [...t, { titre: titreBloc(blocs[index]!), r }]);
    const suivant = prochainIndex(index + 1, s);
    setEcran(suivant === -1 ? { type: 'cloture' } : { type: 'consigne', index: suivant });
  };

  const barreArret = (
    <div className="flex justify-end px-4 pt-3">
      {confirmerArret ? (
        <div className="flex flex-wrap items-center justify-end gap-3 text-[0.9375rem]">
          <span>Interrompre ? Les blocs terminés sont conservés ; vous pourrez reprendre aujourd'hui.</span>
          <button type="button" className="min-h-[44px] font-semibold text-accent" onClick={() => { setConfirmerArret(false); setEcran({ type: 'accueil' }); }}>Interrompre</button>
          <button type="button" className="min-h-[44px] text-texte-2" onClick={() => setConfirmerArret(false)}>Reprendre</button>
        </div>
      ) : (
        <button type="button" className="min-h-[44px] px-2 text-[0.9375rem] text-texte-2" onClick={() => setConfirmerArret(true)}>Interrompre</button>
      )}
    </div>
  );

  if (ecran.type === 'contexte') {
    return (
      <div className="min-h-screen">
        {barreArret}
        <SaisieContexte
          onValider={async (contexte) => {
            const s = await P.ouvrirSeance(db, date, contexte, blocs.map((b, i) => P.cleBloc(b, i)), null);
            setSeance(s);
            setEcran({ type: 'consigne', index: prochainIndex(0, s) });
          }}
        />
      </div>
    );
  }

  if (ecran.type === 'consigne') {
    const b = blocs[ecran.index]!;
    return (
      <div className="min-h-screen">
        {barreArret}
        <Consigne libelle="Étape" titre={titreBloc(b)} numero={ecran.index + 1} total={blocs.length} onCommencer={() => void preparerBloc(ecran.index)}>
          <p>{consigneBloc(b)}</p>
          {b.type === 'comportemental' && <p className="mt-3 text-[0.9375rem] text-texte-2">Environ 10 minutes · une fois par semaine</p>}
          {b.type === 'exercice' && (
            <p className="mt-3 text-[0.9375rem] text-texte-2">
              Environ {Math.round(b.dureeMs / 60_000)} minutes · niveau de preuve {EXERCICES[b.exercice].preuve}
              {b.role === 'vitesse' ? ' · exercice prioritaire' : b.role === 'maintien' ? ' · maintien' : ''}
            </p>
          )}
        </Consigne>
      </div>
    );
  }

  if (ecran.type === 'bloc') {
    const b = blocs[ecran.index]!;
    const d = ecran.donnees;
    const props: PropsExercice = {
      dureeMs: b.type === 'exercice' || b.type === 'comportemental' ? b.dureeMs : DUREE_ECHAUFFEMENT_MS,
      escalier: d.escalier,
      alea: creerAlea(graineDe(`${seance!.id}-${ecran.index}`)),
      ignorerAccents: reglages.ignorerAccents,
      modeOral: reglages.modeOral,
      vus: d.vus,
      motsPerso: d.motsPerso,
      onTerminer: (r) => void apresBloc(ecran.index, r),
    };
    return (
      <div className="min-h-screen" key={ecran.index}>
        {barreArret}
        {b.type === 'comportemental' && <SeanceComportementale db={db} date={date} onTerminer={() => void apresBloc(ecran.index, null)} />}
        {b.type === 'echauffement' && <Echauffement {...props} />}
        {b.type === 'rappel-differe' && <RappelDiffere listeId={b.listeId} onTerminer={props.onTerminer} />}
        {b.type === 'repetition-espacee' && (
          <Revisions cartes={d.cartes} aujourdhui={date} ignorerAccents={reglages.ignorerAccents} modeOral={reglages.modeOral} onTerminer={(r, c) => void apresBloc(ecran.index, r, c)} />
        )}
        {b.type === 'exercice' && <BlocExercice id={b.exercice} props={props} rang={rang} />}
      </div>
    );
  }

  if (ecran.type === 'cloture') {
    return (
      <Cloture
        onTerminer={async (episode) => {
          if (episode) await J.enregistrerEpisode(db, episode, null);
          else await J.noterJournalSansEpisode(db, date);
          if (seanceRef.current) setSeance(await P.cloreSeance(db, seanceRef.current));
          setEcran({ type: 'fin' });
        }}
      />
    );
  }

  if (ecran.type === 'fin') {
    return (
      <Page>
        <GrandTitre sousTitre="Séance terminée">Merci</GrandTitre>
        <ListeGroupee titre="Aujourd'hui" pied="Ces valeurs alimenteront vos courbes de progression, lissées sur sept jours. Une séance isolée ne dit rien en soi.">
          {resultats.map(({ titre, r }, i) => <Ligne key={i} libelle={titre} valeur={formatValeur(r)} />)}
        </ListeGroupee>
        <div className="mt-6"><Bouton onClick={() => (location.hash = lien('/'))} className="w-full">Retour à l'accueil</Bouton></div>
      </Page>
    );
  }

  // Accueil de la séance
  if (!bilanFait) {
    return (
      <Page>
        <GrandTitre>Séance du jour</GrandTitre>
        <Carte>
          <p className="text-[1.0625rem] leading-relaxed">La séance quotidienne s'appuie sur votre bilan initial, qui fixe votre ligne de base. Terminez d'abord les deux parties du bilan.</p>
          <div className="mt-4"><Bouton onClick={() => (location.hash = lien('/bilan'))} className="w-full">Aller au bilan</Bouton></div>
        </Carte>
      </Page>
    );
  }
  if (!composition.disponible) {
    return (
      <Page>
        <GrandTitre>Séance du jour</GrandTitre>
        <Carte>
          <p className="text-[1.0625rem] leading-relaxed">
            {composition.raison === 'repos'
              ? "Aujourd'hui est votre jour de repos. La consolidation fait partie de l'entraînement ; à demain."
              : 'Votre séance du jour est faite. Une seule séance par jour est proposée : la régularité compte davantage que la quantité.'}
          </p>
        </Carte>
      </Page>
    );
  }
  const reprise = seance !== null && seance.blocsRealises.length > 0;
  return (
    <Page>
      <GrandTitre sousTitre={`Environ ${dureeEstimeeMin(blocs)} minutes`}>Séance du jour</GrandTitre>
      <ListeGroupee titre="Au programme" pied="Le niveau de chaque exercice reprend celui de la veille, un cran en dessous pour les premiers essais, puis s'ajuste pour maintenir environ 80 % de réussite.">
        {blocs.map((b, i) => (
          <Ligne key={i} libelle={titreBloc(b)} detail={b.type === 'exercice' ? `${EXERCICES[b.exercice].numero === 1 ? 'Prioritaire · ' : ''}${Math.round(b.dureeMs / 60_000)} min` : b.type === 'comportemental' ? 'Hebdomadaire · 10 min' : undefined} valeur={seance?.blocsRealises.includes(P.cleBloc(b, i)) ? 'Fait' : undefined} />
        ))}
      </ListeGroupee>
      <div className="mt-6">
        <Bouton
          className="w-full"
          onClick={() => {
            if (reprise) {
              const i = prochainIndex(0, seance);
              setEcran(i === -1 ? { type: 'cloture' } : { type: 'consigne', index: i });
            } else setEcran({ type: 'contexte' });
          }}
        >
          {reprise ? 'Reprendre la séance' : 'Commencer'}
        </Bouton>
      </div>
    </Page>
  );
}

function BlocExercice({ id, props, rang }: { id: IdExercice; props: PropsExercice; rang: number }) {
  if ((EXERCICES_CHOIX as readonly string[]).includes(id)) return <ExerciceChoix id={id as IdExerciceChoix} {...props} />;
  switch (id) {
    case 'double-decision':
      return (
        <DoubleDecision
          essais={essaisDoubleDecision(400, props.alea)}
          escalierInitial={props.escalier!}
          dureeMs={props.dureeMs}
          onTerminer={(r) =>
            props.onTerminer({
              ...resultatVide('double-decision'),
              essais: r.essais.map((e) => ({
                itemId: null, niveau: e.niveau, stimulus: `${e.forme}@${e.position}|${e.images}i`, reponse: `${e.reponseForme}@${e.reponsePosition}`,
                correcte: e.correcte, tempsReponseMs: null, ecartAffichageMs: Math.round(e.ecartMs * 10) / 10, indice: null,
              })),
              metrique: 'seuil-ms', unite: 'ms',
              valeur: Math.round(seuilEnMs(estimationSeuil(r.escalier, 6) ?? r.escalier.niveau)),
              niveauDepart: props.escalier!.niveau, niveauArrivee: r.escalier.niveau, escalier: r.escalier,
            })
          }
        />
      );
    case 'definition-mot':
      return <MotJuste {...props} />;
    case 'traits-semantiques':
      return <TraitsSemantiques {...props} />;
    case 'registre':
      return <Registre {...props} />;
    case 'n-back':
      return <NBack {...props} />;
    case 'empan-inverse':
    case 'mise-a-jour':
      return <SeriesMemoire id={id} {...props} />;
    case 'liste-strategies':
      return <ListeStrategies {...props} rang={rang} />;
    case 'paragraphe':
      return <Paragraphe {...props} />;
    case 'methode-lieux':
      return <MethodeLieux {...props} />;
    default:
      return <Echauffement {...props} />;
  }
}

function SaisieContexte({ onValider }: { onValider: (c: ContexteSeance) => void }) {
  const [sommeil, setSommeil] = useState<number | null>(null);
  const [fatigue, setFatigue] = useState<ContexteSeance['fatigue']>(null);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-6 px-4">
      <h2 className="text-[1.5rem] font-bold">Avant de commencer</h2>
      <p className="text-texte-2">Ces deux réponses, données avant la séance, permettront plus tard de repérer ce qui est associé à vos bons et moins bons jours.</p>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[1.0625rem]">Heures de sommeil la nuit dernière</legend>
        <div className="grid grid-cols-5 gap-2">
          {[4, 5, 6, 7, 8, 9, 10].map((h) => (
            <button key={h} type="button" aria-pressed={sommeil === h} onClick={() => setSommeil(h)} className={`min-h-[48px] rounded-[12px] font-semibold shadow-sm ${sommeil === h ? 'bg-accent text-sur-accent' : 'bg-surface'}`}>
              {h === 4 ? '≤ 4' : h === 10 ? '≥ 10' : h}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-[1.0625rem]">Fatigue ressentie, de 1 (aucune) à 5 (très forte)</legend>
        <div className="grid grid-cols-5 gap-2">
          {([1, 2, 3, 4, 5] as const).map((f) => (
            <button key={f} type="button" aria-pressed={fatigue === f} onClick={() => setFatigue(f)} className={`min-h-[48px] rounded-[12px] font-semibold shadow-sm ${fatigue === f ? 'bg-accent text-sur-accent' : 'bg-surface'}`}>
              {f}
            </button>
          ))}
        </div>
      </fieldset>
      <Bouton onClick={() => onValider({ sommeilHeures: sommeil, fatigue })}>{sommeil === null && fatigue === null ? 'Passer' : 'Continuer'}</Bouton>
    </div>
  );
}


/** Clôture : un épisode de manque du mot depuis la veille, en trois touches si vous le souhaitez. */
function Cloture({ onTerminer }: { onTerminer: (e: Episode | null) => void }) {
  const [etape, setEtape] = useState<'question' | 'situation' | 'issue'>('question');
  const [situation, setSituation] = useState<Episode['situation']>('autre');
  const grille = (items: readonly { valeur: string; libelle: string }[], choisir: (v: string) => void) => (
    <div className="grid grid-cols-2 gap-3">
      {items.map((i) => <button key={i.valeur} type="button" onClick={() => choisir(i.valeur)} className="min-h-[56px] rounded-[14px] bg-surface font-semibold shadow-sm">{i.libelle}</button>)}
    </div>
  );
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center gap-6 px-4">
      <h2 className="text-[1.5rem] font-bold">Pour finir</h2>
      {etape === 'question' && (
        <>
          <p className="text-[1.0625rem]">Depuis hier, un mot vous a-t-il échappé dans une situation réelle ?</p>
          <div className="grid grid-cols-2 gap-3">
            <Bouton variante="teinte" onClick={() => onTerminer(null)}>Non</Bouton>
            <Bouton onClick={() => setEtape('situation')}>Oui</Bouton>
          </div>
        </>
      )}
      {etape === 'situation' && (
        <>
          <p className="text-[1.0625rem]">Dans quelle situation ?</p>
          {grille(SITUATIONS, (v) => { setSituation(v as Episode['situation']); setEtape('issue'); })}
        </>
      )}
      {etape === 'issue' && (
        <>
          <p className="text-[1.0625rem]">Le mot est-il revenu ?</p>
          {grille(ISSUES, (v) =>
            onTerminer({
              id: `episode-${Date.now().toString(36)}`, dateHeure: new Date().toISOString(), situation, interlocuteur: 'autre',
              enjeu: 3, fatigue: 3, motCherche: null, motProduit: null, strategie: null, issue: v as Episode['issue'],
              notes: 'Saisi en fin de séance ; détails à compléter dans le journal.',
            }),
          )}
        </>
      )}
    </div>
  );
}
