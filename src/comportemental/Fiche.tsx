/** Exercice 23 : fiches de stratégies de compensation (psychoéducation). */
import type { ItemStrategie } from '../contenu/schemas';
import { strategies } from '../seance/contenu';
import { lien } from '../etat/routeur';

export const NOMS_CATEGORIES: Record<ItemStrategie['categorie'], string> = {
  pendant: "Pendant l'échange",
  preparation: 'Avant : se préparer',
  regulation: "Réguler l'activation",
  organisation: 'Organiser son environnement',
};

export const ficheParId = (id: string) => strategies().find((f) => f.id === id);

export function FicheDetail({ fiche, avecLienOutil = true }: { fiche: ItemStrategie; avecLienOutil?: boolean }) {
  return (
    <article className="ombre-carte space-y-4 rounded-[18px] bg-surface p-5">
      <header>
        <p className="text-[0.8125rem] font-semibold tracking-wide text-texte-2 uppercase">{NOMS_CATEGORIES[fiche.categorie]}</p>
        <h2 className="mt-1 text-[1.5rem] font-bold">{fiche.titre}</h2>
        <p className="mt-1 text-[1.0625rem] text-texte-2">{fiche.resume}</p>
      </header>
      <section>
        <h3 className="text-[0.9375rem] font-semibold">Quand l'utiliser</h3>
        <p className="mt-1 leading-relaxed">{fiche.quand}</p>
      </section>
      <section>
        <h3 className="text-[0.9375rem] font-semibold">Pourquoi cela aide</h3>
        <p className="mt-1 leading-relaxed">{fiche.principe}</p>
      </section>
      <section>
        <h3 className="text-[0.9375rem] font-semibold">Comment faire</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 leading-relaxed">
          {fiche.etapes.map((e) => <li key={e}>{e}</li>)}
        </ol>
      </section>
      <section className="rounded-[12px] bg-surface-2 p-3">
        <h3 className="text-[0.9375rem] font-semibold">Exemple</h3>
        <p className="mt-1 leading-relaxed">{fiche.exemple}</p>
      </section>
      {fiche.aEviter && (
        <section>
          <h3 className="text-[0.9375rem] font-semibold">À éviter</h3>
          <p className="mt-1 leading-relaxed">{fiche.aEviter}</p>
        </section>
      )}
      {avecLienOutil && fiche.outil === 'respiration' && (
        <a href={lien('/respiration')} className="flex min-h-[48px] items-center justify-center rounded-[14px] bg-accent-doux font-semibold text-accent">
          S'entraîner avec la respiration guidée
        </a>
      )}
    </article>
  );
}
