import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { demanderStockagePersistant, ouvrirBase, type Base } from '../stockage/db';
import { ecrireReglages, lireReglages, REGLAGES_PAR_DEFAUT } from '../stockage/reglages';
import type { Reglages } from '../stockage/types';

interface EtatApp {
  pret: boolean;
  db: Base | null;
  /** Vrai si IndexedDB est indisponible : seuls les réglages sont conservés. */
  modeDegrade: boolean;
  stockagePersistant: boolean | null;
  reglages: Reglages;
  modifierReglages: (modif: Partial<Reglages>) => Promise<void>;
  rechargerReglages: () => Promise<void>;
  /** Mode concentration : la barre d'onglets est masquée pendant une épreuve. */
  concentration: boolean;
  setConcentration: (v: boolean) => void;
}

const Contexte = createContext<EtatApp | null>(null);

export function FournisseurApp({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Base | null>(null);
  const [pret, setPret] = useState(false);
  const [modeDegrade, setModeDegrade] = useState(false);
  const [stockagePersistant, setStockagePersistant] = useState<boolean | null>(null);
  const [reglages, setReglages] = useState<Reglages>(REGLAGES_PAR_DEFAUT);
  const [concentration, setConcentration] = useState(false);

  useEffect(() => {
    let actif = true;
    (async () => {
      let base: Base | null = null;
      try {
        base = await ouvrirBase();
      } catch {
        setModeDegrade(true);
      }
      const r = await lireReglages(base);
      if (!actif) return;
      setDb(base);
      setReglages(r);
      setPret(true);
      setStockagePersistant(await demanderStockagePersistant().catch(() => null));
    })();
    return () => {
      actif = false;
    };
  }, []);

  // Application du thème et de la taille de police à la racine du document.
  useEffect(() => {
    const racine = document.documentElement;
    if (reglages.theme === 'auto') racine.removeAttribute('data-theme');
    else racine.setAttribute('data-theme', reglages.theme);
    racine.style.setProperty('--echelle', String(reglages.taillePolice / 100));
  }, [reglages.theme, reglages.taillePolice]);

  const modifierReglages = useCallback(
    async (modif: Partial<Reglages>) => {
      const suivants = { ...reglages, ...modif, id: 'reglages' as const };
      setReglages(suivants);
      await ecrireReglages(db, suivants);
    },
    [db, reglages],
  );

  const rechargerReglages = useCallback(async () => setReglages(await lireReglages(db)), [db]);

  return (
    <Contexte.Provider value={{ pret, db, modeDegrade, stockagePersistant, reglages, modifierReglages, rechargerReglages, concentration, setConcentration }}>
      {children}
    </Contexte.Provider>
  );
}

export function useApp(): EtatApp {
  const c = useContext(Contexte);
  if (!c) throw new Error('useApp doit être utilisé dans FournisseurApp');
  return c;
}
