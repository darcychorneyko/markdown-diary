import { contextBridge, ipcRenderer } from 'electron';
import type { VaultApi } from '../src/types/ipc.js';

const vaultApi: VaultApi = {
  getLastVaultPath: () => ipcRenderer.invoke('settings:get-last-vault'),
  setLastVaultPath: (path: string | null) => ipcRenderer.invoke('settings:set-last-vault', path),
  chooseVault: () => ipcRenderer.invoke('vault:choose'),
  readVaultTree: (rootPath: string) => ipcRenderer.invoke('vault:tree', rootPath),
  readNote: (path: string) => ipcRenderer.invoke('vault:read-note', path),
  saveNote: (path: string, contents: string) => ipcRenderer.invoke('vault:save-note', path, contents),
  createNote: (parentPath: string, name: string) =>
    ipcRenderer.invoke('vault:create-note', parentPath, name),
  createFolder: (parentPath: string, name: string) =>
    ipcRenderer.invoke('vault:create-folder', parentPath, name),
  renamePath: (oldPath: string, newName: string) =>
    ipcRenderer.invoke('vault:rename-path', oldPath, newName),
  deletePath: (targetPath: string) => ipcRenderer.invoke('vault:delete-path', targetPath),
  watchVault: (rootPath: string) => ipcRenderer.invoke('vault:watch', rootPath),
  unwatchVault: (rootPath: string) => ipcRenderer.invoke('vault:unwatch', rootPath),
  onVaultChanged: (listener) => {
    const wrappedListener = (_event: unknown, payload: Parameters<typeof listener>[0]) => {
      listener(payload);
    };

    ipcRenderer.on('vault:changed', wrappedListener);

    return () => {
      ipcRenderer.off('vault:changed', wrappedListener);
    };
  },
  onMenuCommand: (listener) => {
    const wrappedListener = (_event: unknown, payload: Parameters<typeof listener>[0]) => {
      listener(payload);
    };

    ipcRenderer.on('menu:command', wrappedListener);

    return () => {
      ipcRenderer.off('menu:command', wrappedListener);
    };
  }
};

contextBridge.exposeInMainWorld('vaultApi', vaultApi);
