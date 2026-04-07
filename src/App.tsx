import { useEffect, useState } from 'react';
import type { ExplorerContextMenuRequest } from './lib/types.js';
import { ConflictDialog } from './components/dialogs/conflict-dialog.js';
import { NamePromptDialog } from './components/dialogs/name-prompt-dialog.js';
import { MarkdownEditor } from './components/editor/markdown-editor.js';
import { MarkdownPreview } from './components/editor/markdown-preview.js';
import { resolveWikiLink } from './lib/links/link-resolution.js';
import { Shell } from './components/layout/shell.js';
import { VaultTree } from './components/sidebar/vault-tree.js';
import { AppStateProvider, useAppState } from './state/app-state.js';

type PromptState =
  | null
  | { kind: 'rename-note'; targetPath: string; initialValue: string }
  | { kind: 'rename-folder'; targetPath: string; initialValue: string }
  | { kind: 'new-note'; targetPath: string; initialValue: string }
  | { kind: 'new-folder'; targetPath: string; initialValue: string };

function normalizeNoteName(name: string) {
  return name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
}

function basenameForPrompt(targetPath: string) {
  return targetPath.split(/[\\/]/).filter(Boolean).at(-1) ?? targetPath;
}

function AppBody() {
  const {
    activeNote,
    draftContents,
    hasConflict,
    tree,
    vaultPath,
    setVault,
    openNote,
    updateDraft,
    markSaved,
    markConflict,
    clearConflict,
    clearActiveNote
  } = useAppState();
  const [openVaultError, setOpenVaultError] = useState<string | null>(null);
  const [promptState, setPromptState] = useState<PromptState>(null);

  async function handleOpenVault() {
    try {
      const nextVaultPath = await window.vaultApi.chooseVault();
      if (!nextVaultPath) {
        return;
      }

      const nextTree = await window.vaultApi.readVaultTree(nextVaultPath);
      setVault(nextVaultPath, nextTree);
      setOpenVaultError(null);

      void window.vaultApi.setLastVaultPath(nextVaultPath).catch(() => {
        // Keep the vault open even if settings persistence fails.
      });
    } catch (error) {
      const details = error instanceof Error ? `: ${error.message}` : '.';
      setOpenVaultError(`Failed to open the vault picker${details}`);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function restoreLastVault() {
      const savedVaultPath = await window.vaultApi.getLastVaultPath();
      if (!savedVaultPath) {
        return;
      }

      try {
        const nextTree = await window.vaultApi.readVaultTree(savedVaultPath);
        if (!cancelled) {
          setVault(savedVaultPath, nextTree);
        }
      } catch {
        // Ignore stale saved paths and start empty.
      }
    }

    void restoreLastVault();

    return () => {
      cancelled = true;
    };
  }, [setVault]);

  useEffect(() => {
    const unsubscribe = window.vaultApi.onMenuCommand((event) => {
      if (event.command === 'open-vault') {
        void handleOpenVault();
        return;
      }

      if (event.command === 'new-note') {
        setPromptState({ kind: 'new-note', targetPath: event.targetPath, initialValue: 'Untitled' });
        return;
      }

      if (event.command === 'new-folder') {
        setPromptState({
          kind: 'new-folder',
          targetPath: event.targetPath,
          initialValue: 'New Folder'
        });
        return;
      }

      if (event.command === 'rename-path') {
        const initialValue = basenameForPrompt(event.targetPath);
        setPromptState({
          kind: initialValue.toLowerCase().endsWith('.md') ? 'rename-note' : 'rename-folder',
          targetPath: event.targetPath,
          initialValue
        });
        return;
      }

      if (event.command === 'delete-path') {
        void handleDeletePath(event.targetPath);
      }
    });

    return unsubscribe;
  }, [handleDeletePath, handleOpenVault]);

  async function refreshTree(rootPath: string) {
    const nextTree = await window.vaultApi.readVaultTree(rootPath);
    setVault(rootPath, nextTree);
  }

  useEffect(() => {
    if (!vaultPath) {
      return;
    }

    void window.vaultApi.watchVault(vaultPath);

    return () => {
      void window.vaultApi.unwatchVault(vaultPath);
    };
  }, [vaultPath]);

  useEffect(() => {
    const unsubscribe = window.vaultApi.onVaultChanged(async (event) => {
      if (vaultPath) {
        await refreshTree(vaultPath);
      }

      if (!activeNote || event.path !== activeNote.path) {
        return;
      }

      const isDirty = draftContents !== activeNote.contents;
      if (isDirty) {
        markConflict();
        return;
      }

      const nextNote = await window.vaultApi.readNote(activeNote.path);
      markSaved(nextNote);
    });

    return unsubscribe;
  }, [activeNote, draftContents, markConflict, markSaved, setVault, vaultPath]);

  async function handleDeletePath(targetPath: string) {
    await window.vaultApi.deletePath(targetPath);
    if (activeNote?.path === targetPath) {
      clearActiveNote();
    }
    if (vaultPath) {
      await refreshTree(vaultPath);
    }
  }

  async function handleOpenNote(notePath: string) {
    const note = await window.vaultApi.readNote(notePath);
    openNote(note);
  }

  async function handleSave() {
    if (!activeNote) {
      return;
    }

    await window.vaultApi.saveNote(activeNote.path, draftContents);
    markSaved({
      ...activeNote,
      contents: draftContents
    });
  }

  async function handleReloadFromDisk() {
    if (!activeNote) {
      return;
    }

    const nextNote = await window.vaultApi.readNote(activeNote.path);
    markSaved(nextNote);
  }

  function handleKeepMine() {
    clearConflict();
  }

  async function handlePreviewNavigate(target: string) {
    const normalizedTreePaths = tree.flatMap((node) => {
      if (node.kind === 'note') {
        return [node.path];
      }

      const collect = (children: typeof node.children): string[] =>
        children.flatMap((child) => (child.kind === 'note' ? [child.path] : collect(child.children)));

      return collect(node.children);
    });

    if (target.startsWith('__wiki__/')) {
      const resolution = resolveWikiLink(
        decodeURIComponent(target.slice('__wiki__/'.length)),
        normalizedTreePaths
      );
      if (resolution.kind === 'resolved') {
        await handleOpenNote(resolution.path);
      }
      return;
    }

    const nextPath = activeNote
      ? new URL(target, `file:///${activeNote.path.replace(/\\/g, '/')}`).pathname.replace(/^\//, '')
      : target;

    const decodedPath = nextPath.replace(/\//g, '\\');
    await handleOpenNote(decodedPath);
  }

  function handleOpenContextMenu(request: ExplorerContextMenuRequest) {
    void window.vaultApi.showExplorerContextMenu(request);
  }

  function getVaultLabel(rootPath: string) {
    return rootPath.split(/[\\/]/).filter(Boolean).at(-1) ?? rootPath;
  }

  async function handlePromptConfirm(value: string) {
    if (!promptState) {
      return;
    }

    if (promptState.kind === 'new-note') {
      await window.vaultApi.createNote(promptState.targetPath, normalizeNoteName(value));
    } else if (promptState.kind === 'new-folder') {
      await window.vaultApi.createFolder(promptState.targetPath, value);
    } else if (promptState.kind === 'rename-note') {
      await window.vaultApi.renamePath(promptState.targetPath, normalizeNoteName(value));
    } else {
      await window.vaultApi.renamePath(promptState.targetPath, value);
    }

    setPromptState(null);
    if (vaultPath) {
      await refreshTree(vaultPath);
    }
  }

  return (
    <Shell
      sidebar={
        <>
          {openVaultError ? <p>{openVaultError}</p> : null}
          {vaultPath ? (
            <button
              className="vault-root-button"
              onContextMenu={(event) => {
                event.preventDefault();
                handleOpenContextMenu({
                  kind: 'vault-root',
                  targetPath: vaultPath
                });
              }}
            >
              {getVaultLabel(vaultPath)}
            </button>
          ) : null}
          {vaultPath ? <p>{vaultPath}</p> : null}
          {vaultPath && tree.length === 0 ? <p>No markdown notes found in this vault yet.</p> : null}
          <VaultTree nodes={tree} onOpenNote={handleOpenNote} onOpenContextMenu={handleOpenContextMenu} />
          {promptState ? (
            <NamePromptDialog
              title={
                promptState.kind === 'new-note'
                  ? 'New Note'
                  : promptState.kind === 'new-folder'
                    ? 'New Folder'
                    : 'Rename'
              }
              initialValue={promptState.initialValue}
              confirmLabel="Confirm"
              onConfirm={(value) => {
                void handlePromptConfirm(value);
              }}
              onCancel={() => setPromptState(null)}
            />
          ) : null}
        </>
      }
      editor={
        activeNote ? (
          <>
            <header>
              <strong>{activeNote.name}</strong>
              <button onClick={handleSave}>Save</button>
            </header>
            <MarkdownEditor value={draftContents} onChange={updateDraft} />
          </>
        ) : (
          <div>Select a note</div>
        )
      }
      preview={
        <>
          {activeNote ? (
            <MarkdownPreview value={draftContents} onNavigate={handlePreviewNavigate} />
          ) : (
            <div>Preview unavailable</div>
          )}
          {hasConflict ? (
            <ConflictDialog onReload={handleReloadFromDisk} onKeepMine={handleKeepMine} />
          ) : null}
        </>
      }
    />
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppBody />
    </AppStateProvider>
  );
}
