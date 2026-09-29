// Auto-Refresh Scheduler Types
// Shared between the main-process scheduler and the renderer control.

export type AutoRefreshProvider = "skinsnipe" | "cs2cap";

export interface AutoRefreshConfig {
  enabled: boolean;
  /** Minutes to wait after the previous cycle finishes before the next one. */
  intervalMinutes: number;
  provider: AutoRefreshProvider;
  /** Skinsnipe target markets (used when provider === "skinsnipe"). */
  markets?: string[];
  /** CS2Cap target providers (used when provider === "cs2cap"). */
  providers?: string[];
}

export type AutoRefreshCycleStatus =
  "idle" | "running" | "completed" | "error" | "cancelled";

export interface AutoRefreshStatus {
  enabled: boolean;
  intervalMinutes: number;
  provider: AutoRefreshProvider;
  isRunning: boolean;
  /** ISO timestamp of the next scheduled cycle, or null when not scheduled. */
  nextRunAt: string | null;
  /** ISO timestamp of the last successfully completed cycle. */
  lastCompletedAt: string | null;
  lastCycleStatus: AutoRefreshCycleStatus;
  lastError: string | null;
  cycleCount: number;
}
