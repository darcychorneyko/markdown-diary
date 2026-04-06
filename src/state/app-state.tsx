import { createContext, useContext, useState } from 'react';
import type { NoteDocument, VaultNode } from '../lib/types.js';

type AppStateValue = {
  vaultPath: string | null;
  tree: VaultNode[];
  activeNote: NoteDocument | null;
  draftContents: string;
  setVault(vaultPath: string, tree: VaultNode[]): void;
  openNote(note: NoteDocument): void;
  updateDraft(contents: string): void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [tree, setTree] = useState<VaultNode[]>([]);
  const [activeNote, setActiveNote] = useState<NoteDocument | null>(null);
  const [draftContents, setDraftContents] = useState('');

  const value: AppStateValue = {
    vaultPath,
    tree,
    activeNote,
    draftContents,
    setVault(nextPath, nextTree) {
      setVaultPath(nextPath);
      setTree(nextTree);
    },
    openNote(note) {
      setActiveNote(note);
      setDraftContents(note.contents);
    },
    updateDraft(contents) {
      setDraftContents(contents);
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
