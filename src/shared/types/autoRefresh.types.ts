// Auto-Refresh Scheduler Types
// Shared between the main-process scheduler and the renderer control.

export type AutoRefreshProvider = "skinsnipe" | "cs2cap";

/**
 * Market scope driving a price cycle.
 * - `baseline`: wide market set → persisted as historical trend snapshots.
 * - `snipe`: narrow execution venues → ephemeral, must NOT be persisted to the
 *   trend store because it runs frequently and only covers a few venues.
 */
export type MarketScanScope = "baseline" | "snipe";

export interface AutoRefreshConfig {
  enabled: boolean;
  /** Minutes to wait after the previous cycle finishes before the next one. */
  intervalMinutes: number;
  provider: AutoRefreshProvider;
  /** Active market scope; `snipe` cycles skip trend-snapshot persistence. */
  scope?: MarketScanScope;
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
