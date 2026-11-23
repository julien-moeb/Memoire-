/** Retour haptique bref quand l'appareil le permet (Android ; l'API n'existe pas sur Safari pour iPhone). */
export function haptique(motif: number | number[] = 10): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(motif);
  } catch {
    /* sans effet */
  }
}
