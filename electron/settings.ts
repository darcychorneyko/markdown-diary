import fs from 'node:fs/promises';
import path from 'node:path';
import { app, ipcMain } from 'electron';

type AppSettings = {
  lastVaultPath: string | null;
};

const DEFAULT_SETTINGS: AppSettings = {
  lastVaultPath: null
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function readSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf8');
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings: AppSettings) {
  const settingsPath = getSettingsPath();
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

export function registerSettingsIpc() {
  ipcMain.handle('settings:get-last-vault', async () => {
    const settings = await readSettings();
    return settings.lastVaultPath;
  });

  ipcMain.handle('settings:set-last-vault', async (_event, lastVaultPath: string | null) => {
    const settings = await readSettings();
    await writeSettings({
      ...settings,
      lastVaultPath
    });
  });
}
