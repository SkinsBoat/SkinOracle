import { autoUpdater, UpdateInfo as ElectronUpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { UpdateStatusState, UpdateProgressInfo, UpdateInfo } from '../../shared/types';

class AutoUpdateService {
  private currentState: UpdateStatusState = {
    status: 'idle',
    info: null,
    progress: null,
    error: null,
  };

  private initialized = false;

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    // Do not auto-download immediately; allow renderer/user interaction or background trigger
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // Set browser User-Agent header to prevent Cloudflare WAF bot blocking
    autoUpdater.requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    // Configure logger or custom settings if needed
    autoUpdater.logger = console;

    // ── Setup Event Listeners ─────────────────────────────────────────

    autoUpdater.on('checking-for-update', () => {
      this.updateState({
        status: 'checking',
        error: null,
      });
    });

    autoUpdater.on('update-available', (info: ElectronUpdateInfo) => {
      const formattedInfo: UpdateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as any,
      };

      this.updateState({
        status: 'available',
        info: formattedInfo,
        error: null,
      });
    });

    autoUpdater.on('update-not-available', (info: ElectronUpdateInfo) => {
      const formattedInfo: UpdateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
      };

      this.updateState({
        status: 'not-available',
        info: formattedInfo,
        error: null,
      });
    });

    autoUpdater.on('error', (err: Error) => {
      console.error('[AutoUpdateService] Error:', err);
      this.updateState({
        status: 'error',
        error: err.message || 'Auto-update check failed',
      });
    });

    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
      const progress: UpdateProgressInfo = {
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
      };

      this.updateState({
        status: 'downloading',
        progress,
        error: null,
      });
    });

    autoUpdater.on('update-downloaded', (info: ElectronUpdateInfo) => {
      const formattedInfo: UpdateInfo = {
        version: info.version,
        releaseDate: info.releaseDate,
      };

      this.updateState({
        status: 'downloaded',
        info: formattedInfo,
        error: null,
      });
    });
  }

  private updateState(newState: Partial<UpdateStatusState>) {
    this.currentState = { ...this.currentState, ...newState };
    this.broadcastState();
  }

  private broadcastState() {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('auto-updater:status', this.currentState);
      }
    }
  }

  public getCurrentState(): UpdateStatusState {
    return this.currentState;
  }

  public async checkForUpdates(): Promise<{ success: boolean; message?: string }> {
    try {
      this.init();
      const result = await autoUpdater.checkForUpdates();
      return { success: true, message: result?.updateInfo?.version ? `Found version ${result.updateInfo.version}` : 'Check complete' };
    } catch (err: any) {
      console.warn('[AutoUpdateService] Check error:', err.message);
      this.updateState({
        status: 'error',
        error: err.message || 'Failed to check for updates',
      });
      return { success: false, message: err.message };
    }
  }

  public async downloadUpdate(): Promise<{ success: boolean; message?: string }> {
    try {
      this.init();
      await autoUpdater.downloadUpdate();
      return { success: true, message: 'Download initiated' };
    } catch (err: any) {
      console.error('[AutoUpdateService] Download error:', err.message);
      this.updateState({
        status: 'error',
        error: err.message || 'Failed to download update',
      });
      return { success: false, message: err.message };
    }
  }

  public quitAndInstall() {
    autoUpdater.quitAndInstall(false, true);
  }
}

export const autoUpdateService = new AutoUpdateService();
