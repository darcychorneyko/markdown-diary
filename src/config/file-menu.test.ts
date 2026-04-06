import { describe, expect, it, vi } from 'vitest';

const send = vi.fn();
const setApplicationMenu = vi.fn();
const buildFromTemplate = vi.fn((template) => template);
const whenReady = vi.fn(async () => {});
const on = vi.fn();
const quit = vi.fn();
const handle = vi.fn();
const getAllWindows = vi.fn(() => [{ webContents: { send } }]);
const BrowserWindow = vi.fn(() => ({
  loadURL: vi.fn(),
  loadFile: vi.fn(),
  webContents: {
    send
  }
}));
BrowserWindow.getAllWindows = getAllWindows;
const getAppPath = vi.fn(() => 'C:/app');
const getPath = vi.fn(() => 'C:/users/appdata');

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    whenReady,
    on,
    quit,
    getAppPath,
    getPath
  },
  BrowserWindow,
  Menu: {
    buildFromTemplate,
    setApplicationMenu
  },
  ipcMain: {
    handle
  },
  contextBridge: {},
  ipcRenderer: {}
}));

vi.mock('../electron/ipc/filesystem.js', () => ({
  registerFilesystemIpc: vi.fn()
}));

vi.mock('../electron/settings.js', () => ({
  registerSettingsIpc: vi.fn()
}));

describe('file menu config', () => {
  it('installs a File menu without dropping standard application menus and broadcasts open-vault', async () => {
    await import('../../electron/main.ts');

    await Promise.resolve();

    expect(setApplicationMenu).toHaveBeenCalledTimes(1);
    expect(buildFromTemplate).toHaveBeenCalledTimes(1);

    const template = buildFromTemplate.mock.calls[0][0] as Array<{
      label?: string;
      submenu?: Array<{ label?: string; role?: string; click?: () => void }>;
    }>;

    expect(template).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'File',
          submenu: expect.arrayContaining([
            expect.objectContaining({
              label: 'Open Vault'
            })
          ])
        }),
        expect.objectContaining({
          label: 'Edit',
          submenu: expect.arrayContaining([
            expect.objectContaining({ role: 'undo' }),
            expect.objectContaining({ role: 'redo' }),
            expect.objectContaining({ role: 'cut' }),
            expect.objectContaining({ role: 'copy' }),
            expect.objectContaining({ role: 'paste' }),
            expect.objectContaining({ role: 'selectAll' })
          ])
        })
      ])
    );

    const fileMenu = template.find((item) => item.label === 'File');
    expect(fileMenu?.submenu?.[0].click).toEqual(expect.any(Function));

    fileMenu?.submenu?.[0].click?.();

    expect(getAllWindows).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('menu:command', { command: 'open-vault' });
  });
});
