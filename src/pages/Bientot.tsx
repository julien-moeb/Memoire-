import { Carte, GrandTitre, Page } from '../ui/composants';

/** Écran provisoire pour les fonctions des incréments suivants. */
export function Bientot({ titre, texte }: { titre: string; texte: string }) {
  return (
    <Page>
      <GrandTitre>{titre}</GrandTitre>
      <Carte>
        <p className="text-[1.0625rem] leading-relaxed">{texte}</p>
        <p className="mt-3 text-[0.9375rem] text-texte-2">Cette fonction sera disponible dans une prochaine version.</p>
      </Carte>
    </Page>
  );
}
