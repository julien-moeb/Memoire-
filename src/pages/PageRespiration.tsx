import { useState } from 'react';
import { ControleSegmente, GrandTitre, Page } from '../ui/composants';
import { Respiration } from '../comportemental/Respiration';
import { lien } from '../etat/routeur';

export function PageRespiration() {
  const [minutes, setMinutes] = useState(2);
  const [cle, setCle] = useState(0);
  return (
    <Page>
      <GrandTitre sousTitre="Réguler l'activation">Respiration lente</GrandTitre>
      <p className="px-1 text-[0.9375rem] leading-relaxed text-texte-2">
        À pratiquer au calme, de préférence chaque jour, pour qu'une ou deux expirations lentes suffisent ensuite avant
        une situation exigeante.
      </p>
      <div className="mt-4">
        <ControleSegmente
          libelle="Durée"
          options={[{ valeur: 2, texte: '2 minutes' }, { valeur: 5, texte: '5 minutes' }]}
          valeur={minutes}
          onChange={(m) => { setMinutes(m); setCle((k) => k + 1); }}
        />
      </div>
      <Respiration key={`${minutes}-${cle}`} dureeMs={minutes * 60_000} onTerminer={() => (location.hash = lien('/fiches'))} libelleFin="Retour aux fiches" />
    </Page>
  );
}
