import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import { registerFilesystemIpc } from './ipc/filesystem.js';
import { registerSettingsIpc } from './settings.js';
import type { MenuCommandEvent } from '../src/lib/types.js';

const isDev = !app.isPackaged;

function broadcastMenuCommand(payload: MenuCommandEvent) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('menu:command', payload);
  }
}

function buildAppMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Vault',
          click: () => broadcastMenuCommand({ command: 'open-vault' })
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
    }
  ]);

  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const preloadPath = path.join(app.getAppPath(), 'dist-electron', 'electron', 'preload.cjs');
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    void mainWindow.loadURL('http://127.0.0.1:5173');
    return;
  }

  void mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'));
}

app.whenReady().then(() => {
  registerSettingsIpc();
  registerFilesystemIpc();
  buildAppMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
