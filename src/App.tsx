import { Shell } from './components/layout/shell.js';
import { VaultTree } from './components/sidebar/vault-tree.js';
import { AppStateProvider, useAppState } from './state/app-state.js';

function AppBody() {
  const { tree, vaultPath, setVault } = useAppState();

  async function handleOpenVault() {
    const nextVaultPath = await window.vaultApi.chooseVault();
    if (!nextVaultPath) {
      return;
    }

    const nextTree = await window.vaultApi.readVaultTree(nextVaultPath);
    setVault(nextVaultPath, nextTree);
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

  return (
    <Shell
      sidebar={
        <>
          <button onClick={handleOpenVault}>Open Vault</button>
          {vaultPath ? <p>{vaultPath}</p> : null}
          {vaultPath && tree.length === 0 ? <p>No markdown notes found in this vault yet.</p> : null}
          <VaultTree
            nodes={tree}
            onOpenNote={() => {}}
            onCreateNote={handleCreateNote}
            onCreateFolder={handleCreateFolder}
            onRenamePath={handleRenamePath}
            onDeletePath={handleDeletePath}
          />
        </>
      }
      editor={<div>Select a note</div>}
      preview={<div>Preview unavailable</div>}
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
