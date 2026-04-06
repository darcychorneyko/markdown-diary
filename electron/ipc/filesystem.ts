import { dialog, ipcMain } from 'electron';

export function registerFilesystemIpc() {
  ipcMain.handle('vault:choose', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });

    return result.canceled ? null : result.filePaths[0];
  });
}
