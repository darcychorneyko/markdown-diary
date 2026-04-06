import { createContext, useContext, useState } from 'react';
import type { VaultNode } from '../lib/types.js';

type AppStateValue = {
  vaultPath: string | null;
  tree: VaultNode[];
  setVault(vaultPath: string, tree: VaultNode[]): void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [tree, setTree] = useState<VaultNode[]>([]);

  const value: AppStateValue = {
    vaultPath,
    tree,
    setVault(nextPath, nextTree) {
      setVaultPath(nextPath);
      setTree(nextTree);
    }
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error('AppStateProvider missing');
  }

  return value;
}
