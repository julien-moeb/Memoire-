/**
 * Chronométrage côté navigateur.
 *
 * Principes :
 * 1. Les stimuli sont affichés et masqués dans un rappel requestAnimationFrame, en modifiant
 *    directement le DOM (et non l'état React, dont le rendu est différé et non synchronisé).
 * 2. L'instant d'apparition est l'horodatage de l'image où le DOM a été modifié.
 * 3. Le temps de réponse est `event.timeStamp − apparition` : les deux sont dans la même base
 *    de temps que performance.now().
 * Limite : la latence du clavier ou de l'écran tactile (10 à 50 ms) n'est pas mesurable depuis
 * une page web. Elle est stable sur un même appareil, d'où l'enregistrement d'un profil d'appareil.
 */
import { empreinteAppareil, ecartAffichage, frequenceDepuisHorodatages, type FrequenceAffichage } from './mesure';
import type { Appareil } from '../stockage/types';

export const maintenant = (): number => performance.now();

export function prochaineImage(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export async function estimerFrequence(nombreImages = 90): Promise<FrequenceAffichage | null> {
  const horodatages: number[] = [];
  await prochaineImage(); // écarte la première image, souvent irrégulière
  for (let i = 0; i < nombreImages; i++) horodatages.push(await prochaineImage());
  return frequenceDepuisHorodatages(horodatages);
}

export interface Presentation {
  /** Instant (performance.now) de l'image où le stimulus est apparu. */
  apparition: number;
  /** Instant de l'image où il a été masqué. */
  masquage: number;
  dureeMesureeMs: number;
  ecartMs: number;
}

/**
 * Affiche un stimulus pendant `images` images exactement.
 * `afficher` et `masquer` doivent modifier le DOM de façon synchrone (via une ref).
 */
export function presenter(images: number, periodeMs: number, afficher: () => void, masquer: () => void): Promise<Presentation> {
  return new Promise((resolve) => {
    let apparition = 0;
    let compte = 0;
    const image = (t: number) => {
      if (compte === 0) {
        afficher();
        apparition = t;
      } else if (compte === images) {
        masquer();
        const dureeMesureeMs = t - apparition;
        resolve({ apparition, masquage: t, dureeMesureeMs, ecartMs: ecartAffichage(dureeMesureeMs, images, periodeMs) });
        return;
      }
      compte++;
      requestAnimationFrame(image);
    };
    requestAnimationFrame(image);
  });
}

export function tempsDeReponse(evenement: { timeStamp: number }, apparition: number): number {
  return evenement.timeStamp - apparition;
}

export function profilAppareil(frequence: FrequenceAffichage): Appareil {
  const ua = navigator.userAgent;
  const largeur = screen.width;
  const hauteur = screen.height;
  const ratio = window.devicePixelRatio || 1;
  const hzArrondi = Math.round(frequence.frequenceHz);
  return {
    id: empreinteAppareil([ua, largeur, hauteur, ratio, hzArrondi]),
    creeLe: new Date().toISOString(),
    userAgent: ua,
    largeurEcran: largeur,
    hauteurEcran: hauteur,
    ratioPixels: ratio,
    frequenceHz: frequence.frequenceHz,
    periodeMs: frequence.periodeMs,
    gigueMs: frequence.gigueMs,
  };
}
