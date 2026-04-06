import fs from 'node:fs/promises';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { BrowserWindow, dialog, ipcMain } from 'electron';
import { buildVaultTree } from '../../src/lib/fs/vault-tree.js';
import { buildNotePath, buildRenamedPath } from '../../src/lib/fs/file-operations.js';
import type { VaultChangeEvent } from '../../src/lib/types.js';

const watchers = new Map<string, FSWatcher>();

function broadcastVaultChange(payload: VaultChangeEvent) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('vault:changed', payload);
  }
}

async function walkMarkdownPaths(rootPath: string): Promise<string[]> {
  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      paths.push(fullPath, ...(await walkMarkdownPaths(fullPath)));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
      paths.push(fullPath);
    }
  }

  return paths;
}

export function registerFilesystemIpc() {
  ipcMain.handle('vault:choose', async () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    const result = focusedWindow
      ? await dialog.showOpenDialog(focusedWindow, {
          properties: ['openDirectory']
        })
      : await dialog.showOpenDialog({
          properties: ['openDirectory']
        });

    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('vault:tree', async (_event, rootPath: string) => {
    const paths = await walkMarkdownPaths(rootPath);
    return buildVaultTree(rootPath, paths);
  });

  ipcMain.handle('vault:read-note', async (_event, notePath: string) => {
    const contents = await fs.readFile(notePath, 'utf8');
    const stat = await fs.stat(notePath);

    return {
      path: notePath,
      name: path.basename(notePath),
      contents,
      updatedAtMs: stat.mtimeMs
    };
  });

  ipcMain.handle('vault:save-note', async (_event, notePath: string, contents: string) => {
    await fs.writeFile(notePath, contents, 'utf8');
  });

  ipcMain.handle('vault:create-note', async (_event, parentPath: string, name: string) => {
    const nextPath = buildNotePath(parentPath, name);
    await fs.writeFile(nextPath, '', 'utf8');
    return nextPath;
  });

  ipcMain.handle('vault:create-folder', async (_event, parentPath: string, name: string) => {
    const nextPath = path.join(parentPath, name);
    await fs.mkdir(nextPath, { recursive: false });
    return nextPath;
  });

  ipcMain.handle('vault:rename-path', async (_event, oldPath: string, newName: string) => {
    const nextPath = buildRenamedPath(oldPath, newName);
    await fs.rename(oldPath, nextPath);
    return nextPath;
  });

  ipcMain.handle('vault:delete-path', async (_event, targetPath: string) => {
    await fs.rm(targetPath, { recursive: true, force: false });
  });

  ipcMain.handle('vault:watch', async (_event, rootPath: string) => {
    if (watchers.has(rootPath)) {
      return;
    }

    const watcher = chokidar.watch(rootPath, {
      ignoreInitial: true,
      depth: 10
    });

    watcher.on('all', (eventName, changedPath) => {
      broadcastVaultChange({
        eventName,
        path: changedPath
      });
    });

    watchers.set(rootPath, watcher);
  });

  ipcMain.handle('vault:unwatch', async (_event, rootPath: string) => {
    const watcher = watchers.get(rootPath);
    if (!watcher) {
      return;
    }

    watchers.delete(rootPath);
    await watcher.close();
  });
}
