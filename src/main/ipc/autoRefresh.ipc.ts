import { ipcMain, BrowserWindow } from "electron";
import {
  AutoRefreshConfig,
  AutoRefreshStatus,
  AutoRefreshCycleStatus,
} from "../../shared/types/autoRefresh.types";
import {
  runSkinsnipeFetchCycle,
  getSkinsnipeIsFetching,
  cancelSkinsnipeFetch,
} from "./skinsnipe.ipc";
import {
  runCs2CapStreamCycle,
  getCs2CapIsFetching,
  cancelCs2CapStream,
} from "./cs2cap.ipc";

// ─────────────────────────────────────────────────────────────────
// Auto-Refresh Scheduler — runs in the MAIN process so price cycles
// keep firing while the trader navigates between renderer screens.
//
// Each cycle waits for the previous cycle to finish before starting
// the interval countdown, so a slow scan can never overlap itself.
// ─────────────────────────────────────────────────────────────────

const MIN_INTERVAL_MINUTES = 1;

let config: AutoRefreshConfig = {
  enabled: false,
  intervalMinutes: 30,
  provider: "cs2cap",
};

let timer: NodeJS.Timeout | null = null;
let isRunning = false;
let nextRunAt: Date | null = null;
let lastCompletedAt: Date | null = null;
let lastCycleStatus: AutoRefreshCycleStatus = "idle";
let lastError: string | null = null;
let cycleCount = 0;

function getStatus(): AutoRefreshStatus {
  return {
    enabled: config.enabled,
    intervalMinutes: config.intervalMinutes,
    provider: config.provider,
    isRunning,
    nextRunAt: nextRunAt?.toISOString() || null,
    lastCompletedAt: lastCompletedAt?.toISOString() || null,
    lastCycleStatus,
    lastError,
    cycleCount,
  };
}

function broadcastStatus() {
  try {
    const status = getStatus();
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send("autoRefresh:status-updated", status);
      }
    });
  } catch (err) {
    console.warn("[AutoRefresh] Failed to broadcast status:", err);
  }
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  nextRunAt = null;
}

function scheduleNext() {
  clearTimer();
  if (!config.enabled) {
    broadcastStatus();
    return;
  }
  const intervalMs =
    Math.max(MIN_INTERVAL_MINUTES, Math.round(config.intervalMinutes)) * 60_000;
  nextRunAt = new Date(Date.now() + intervalMs);
  timer = setTimeout(() => {
    void runCycle();
  }, intervalMs);
  broadcastStatus();
}

async function runCycle() {
  if (!config.enabled || isRunning) return;

  // Skip if a manual scan for the same provider is already in flight.
  const providerBusy =
    config.provider === "skinsnipe"
      ? getSkinsnipeIsFetching()
      : getCs2CapIsFetching();
  if (providerBusy) {
    lastCycleStatus = "idle";
    lastError = "Skipped: a scan was already in progress.";
    scheduleNext();
    return;
  }

  isRunning = true;
  lastCycleStatus = "running";
  lastError = null;
  broadcastStatus();

  try {
    let aborted = false;
    if (config.provider === "skinsnipe") {
      const result = await runSkinsnipeFetchCycle(config.markets);
      aborted = !!result.aborted;
    } else {
      const result = await runCs2CapStreamCycle({
        providers: config.providers,
      });
      aborted = !!result.aborted;
    }

    if (aborted) {
      lastCycleStatus = "cancelled";
    } else {
      cycleCount++;
      lastCompletedAt = new Date();
      lastCycleStatus = "completed";
    }
  } catch (err: any) {
    lastCycleStatus = "error";
    lastError = err?.message || "Auto-refresh cycle failed";
  } finally {
    isRunning = false;
    scheduleNext();
  }
}

function applyConfig(patch: Partial<AutoRefreshConfig>): AutoRefreshStatus {
  const wasEnabled = config.enabled;
  const previousInterval = config.intervalMinutes;

  config = {
    ...config,
    ...patch,
    intervalMinutes:
      patch.intervalMinutes !== undefined
        ? Math.max(MIN_INTERVAL_MINUTES, Math.round(patch.intervalMinutes))
        : config.intervalMinutes,
  };

  if (!config.enabled) {
    clearTimer();
    broadcastStatus();
    return getStatus();
  }

  const justEnabled = !wasEnabled;
  const intervalChanged = previousInterval !== config.intervalMinutes;

  if (justEnabled && !isRunning) {
    // First enable runs immediately, then the interval countdown begins.
    void runCycle();
  } else if (intervalChanged && !isRunning) {
    scheduleNext();
  } else {
    broadcastStatus();
  }

  return getStatus();
}

export function setupAutoRefreshIPC() {
  ipcMain.handle(
    "autoRefresh:set-config",
    (_event, patch: Partial<AutoRefreshConfig>) => {
      if (!patch || typeof patch !== "object") return getStatus();
      return applyConfig(patch);
    },
  );

  ipcMain.handle("autoRefresh:get-status", () => getStatus());

  ipcMain.handle("autoRefresh:run-now", async () => {
    if (!config.enabled || isRunning) return getStatus();
    clearTimer();
    await runCycle();
    return getStatus();
  });

  ipcMain.handle("autoRefresh:stop", () => {
    config.enabled = false;
    clearTimer();
    if (isRunning) {
      if (config.provider === "skinsnipe") cancelSkinsnipeFetch();
      else cancelCs2CapStream();
    }
    broadcastStatus();
    return getStatus();
  });
}
