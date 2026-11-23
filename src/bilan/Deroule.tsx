/** Déroulé d'une partie du bilan : consigne, épreuve, enregistrement, épreuve suivante. */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import type { FormeBilan } from '../contenu/schemas';
import { creerAlea, graineDe } from '../moteur/alea';
import { mediane, moyenne } from '../moteur/statistiques';
import { dateLocale } from '../moteur/dates';
import type { Essai } from '../stockage/types';
import { epreuvesDeLaPartie, type IdEpreuve } from './protocole';
import {
  COULEURS, eclairs, essaisAlternance, essaisDecisionLexicale, essaisDoubleDecision, essaisGoNoGo, essaisParite,
  essaisStroop, fluxMiseAJour, sequenceChiffres, type StimulusAlternance, type StimulusStroop,
} from './generateurs';
import { corrigerRappel, coutConditions, decisionLexicale, doubleTache, goNoGo } from './scoring';
import { Consigne } from './composants/commun';
import { ListeMots } from './composants/ListeMots';
import { Rappel } from './composants/Rappel';
import { Fluence } from './composants/Fluence';
import { Denomination } from './composants/Denomination';
import { EpreuveChoix, type ResultatEssaiChoix } from './composants/EpreuveChoix';
import { DoubleDecision } from './composants/DoubleDecision';
import { EmpanInverse, MiseAJour } from './composants/Empan';
import { DoubleTache } from './composants/DoubleTache';

export interface ResultatPartie {
  metriques: Record<string, number>;
  essais: Omit<Essai, 'id'>[];
  debut: string;
}

interface Props {
  groupe: string;
  partie: 1 | 2;
  forme: FormeBilan;
  ignorerAccents: boolean;
  onTerminer: (r: ResultatPartie) => void;
}

const arrondi = (n: number, d = 1) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : NaN);

export function Deroule({ groupe, partie, forme, ignorerAccents, onTerminer }: Props) {
  const plan = epreuvesDeLaPartie(partie);
  const [index, setIndex] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const metriques = useRef<Record<string, number>>({});
  const essais = useRef<Omit<Essai, 'id'>[]>([]);
  const debut = useRef(new Date().toISOString());
  const finApprentissage = useRef<number>(0);
  const def = plan[index]!;

  // Tous les essais procéduraux sont tirés d'une graine propre à ce bilan : reproductibles.
  const g = useMemo(() => {
    const a = creerAlea(graineDe(`${groupe}-${partie}`));
    return {
      decision: essaisDecisionLexicale(forme.decisionLexicale.mots, forme.decisionLexicale.pseudoMots, a),
      double: essaisDoubleDecision(36, a),
      gonogo: essaisGoNoGo(90, 0.2, a),
      stroop: essaisStroop(48, a),
      alternance: essaisAlternance(48, a),
      paritéSimple: essaisParite(20, a),
      paritéDouble: essaisParite(30, a),
      eclairs: eclairs(30, 6, a),
      flux: Array.from({ length: 8 }, () => fluxMiseAJour(a)),
      chiffres: (n: number) => sequenceChiffres(n, a),
    };
  }, [groupe, partie, forme]);

  const noter = (id: IdEpreuve, m: Record<string, number>) => {
    for (const [k, v] of Object.entries(m)) metriques.current[`${id}.${k}`] = arrondi(v, 3);
  };

  const consigner = (exerciceId: IdEpreuve, liste: { stimulus: string; reponse: string; correcte: boolean | null; tempsMs: number | null; itemId?: string; niveau?: number; ecart?: number; indice?: Essai['indice'] }[]) => {
    const maintenant = new Date();
    for (const e of liste) {
      essais.current.push({
        seanceId: null, bilanId: `${groupe}-p${partie}`, exerciceId, itemId: e.itemId ?? null, date: dateLocale(maintenant),
        horodatage: maintenant.toISOString(), niveau: e.niveau ?? null, stimulus: e.stimulus, reponse: e.reponse,
        correcte: e.correcte, tempsReponseMs: e.tempsMs === null ? null : arrondi(e.tempsMs, 1),
        ecartAffichageMs: e.ecart ?? null, indice: e.indice ?? null,
      });
    }
  };

  const depuisChoix = (r: ResultatEssaiChoix[]) => r.map((e) => ({ stimulus: `${e.condition}:${e.stimulus}`, reponse: e.reponse ?? '', correcte: e.correcte, tempsMs: e.tempsMs }));

  const suivante = () => {
    setEnCours(false);
    if (index + 1 < plan.length) setIndex(index + 1);
    else onTerminer({ metriques: metriques.current, essais: essais.current, debut: debut.current });
  };

  if (!enCours) {
    return (
      <Consigne titre={def.titre} numero={index + 1} total={plan.length} onCommencer={() => setEnCours(true)}>
        <p>{def.consigne}</p>
      </Consigne>
    );
  }

  let epreuve: ReactNode;
  switch (def.id) {
    case 'liste-apprentissage':
      epreuve = (
        <ListeMots
          liste={forme.liste}
          onTerminer={(rappels, scores) => {
            finApprentissage.current = performance.now();
            noter(def.id, {
              'total-3-essais': scores.reduce((s, x) => s + x, 0), 'essai-1': scores[0]!, 'essai-2': scores[1]!, 'essai-3': scores[2]!,
              intrusions: rappels.reduce((s, r) => s + corrigerRappel(r, forme.liste).intrusions.length, 0),
            });
            consigner(def.id, rappels.map((r, i) => ({ stimulus: `essai ${i + 1}`, reponse: r.join(', '), correcte: null, tempsMs: null })));
            suivante();
          }}
        />
      );
      break;
    case 'fluence-semantique':
    case 'fluence-phonemique': {
      const f = def.id === 'fluence-semantique' ? forme.fluenceSemantique : forme.fluencePhonemique;
      epreuve = (
        <Fluence
          consigne={f.consigne}
          item={{ modalite: def.id === 'fluence-semantique' ? 'semantique' : 'phonemique', cle: f.cle, reference: f.reference, exclusions: f.exclusions }}
          onTerminer={({ saisies, acceptes, score }) => {
            noter(def.id, {
              'mots-valides': score.valides, doublons: score.doublons, refuses: score.refuses, pente: score.pente,
              ...Object.fromEntries(score.tranches.map((t, i) => [`tranche-${i + 1}`, t])),
            });
            consigner(def.id, saisies.map((s) => ({ stimulus: f.cle, reponse: s.mot, correcte: null, tempsMs: s.tMs })));
            if (acceptes.length) consigner(def.id, [{ stimulus: 'arbitrage', reponse: acceptes.join(', '), correcte: null, tempsMs: null }]);
            suivante();
          }}
        />
      );
      break;
    }
    case 'denomination':
      epreuve = (
        <Denomination
          items={forme.definitions}
          ignorerAccents={ignorerAccents}
          onTerminer={(r) => {
            const frappes = r.filter((x) => x.premiereFrappeMs !== null).map((x) => x.premiereFrappeMs!);
            noter(def.id, {
              'reussites-sans-indice': r.filter((x) => x.correcte && x.indice === 'aucun').length,
              'reussites-indice-semantique': r.filter((x) => x.correcte && x.indice === 'semantique').length,
              'reussites-indice-syllabique': r.filter((x) => x.correcte && x.indice === 'syllabe').length,
              echecs: r.filter((x) => !x.correcte).length,
              'premiere-frappe-mediane-ms': mediane(frappes),
            });
            consigner(def.id, r.map((x) => ({ stimulus: x.itemId, itemId: x.itemId, reponse: x.reponse, correcte: x.correcte, tempsMs: x.premiereFrappeMs, indice: x.indice })));
            suivante();
          }}
        />
      );
      break;
    case 'decision-lexicale':
      epreuve = (
        <EpreuveChoix
          essais={g.decision}
          entrainement={[
            { condition: 'mot', stimulus: 'chaise', attendue: 'mot' }, { condition: 'non-mot', stimulus: 'trenle', attendue: 'non-mot' },
            { condition: 'mot', stimulus: 'jardin', attendue: 'mot' }, { condition: 'non-mot', stimulus: 'pulgon', attendue: 'non-mot' },
          ]}
          options={[{ valeur: 'non-mot', libelle: 'Pas un mot', touche: 'f' }, { valeur: 'mot', libelle: 'Mot', touche: 'j' }]}
          afficher={(el, s) => (el.textContent = s)}
          decrire={(s) => s}
          onTerminer={(r) => {
            const d = decisionLexicale(r);
            noter(def.id, { 'tr-median': d.trMedian, exactitude: d.exactitude });
            consigner(def.id, depuisChoix(r));
            suivante();
          }}
        />
      );
      break;
    case 'double-decision':
      epreuve = (
        <DoubleDecision
          essais={g.double}
          onTerminer={(r) => {
            noter(def.id, { 'seuil-ms': r.seuilMs, 'periode-ms': r.periodeMs, 'ecart-affichage-moyen-ms': moyenne(r.essais.map((e) => Math.abs(e.ecartMs))) });
            consigner(def.id, r.essais.map((e) => ({
              stimulus: `${e.forme}@${e.position}`, reponse: `${e.reponseForme}@${e.reponsePosition}`, correcte: e.correcte,
              tempsMs: null, niveau: e.niveau, ecart: arrondi(e.ecartMs, 2),
            })));
            suivante();
          }}
        />
      );
      break;
    case 'liste-differe':
      epreuve = (
        <Rappel
          titre="Rappel différé"
          onTerminer={(mots) => {
            const c = corrigerRappel(mots, forme.liste);
            noter(def.id, { 'mots-rappeles': c.corrects.length, intrusions: c.intrusions.length, 'delai-min': (performance.now() - finApprentissage.current) / 60000 });
            consigner(def.id, [{ stimulus: 'différé', reponse: mots.join(', '), correcte: null, tempsMs: null }]);
            suivante();
          }}
        />
      );
      break;
    case 'empan-inverse':
      epreuve = (
        <EmpanInverse
          generer={g.chiffres}
          onTerminer={(r) => {
            noter(def.id, { empan: r.empan, 'essais-reussis': r.essais.filter((e) => e.correct).length });
            consigner(def.id, r.essais.map((e) => ({ stimulus: e.serie, reponse: e.reponse, correcte: e.correct, tempsMs: null, niveau: e.longueur })));
            suivante();
          }}
        />
      );
      break;
    case 'mise-a-jour':
      epreuve = (
        <MiseAJour
          flux={g.flux}
          onTerminer={(r) => {
            noter(def.id, { 'items-corrects': r.total });
            consigner(def.id, r.essais.map((e) => ({ stimulus: e.flux, reponse: e.reponse, correcte: e.score === 4, tempsMs: null })));
            suivante();
          }}
        />
      );
      break;
    case 'go-nogo':
      epreuve = (
        <EpreuveChoix
          essais={g.gonogo}
          entrainement={g.gonogo.slice(0, 6)}
          options={[{ valeur: 'go', libelle: 'Appuyer', touche: 'espace' }]}
          afficher={(el, s) => (el.textContent = s)}
          decrire={(s) => s}
          fixationMs={300}
          delaiMaxMs={900}
          dureeStimulusMs={300}
          intervalleMs={250}
          onTerminer={(r) => {
            const m = goNoGo(r);
            noter(def.id, { erreurs: m.omissions + m.faussesAlarmes, omissions: m.omissions, 'fausses-alarmes': m.faussesAlarmes, 'tr-moyen': m.trMoyen, 'coefficient-variation': m.coefficientVariation });
            consigner(def.id, depuisChoix(r));
            suivante();
          }}
        />
      );
      break;
    case 'double-tache':
      epreuve = (
        <DoubleTache
          simple={g.paritéSimple}
          double={g.paritéDouble}
          eclairs={g.eclairs}
          onTerminer={(r) => {
            const m = doubleTache(r.simple, r.double, r.presentes, r.rapportes);
            noter(def.id, { 'cout-relatif-pct': m.coutRelatif * 100, 'exactitude-double': m.exactitudeDouble, 'erreur-comptage': m.erreurComptage });
            consigner(def.id, [...depuisChoix(r.simple), ...depuisChoix(r.double), { stimulus: `éclairs:${r.presentes}`, reponse: String(r.rapportes), correcte: r.presentes === r.rapportes, tempsMs: null }]);
            suivante();
          }}
        />
      );
      break;
    case 'stroop':
      epreuve = (
        <EpreuveChoix<StimulusStroop>
          essais={g.stroop}
          entrainement={g.stroop.slice(0, 4)}
          options={COULEURS.map((c) => ({ valeur: c.nom, libelle: c.nom.charAt(0).toUpperCase() + c.nom.slice(1), touche: c.cle }))}
          afficher={(el, s) => {
            el.textContent = s.mot;
            el.style.color = s.encre;
          }}
          decrire={(s) => `${s.mot}/${s.encre}`}
          onTerminer={(r) => {
            const m = coutConditions(r, 'incongruent', 'congruent');
            noter(def.id, { 'cout-ms': m.coutMs, 'cout-exactitude': m.coutExactitude });
            consigner(def.id, depuisChoix(r));
            suivante();
          }}
        />
      );
      break;
    case 'alternance':
      epreuve = (
        <EpreuveChoix<StimulusAlternance>
          essais={g.alternance}
          entrainement={g.alternance.slice(0, 4)}
          options={[{ valeur: 'gauche', libelle: 'Pair · Voyelle', touche: 'f' }, { valeur: 'droite', libelle: 'Impair · Consonne', touche: 'j' }]}
          correspond={(rep, e) => rep === (e.attendue === 'pair' || e.attendue === 'voyelle' ? 'gauche' : 'droite')}
          afficher={(el, s) => {
            el.textContent = `${s.lettre}${s.chiffre}`;
            el.style.transform = `translateY(${s.position === 'haut' ? '-60px' : '60px'})`;
          }}
          decrire={(s) => `${s.lettre}${s.chiffre}@${s.position}`}
          decor={
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[0.8125rem] text-texte-2">
              <span className="text-center">Chiffre : pair ou impair</span>
              <span className="mx-auto h-px w-2/3 bg-separateur" />
              <span className="text-center">Lettre : voyelle ou consonne</span>
            </div>
          }
          delaiMaxMs={3000}
          onTerminer={(r) => {
            const m = coutConditions(r, 'changement', 'repetition');
            noter(def.id, { 'cout-ms': m.coutMs, 'cout-exactitude': m.coutExactitude });
            consigner(def.id, depuisChoix(r));
            suivante();
          }}
        />
      );
      break;
  }

  return <div key={def.id}>{epreuve}</div>;
}
