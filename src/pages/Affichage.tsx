import { useRef, useState } from 'react';
import { Bandeau, Bouton, Carte, GrandTitre, ListeGroupee, Ligne, Page } from '../ui/composants';
import { estimerFrequence, presenter, profilAppareil } from '../chrono/horloge';
import { imagesPourDuree } from '../chrono/mesure';
import { moyenne } from '../moteur/statistiques';
import { useApp } from '../etat/contexte';
import type { Appareil } from '../stockage/types';

const nombre = (n: number, d = 1) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });

/** Mesure de la fréquence d'affichage et test de présentation brève (50 ms visés). */
export function Affichage() {
  const { db } = useApp();
  const [etat, setEtat] = useState<'repos' | 'mesure' | 'fini'>('repos');
  const [appareil, setAppareil] = useState<Appareil | null>(null);
  const [test, setTest] = useState<{ images: number; ecartMoyen: number; ecartMax: number } | null>(null);
  const cible = useRef<HTMLDivElement>(null);

  const lancer = async () => {
    setEtat('mesure');
    setTest(null);
    const f = await estimerFrequence();
    if (!f) {
      setEtat('repos');
      return;
    }
    const profil = profilAppareil(f);
    setAppareil(profil);
    await db?.put('appareils', profil);

    const images = imagesPourDuree(50, f.periodeMs);
    const ecarts: number[] = [];
    for (let i = 0; i < 12; i++) {
      const p = await presenter(
        images,
        f.periodeMs,
        () => cible.current && (cible.current.style.visibility = 'visible'),
        () => cible.current && (cible.current.style.visibility = 'hidden'),
      );
      ecarts.push(Math.abs(p.ecartMs));
      await new Promise((r) => setTimeout(r, 120));
    }
    setTest({ images, ecartMoyen: moyenne(ecarts), ecartMax: Math.max(...ecarts) });
    setEtat('fini');
  };

  return (
    <Page>
      <GrandTitre sousTitre="Réglages">Mesure de l'affichage</GrandTitre>
      <Carte>
        <p className="text-[1rem] leading-relaxed">
          La mesure dure environ cinq secondes. Un carré clignotera brièvement douze fois : gardez la page au premier plan et
          ne touchez à rien.
        </p>
        <div className="my-6 flex h-24 items-center justify-center" aria-hidden="true">
          <div ref={cible} className="h-16 w-16 rounded-xl bg-texte" style={{ visibility: 'hidden' }} />
        </div>
        <Bouton onClick={lancer} desactive={etat === 'mesure'} className="w-full">
          {etat === 'mesure' ? 'Mesure en cours…' : etat === 'fini' ? 'Recommencer' : 'Lancer la mesure'}
        </Bouton>
      </Carte>

      {appareil && (
        <ListeGroupee
          titre="Résultats"
          pied="Ces valeurs sont enregistrées avec chaque séance. Un changement d'appareil sera signalé sur vos courbes, car les temps mesurés ne sont comparables que sur un même appareil."
        >
          <Ligne libelle="Fréquence d'affichage" valeur={`${nombre(appareil.frequenceHz, 0)} Hz`} />
          <Ligne libelle="Durée d'une image" valeur={`${nombre(appareil.periodeMs, 2)} ms`} />
          <Ligne libelle="Irrégularité des images" valeur={`${nombre(appareil.gigueMs, 2)} ms`} />
          {test && (
            <>
              <Ligne libelle="Présentation de 50 ms" valeur={`${test.images} image${test.images > 1 ? 's' : ''}`} />
              <Ligne libelle="Écart moyen d'affichage" valeur={`${nombre(test.ecartMoyen, 2)} ms`} />
              <Ligne libelle="Écart maximal" valeur={`${nombre(test.ecartMax, 2)} ms`} />
            </>
          )}
        </ListeGroupee>
      )}
      {test && test.ecartMax > (appareil?.periodeMs ?? 17) * 0.5 && (
        <div className="mt-4">
          <Bandeau ton="attention">
            Des images ont été manquées pendant le test. Fermez les autres onglets ou applications, puis recommencez ; si le
            problème persiste, préférez un autre appareil pour les épreuves chronométrées.
          </Bandeau>
        </div>
      )}
    </Page>
  );
}
