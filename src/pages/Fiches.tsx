import { useState } from 'react';
import { GrandTitre, ListeGroupee, Ligne, Page, Bouton } from '../ui/composants';
import { strategies } from '../seance/contenu';
import { CATEGORIES_STRATEGIE } from '../contenu/schemas';
import { FicheDetail, NOMS_CATEGORIES } from '../comportemental/Fiche';
import { lien } from '../etat/routeur';

export function Fiches() {
  const toutes = strategies();
  const [choisie, setChoisie] = useState<string | null>(null);
  const fiche = toutes.find((f) => f.id === choisie);

  if (fiche) {
    return (
      <Page>
        <div className="pt-4"><Bouton variante="simple" className="px-1" onClick={() => setChoisie(null)}>‹ Toutes les fiches</Bouton></div>
        <div className="mt-2"><FicheDetail fiche={fiche} /></div>
      </Page>
    );
  }
  return (
    <Page>
      <GrandTitre sousTitre="Compenser et réguler">Fiches de stratégies</GrandTitre>
      <p className="px-1 text-[0.9375rem] leading-relaxed text-texte-2">
        Ces stratégies s'inspirent du programme MAAT, dont l'efficacité a été étudiée dans son ensemble, avec un
        thérapeute. Choisissez-en une ou deux à la fois et essayez-les dans des situations réelles ; le journal vous
        permettra de voir ce qui vous aide.
      </p>
      {CATEGORIES_STRATEGIE.map((c) => (
        <ListeGroupee key={c} titre={NOMS_CATEGORIES[c]}>
          {toutes.filter((f) => f.categorie === c).map((f) => (
            <Ligne key={f.id} libelle={f.titre} detail={f.resume} onClick={() => { setChoisie(f.id); window.scrollTo({ top: 0 }); }} />
          ))}
        </ListeGroupee>
      ))}
      <ListeGroupee titre="Exercice guidé">
        <Ligne libelle="Respiration lente" detail="Deux ou cinq minutes, environ six cycles par minute" href={lien('/respiration')} />
      </ListeGroupee>
    </Page>
  );
}
