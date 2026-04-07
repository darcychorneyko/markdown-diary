import type {
  ExplorerContextMenuRequest,
  MenuCommandEvent,
  NoteDocument,
  VaultChangeEvent,
  VaultNode
} from '../lib/types.js';

export type VaultApi = {
  getLastVaultPath(): Promise<string | null>;
  setLastVaultPath(path: string | null): Promise<void>;
  chooseVault(): Promise<string | null>;
  readVaultTree(rootPath: string): Promise<VaultNode[]>;
  readNote(path: string): Promise<NoteDocument>;
  saveNote(path: string, contents: string): Promise<void>;
  createNote(parentPath: string, name: string): Promise<string>;
  createFolder(parentPath: string, name: string): Promise<string>;
  renamePath(oldPath: string, newName: string): Promise<string>;
  deletePath(targetPath: string): Promise<void>;
  watchVault(rootPath: string): Promise<void>;
  unwatchVault(rootPath: string): Promise<void>;
  onVaultChanged(listener: (event: VaultChangeEvent) => void): () => void;
  onMenuCommand(listener: (event: MenuCommandEvent) => void): () => void;
  showExplorerContextMenu(request: ExplorerContextMenuRequest): Promise<void>;
};

declare global {
  interface Window {
    vaultApi: VaultApi;
  }
}
