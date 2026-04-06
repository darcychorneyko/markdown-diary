import { useState } from 'react';
import { MarkdownEditor } from './components/editor/markdown-editor.js';
import { MarkdownPreview } from './components/editor/markdown-preview.js';
import { resolveWikiLink } from './lib/links/link-resolution.js';
import { Shell } from './components/layout/shell.js';
import { VaultTree } from './components/sidebar/vault-tree.js';
import { AppStateProvider, useAppState } from './state/app-state.js';

function AppBody() {
  const { activeNote, draftContents, tree, vaultPath, setVault, openNote, updateDraft } =
    useAppState();
  const [openVaultError, setOpenVaultError] = useState<string | null>(null);

  async function handleOpenVault() {
    try {
      const nextVaultPath = await window.vaultApi.chooseVault();
      if (!nextVaultPath) {
        return;
      }

      const nextTree = await window.vaultApi.readVaultTree(nextVaultPath);
      setVault(nextVaultPath, nextTree);
      setOpenVaultError(null);
    } catch (error) {
      const details = error instanceof Error ? `: ${error.message}` : '.';
      setOpenVaultError(`Failed to open the vault picker${details}`);
    }
  }

  async function refreshTree(rootPath: string) {
    const nextTree = await window.vaultApi.readVaultTree(rootPath);
    setVault(rootPath, nextTree);
  }

  async function handleCreateNote(parentPath: string) {
    await window.vaultApi.createNote(parentPath, 'Untitled');
    if (vaultPath) {
      await refreshTree(vaultPath);
    }
  }

  async function handleCreateFolder(parentPath: string) {
    await window.vaultApi.createFolder(parentPath, 'New Folder');
    if (vaultPath) {
      await refreshTree(vaultPath);
    }
  }

  async function handleRenamePath(targetPath: string) {
    await window.vaultApi.renamePath(targetPath, 'Renamed.md');
    if (vaultPath) {
      await refreshTree(vaultPath);
    }
  }

  async function handleDeletePath(targetPath: string) {
    await window.vaultApi.deletePath(targetPath);
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

  return (
    <Shell
      sidebar={
        <>
          <button onClick={handleOpenVault}>Open Vault</button>
          {openVaultError ? <p>{openVaultError}</p> : null}
          {vaultPath ? <p>{vaultPath}</p> : null}
          {vaultPath && tree.length === 0 ? <p>No markdown notes found in this vault yet.</p> : null}
          <VaultTree
            nodes={tree}
            onOpenNote={handleOpenNote}
            onCreateNote={handleCreateNote}
            onCreateFolder={handleCreateFolder}
            onRenamePath={handleRenamePath}
            onDeletePath={handleDeletePath}
          />
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
        activeNote ? (
          <MarkdownPreview value={draftContents} onNavigate={handlePreviewNavigate} />
        ) : (
          <div>Preview unavailable</div>
        )
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
