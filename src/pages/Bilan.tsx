import { useCallback, useEffect, useState } from 'react';
import { Bandeau, Bouton, Carte, GrandTitre, ListeGroupee, Ligne, Page } from '../ui/composants';
import { useApp } from '../etat/contexte';
import { formesBilan } from '../contenu/chargeur';
import { Deroule, type ResultatPartie } from '../bilan/Deroule';
import { Plainte } from '../bilan/Plainte';
import { Profil } from '../bilan/Profil';
import { formeSuivante, lireBilans, prochainBilanConseille, scoresDuBilan, type BilanComplet } from '../bilan/historique';
import { dureePartie, rangInterne } from '../bilan/protocole';
import { dateLocale, formatDate } from '../moteur/dates';
import { DOMAINES, NOMS_DOMAINES, type Bilan, type Domaine } from '../stockage/types';

type Etat =
  | { ecran: 'accueil' }
  | { ecran: 'partie'; partie: 1 | 2; groupe: string; forme: Bilan['forme'] }
  | { ecran: 'plainte'; groupe: string; forme: Bilan['forme']; resultat: ResultatPartie };

const dateLongue = (d: string) => formatDate(d);

export function PageBilan() {
  const { db, reglages, modifierReglages, setConcentration } = useApp();
  const [groupes, setGroupes] = useState<BilanComplet[] | null>(null);
  const [etat, setEtat] = useState<Etat>({ ecran: 'accueil' });
  const [confirmerArret, setConfirmerArret] = useState(false);

  const charger = useCallback(async () => setGroupes(await lireBilans(db)), [db]);
  useEffect(() => {
    charger();
  }, [charger]);
  useEffect(() => {
    setConcentration(etat.ecran !== 'accueil');
    return () => setConcentration(false);
  }, [etat.ecran, setConcentration]);

  const enregistrer = async (groupe: string, forme: Bilan['forme'], partie: 1 | 2, r: ResultatPartie, extra: Record<string, number> = {}) => {
    if (!db) return;
    const metriques = { ...r.metriques, ...extra };
    const precedentes = partie === 2 ? (groupes?.find((g) => g.groupe === groupe)?.metriques ?? {}) : {};
    const bilan: Bilan = {
      id: `${groupe}-p${partie}`, groupe, date: dateLocale(), debut: r.debut, fin: new Date().toISOString(), forme, partie,
      metriques, scoresDomaines: partie === 2 ? scoresDuBilan({ groupe, forme, date: '', parties: [], metriques: { ...precedentes, ...metriques }, complet: true }) : {},
      appareilId: null,
    };
    const tx = db.transaction(['bilans', 'essais'], 'readwrite');
    await tx.objectStore('bilans').put(bilan);
    for (const e of r.essais) await tx.objectStore('essais').add(e);
    await tx.done;
    await charger();
  };

  if (!groupes) return <p className="p-8 text-center text-texte-2" role="status">Chargement…</p>;

  const formes = formesBilan();
  const formeDe = (f: Bilan['forme']) => formes.find((x) => x.forme === f);

  if (etat.ecran === 'partie') {
    const forme = formeDe(etat.forme);
    if (!forme) return <Page><Bandeau ton="attention">La forme {etat.forme} du bilan est introuvable dans le contenu.</Bandeau></Page>;
    return (
      <div className="min-h-screen pt-[env(safe-area-inset-top)]">
        <div className="flex justify-end px-4 pt-3">
          {confirmerArret ? (
            <div className="flex items-center gap-3 text-[0.9375rem]">
              <span>Interrompre ? Cette partie ne sera pas enregistrée.</span>
              <button type="button" className="min-h-[44px] font-semibold text-accent" onClick={() => { setConfirmerArret(false); setEtat({ ecran: 'accueil' }); }}>Interrompre</button>
              <button type="button" className="min-h-[44px] text-texte-2" onClick={() => setConfirmerArret(false)}>Reprendre</button>
            </div>
          ) : (
            <button type="button" className="min-h-[44px] px-2 text-[0.9375rem] text-texte-2" onClick={() => setConfirmerArret(true)}>Interrompre</button>
          )}
        </div>
        <Deroule
          groupe={etat.groupe}
          partie={etat.partie}
          forme={forme}
          ignorerAccents={reglages.ignorerAccents}
          onTerminer={async (r) => {
            if (etat.partie === 1) {
              await enregistrer(etat.groupe, etat.forme, 1, r);
              setEtat({ ecran: 'accueil' });
            } else setEtat({ ecran: 'plainte', groupe: etat.groupe, forme: etat.forme, resultat: r });
          }}
        />
      </div>
    );
  }

  if (etat.ecran === 'plainte') {
    return (
      <Plainte
        onTerminer={async (p) => {
          const extra = Object.fromEntries(Object.entries(p).map(([d, v]) => [`plainte.${d}`, v]));
          await enregistrer(etat.groupe, etat.forme, 2, etat.resultat, extra);
          setEtat({ ecran: 'accueil' });
        }}
      />
    );
  }

  const enCours = [...groupes].reverse().find((g) => !g.complet);
  const complets = groupes.filter((g) => g.complet);
  const dernier = complets.at(-1);
  const precedent = complets.at(-2);
  const conseille = prochainBilanConseille(groupes);
  const nouveau = () => {
    const forme = formeSuivante(groupes);
    setEtat({ ecran: 'partie', partie: 1, forme, groupe: `bilan-${dateLocale()}-${forme.toLowerCase()}-${Date.now().toString(36)}` });
  };

  return (
    <Page>
      <GrandTitre>Bilan</GrandTitre>

      {enCours && (
        <Carte className="mb-4">
          <h2 className="text-[1.0625rem] font-semibold">Partie 2 à réaliser</h2>
          <p className="mt-1 text-texte-2">
            Partie 1 réalisée le {dateLongue(enCours.date)}. La seconde partie dure environ {Math.round(dureePartie(2))} minutes ;
            idéalement, réalisez-la dans les 48 heures.
          </p>
          <Bouton className="mt-4 w-full" onClick={() => setEtat({ ecran: 'partie', partie: 2, forme: enCours.forme, groupe: enCours.groupe })}>
            Commencer la partie 2
          </Bouton>
        </Carte>
      )}

      {!enCours && !dernier && (
        <Carte>
          <p className="text-[1.0625rem] leading-relaxed">
            Le bilan évalue six domaines en deux parties d'environ {Math.round(dureePartie(1))} minutes, à faire sur deux jours
            consécutifs. Il établit votre ligne de base personnelle, sans aucune comparaison à une norme.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[0.9375rem] text-texte-2">
            <li>Choisissez un moment calme, sans interruption prévisible.</li>
            <li>Un clavier physique est préférable pour les épreuves de saisie et de vitesse.</li>
            <li>Il est normal de ne pas tout réussir : les épreuves sont conçues pour cela.</li>
          </ul>
          <Bouton className="mt-5 w-full" onClick={nouveau}>Commencer la partie 1</Bouton>
        </Carte>
      )}

      {dernier && (
        <>
          <Profil bilan={dernier} precedent={precedent} />
          <ListeGroupee
            titre="Programme"
            pied="Par défaut, l'accès lexical est prioritaire, conformément à la plainte principale. Le rang indicatif ci-dessus peut éclairer ce choix, que vous pouvez modifier à tout moment."
          >
            <li className="flex min-h-[44px] items-center justify-between px-4 py-2">
              <label htmlFor="prioritaire" className="text-[1.0625rem]">Domaine prioritaire</label>
              <select
                id="prioritaire"
                value={reglages.domainePrioritaire}
                onChange={(e) => {
                  const d = e.target.value as Domaine;
                  modifierReglages({ domainePrioritaire: d, ponderations: Object.fromEntries(DOMAINES.map((x) => [x, x === d ? 2 : 1])) as Record<Domaine, number> });
                }}
                className="min-h-[44px] max-w-[60%] rounded-lg bg-transparent text-right text-[1.0625rem] text-texte-2"
              >
                {DOMAINES.map((d) => <option key={d} value={d}>{NOMS_DOMAINES[d]}</option>)}
              </select>
            </li>
            <Ligne libelle="Domaine le moins élevé (indicatif)" valeur={NOMS_DOMAINES[rangInterne(scoresDuBilan(dernier))[0] ?? 'acces-lexical']} />
          </ListeGroupee>
          <ListeGroupee titre="Prochain bilan" pied="Un intervalle de trois mois limite l'effet de familiarité avec les épreuves ; chaque bilan utilise une forme différente.">
            <Ligne libelle="Date conseillée" valeur={conseille ? dateLongue(conseille) : '—'} />
            {!enCours && <Ligne libelle={<span className="text-accent">Commencer un nouveau bilan</span>} onClick={nouveau} />}
          </ListeGroupee>
          {conseille && dateLocale() < conseille && !enCours && (
            <p className="mt-2 px-4 text-[0.8125rem] text-texte-2">Un bilan anticipé reste possible, mais sera moins comparable au précédent.</p>
          )}
        </>
      )}
    </Page>
  );
}
