import { createContext, useContext, useState } from 'react';
import type { NoteDocument, VaultNode } from '../lib/types.js';

type AppStateValue = {
  vaultPath: string | null;
  tree: VaultNode[];
  activeNote: NoteDocument | null;
  draftContents: string;
  hasConflict: boolean;
  setVault(vaultPath: string, tree: VaultNode[]): void;
  openNote(note: NoteDocument): void;
  updateDraft(contents: string): void;
  markSaved(note: NoteDocument): void;
  markConflict(): void;
  clearConflict(): void;
  clearActiveNote(): void;
  moveActiveNote(nextPath: string): void;
};

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [tree, setTree] = useState<VaultNode[]>([]);
  const [activeNote, setActiveNote] = useState<NoteDocument | null>(null);
  const [draftContents, setDraftContents] = useState('');
  const [hasConflict, setHasConflict] = useState(false);

  const value: AppStateValue = {
    vaultPath,
    tree,
    activeNote,
    draftContents,
    hasConflict,
    setVault(nextPath, nextTree) {
      setVaultPath(nextPath);
      setTree(nextTree);
    },
    openNote(note) {
      setActiveNote(note);
      setDraftContents(note.contents);
      setHasConflict(false);
    },
    updateDraft(contents) {
      setDraftContents(contents);
    },
    markSaved(note) {
      setActiveNote(note);
      setDraftContents(note.contents);
      setHasConflict(false);
    },
    markConflict() {
      setHasConflict(true);
    },
    clearConflict() {
      setHasConflict(false);
    },
    clearActiveNote() {
      setActiveNote(null);
      setDraftContents('');
      setHasConflict(false);
    },
    moveActiveNote(nextPath) {
      setActiveNote((currentNote) => {
        if (!currentNote) {
          return null;
        }

        return {
          ...currentNote,
          path: nextPath,
          name: nextPath.split(/[\\/]/).filter(Boolean).at(-1) ?? nextPath
        };
      });
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
