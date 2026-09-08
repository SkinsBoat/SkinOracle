import { ipcMain } from "electron";
import { autoUpdateService } from "../services/autoUpdater";

ipcMain.handle("updater:check", async () => {
  return await autoUpdateService.checkForUpdates();
});

ipcMain.handle("updater:download", async () => {
  return await autoUpdateService.downloadUpdate();
});

ipcMain.handle("updater:quit-and-install", async () => {
  autoUpdateService.quitAndInstall();
});

ipcMain.handle("updater:get-status", async () => {
  return autoUpdateService.getCurrentState();
});
