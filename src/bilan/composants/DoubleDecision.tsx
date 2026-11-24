/**
 * Double décision (paradigme dérivé du Useful Field of View) : forme centrale + cible périphérique,
 * présentées pendant un nombre d'images fixé par l'escalier 3 réussites / 1 échec, puis masquées.
 */
import { useEffect, useRef, useState } from 'react';
import { estimerFrequence, presenter } from '../../chrono/horloge';
import { imagesPourDuree } from '../../chrono/mesure';
import { creerEscalier, enregistrerReponse, estimationSeuil, type EtatEscalier } from '../../moteur/escalier';
import type { EssaiDoubleDecision } from '../generateurs';
import { dureeDuNiveau, DUREES_DOUBLE_DECISION, seuilEnMs } from '../protocole';
import { attendre } from './commun';

const RAYON = 120;

const Voiture = ({ taille = 56 }: { taille?: number }) => (
  <svg width={taille} height={taille * 0.6} viewBox="0 0 100 60" aria-hidden="true">
    <path d="M8 40 L20 22 H62 L78 36 H94 V46 H8 Z" fill="currentColor" />
    <circle cx="26" cy="48" r="8" fill="currentColor" />
    <circle cx="76" cy="48" r="8" fill="currentColor" />
  </svg>
);
const Camion = ({ taille = 56 }: { taille?: number }) => (
  <svg width={taille} height={taille * 0.6} viewBox="0 0 100 60" aria-hidden="true">
    <rect x="4" y="6" width="62" height="38" fill="currentColor" />
    <path d="M68 18 H84 L96 32 V44 H68 Z" fill="currentColor" />
    <circle cx="20" cy="50" r="7" fill="currentColor" />
    <circle cx="44" cy="50" r="7" fill="currentColor" />
    <circle cx="82" cy="50" r="7" fill="currentColor" />
  </svg>
);

const positionXY = (p: number) => {
  const a = (p * Math.PI) / 4 - Math.PI / 2;
  return { x: Math.cos(a) * RAYON, y: Math.sin(a) * RAYON };
};

export interface ResultatDoubleDecision {
  essais: { niveau: number; dureeMs: number; images: number; ecartMs: number; correcte: boolean; forme: string; position: number; reponseForme: string; reponsePosition: number }[];
  seuilMs: number;
  periodeMs: number;
}

export function DoubleDecision({ essais, onTerminer }: { essais: readonly EssaiDoubleDecision[]; onTerminer: (r: ResultatDoubleDecision) => void }) {
  const stimulus = useRef<HTMLDivElement>(null);
  const masque = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'preparation' | 'presentation' | 'forme' | 'position'>('preparation');
  const [reponseForme, setReponseForme] = useState<string>('');
  const periode = useRef(16.667);
  const escalier = useRef<EtatEscalier>(creerEscalier({ niveauMin: 1, niveauMax: DUREES_DOUBLE_DECISION.length, niveauInitial: 3, reussitesPourMonter: 3 }));
  const derniere = useRef<{ images: number; ecartMs: number; niveau: number } | null>(null);
  const res = useRef<ResultatDoubleDecision['essais']>([]);
  const essai = essais[i]!;

  useEffect(() => {
    if (phase !== 'preparation') return;
    estimerFrequence(30).then((f) => {
      if (f) periode.current = f.periodeMs;
      setPhase('presentation');
    });
  }, [phase]);

  useEffect(() => {
    if (phase !== 'presentation') return;
    let annule = false;
    (async () => {
      await attendre(700);
      if (annule || !stimulus.current || !masque.current) return;
      const niveau = escalier.current.niveau;
      const images = imagesPourDuree(dureeDuNiveau(niveau), periode.current);
      const p = await presenter(
        images,
        periode.current,
        () => stimulus.current && (stimulus.current.style.visibility = 'visible'),
        () => {
          if (stimulus.current) stimulus.current.style.visibility = 'hidden';
          if (masque.current) masque.current.style.visibility = 'visible';
        },
      );
      derniere.current = { images, ecartMs: p.ecartMs, niveau };
      await attendre(250);
      if (masque.current) masque.current.style.visibility = 'hidden';
      if (!annule) setPhase('forme');
    })();
    return () => {
      annule = true;
    };
  }, [phase, i]);

  const repondrePosition = (pos: number) => {
    const d = derniere.current!;
    const correcte = reponseForme === essai.forme && pos === essai.position;
    res.current.push({
      niveau: d.niveau, dureeMs: d.images * periode.current, images: d.images, ecartMs: d.ecartMs, correcte,
      forme: essai.forme, position: essai.position, reponseForme, reponsePosition: pos,
    });
    escalier.current = enregistrerReponse(escalier.current, correcte);
    if (i + 1 < essais.length) {
      setI(i + 1);
      setPhase('presentation');
    } else {
      const s = estimationSeuil(escalier.current, 6);
      onTerminer({ essais: res.current, seuilMs: seuilEnMs(s ?? escalier.current.niveau), periodeMs: periode.current });
    }
  };

  const { x, y } = positionXY(essai.position);
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-4 py-6">
      <p className="text-[0.875rem] text-texte-2">Essai {i + 1} sur {essais.length}</p>
      <div className="relative h-[300px] w-[300px] rounded-full bg-surface" aria-hidden={phase === 'presentation'}>
        <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-1/2 rounded-full bg-texte-2" />
        <div ref={stimulus} style={{ visibility: 'hidden' }} className="absolute inset-0 text-texte">
          <div className="absolute top-1/2 left-1/2 -translate-1/2">{essai.forme === 'voiture' ? <Voiture /> : <Camion />}</div>
          <div className="absolute top-1/2 left-1/2" style={{ transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))` }}>
            <div className="h-7 w-7 rounded-full bg-accent" />
          </div>
        </div>
        <div ref={masque} style={{ visibility: 'hidden' }} className="absolute inset-0 overflow-hidden rounded-full">
          <svg viewBox="0 0 300 300" className="h-full w-full text-texte-2" aria-hidden="true">
            {Array.from({ length: 180 }, (_, k) => (
              <rect key={k} x={(k * 37) % 300} y={(k * 53) % 300} width={10 + (k % 4) * 6} height={10 + (k % 3) * 6} fill="currentColor" opacity={0.25 + (k % 5) * 0.12} />
            ))}
          </svg>
        </div>
        {phase === 'position' && Array.from({ length: 8 }, (_, p) => {
          const q = positionXY(p);
          return (
            <button
              key={p}
              type="button"
              aria-label={`Position ${p + 1}`}
              onClick={() => repondrePosition(p)}
              className="absolute top-1/2 left-1/2 h-12 w-12 rounded-full border-2 border-accent bg-accent-doux"
              style={{ transform: `translate(calc(${q.x}px - 50%), calc(${q.y}px - 50%))` }}
            />
          );
        })}
      </div>
      {phase === 'forme' && (
        <div className="w-full space-y-3">
          <p className="text-center text-[1.0625rem]">Quelle forme était au centre ?</p>
          <div className="grid grid-cols-2 gap-3">
            {(['voiture', 'camion'] as const).map((f) => (
              <button key={f} type="button" onClick={() => { setReponseForme(f); setPhase('position'); }} className="flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-[16px] bg-surface shadow-sm">
                {f === 'voiture' ? <Voiture taille={48} /> : <Camion taille={48} />}
                <span className="text-[0.9375rem] font-semibold">{f === 'voiture' ? 'Voiture' : 'Camion'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {phase === 'position' && <p className="text-center text-[1.0625rem]">Où se trouvait le point ?</p>}
    </div>
  );
}
