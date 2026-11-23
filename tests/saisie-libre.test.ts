import { describe, expect, it } from 'vitest';
import { correspond, dedupliquer, normaliser, pente, productionParTranche } from '../src/moteur/saisie-libre';

describe('saisie libre', () => {
  it('normalise casse, espaces, apostrophes typographiques et ponctuation finale', () => {
    expect(normaliser('  L’Arrêté   Préfectoral. ')).toBe("l'arrêté préfectoral");
    expect(normaliser('Élément', { ignorerAccents: true })).toBe('element');
  });

  it('accepte la réponse, ses variantes, un article et un pluriel simple', () => {
    expect(correspond('Délégation', ['délégation'])).toBe(true);
    expect(correspond('la délégation', ['délégation'])).toBe(true);
    expect(correspond('délégations', ['délégation'])).toBe(true);
    expect(correspond('délégation de pouvoir', ['délégation', 'délégation de pouvoir'])).toBe(true);
    expect(correspond('déconcentration', ['délégation'])).toBe(false);
    expect(correspond('', ['délégation'])).toBe(false);
  });

  it('exige les accents par défaut, sauf option contraire', () => {
    expect(correspond('delegation', ['délégation'])).toBe(false);
    expect(correspond('delegation', ['délégation'], { ignorerAccents: true })).toBe(true);
  });

  it('déduplique en fluence en conservant l’ordre', () => {
    const r = dedupliquer(['chat', 'Chien', 'chats', 'cheval', 'chèval', 'chien']);
    expect(r.uniques).toEqual(['chat', 'Chien', 'cheval']);
    expect(r.doublons).toEqual(['chats', 'chèval', 'chien']);
  });

  it('compte la production par tranches de 15 secondes', () => {
    const s = [1000, 5000, 14999, 15000, 31000, 59999, 60000].map((tMs) => ({ mot: 'x', tMs }));
    expect(productionParTranche(s)).toEqual([3, 1, 1, 1]);
  });

  it('calcule une pente négative quand la production s’épuise', () => {
    expect(pente([8, 5, 3, 2])).toBeLessThan(0);
    expect(pente([3, 3, 3, 3])).toBe(0);
  });
});
