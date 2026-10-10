import { BrowserWindow } from "electron";

// ─────────────────────────────────────────────────────────────────
// Main window registry
//
// Tracks the primary application window so background events (native
// notification clicks, second-instance activation, macOS "activate") can
// restore & focus the EXISTING window instead of spawning a new one.
// ─────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win;
}

/** The tracked main window, falling back to any live window. */
export function getMainWindow(): BrowserWindow | null {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  const fallback = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  return fallback ?? null;
}

/** Restore, show and focus the existing main window. Never creates a window. */
export function focusMainWindow(): void {
  const win = getMainWindow();
  if (!win) return;
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
}
