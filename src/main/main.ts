import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { APP_RELEASES_URL } from './constants/apiUrls';
import { checkVersionGate, refreshSystemConfig, VersionCheckResponse } from './services/versionGate';

let currentGateResult: VersionCheckResponse | null = null;

// ─────────────────────────────────────────────────────────────────
// IPC Handlers (imported separately for clarity)
// ─────────────────────────────────────────────────────────────────
import './ipc/auth.ipc';
import './ipc/oracle.ipc';
import './ipc/skinsnipe.ipc';
import './ipc/cs2cap.ipc';
import './ipc/csfloat.ipc';
import './ipc/skinscom.ipc';
import './ipc/dmarket.ipc';
import './ipc/updater.ipc';
import { setupBalanceIPC } from './ipc/balance.ipc';
import '../storage/secure-store';
import { autoUpdateService } from './services/autoUpdater';

// Disable hardware acceleration to eliminate Windows Chromium GPU/black screen glitches
app.disableHardwareAcceleration();

setupBalanceIPC();

function createWindow() {
  const isDev = !!process.env.VITE_DEV_SERVER_URL;

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#050505',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform !== 'darwin',
    autoHideMenuBar: true, // Hide top menu bar on Windows/Linux
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true, // Security: renderer cannot access Node.js
      devTools: isDev, // Hardened: DevTools disabled in production
      spellcheck: false,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
  });

  // Open external links directly in user's default web browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Explicitly hide menu bar & remove application menu
  win.setMenuBarVisibility(false);

  // Allow DevTools shortcuts ONLY in development; completely blocked in production
  if (isDev) {
    win.webContents.on('before-input-event', (_, input) => {
      if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
        win.webContents.toggleDevTools();
      }
      if (input.key === 'F12') {
        win.webContents.toggleDevTools();
      }
    });
  } else {
    // Production anti-tampering: immediately close DevTools if forced open
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools();
    });
  }

  // Diagnostic logging and native error dialog for renderer errors
  win.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error(`[Load Error] ${errorCode}: ${errorDescription} on ${validatedURL}`);
    dialog.showErrorBox('Page Load Failed', `Error ${errorCode}: ${errorDescription}\nURL: ${validatedURL}`);
  });
  win.webContents.on('console-message', (_, level, message, line, sourceId) => {
    if (level >= 2) { // warnings and errors
      console.warn(`[Renderer] ${message} (${sourceId}:${line})`);
    }
  });

  // In dev, load process.env.VITE_DEV_SERVER_URL; in prod, load built index.html
  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Initialize auto-updater service & check for updates on startup
  win.webContents.on('did-finish-load', () => {
    autoUpdateService.init();
    // In production or if the version is blocked, check for updates immediately
    const shouldCheck = !isDev || !currentGateResult?.allowed;
    if (shouldCheck) {
      const delay = !currentGateResult?.allowed ? 500 : 2500;
      setTimeout(() => {
        autoUpdateService.checkForUpdates().catch(err => {
          console.warn('[AutoUpdate] Startup check skipped/failed:', err);
        });
      }, delay);
    }
  });
}

ipcMain.handle('app:open-external', async (_, url: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    await shell.openExternal(url);
  }
});

ipcMain.handle('app:open-releases', async () => {
  await shell.openExternal(APP_RELEASES_URL);
});

ipcMain.handle('system:get-config', async () => {
  return await refreshSystemConfig();
});

ipcMain.handle('system:get-version-gate', async () => {
  if (!currentGateResult) {
    currentGateResult = await checkVersionGate();
  }
  return {
    ...currentGateResult,
    currentVersion: app.getVersion(),
  };
});

app.whenReady().then(async () => {
  // Remove default top application menu (File, Edit, View, Window, Help)
  Menu.setApplicationMenu(null);

  // Perform startup version check gate
  currentGateResult = await checkVersionGate();

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
