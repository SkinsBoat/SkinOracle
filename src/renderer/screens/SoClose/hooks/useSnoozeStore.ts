import { create } from "zustand";
import { SoCloseResultItem } from "../../../../shared/types";

const MINUTE_MS = 60 * 1000;
const EXPIRY_SWEEP_INTERVAL_MS = 15 * 1000;
const STORAGE_KEY = "soclose_snoozed_items";

export type SnoozeOptionId = "15m" | "1h" | "3h" | "session";

export interface SnoozeOption {
  id: SnoozeOptionId;
  label: string;
  durationMs: number | null;
}

export interface SnoozeEntry {
  expiresAt: number | null;
}

export type SnoozedItemsMap = Map<string, SnoozeEntry>;

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { id: "15m", label: "15 minutes", durationMs: 15 * MINUTE_MS },
  { id: "1h", label: "1 hour", durationMs: 60 * MINUTE_MS },
  { id: "3h", label: "3 hours", durationMs: 180 * MINUTE_MS },
  { id: "session", label: "This session", durationMs: null },
];

export function makeSnoozeKey(
  item: Pick<SoCloseResultItem, "name" | "market">,
): string {
  return `${item.name}__${item.market ?? "unknown"}`;
}

function persistSnoozedItems(items: SnoozedItemsMap) {
  try {
    const timedEntries: Record<string, number> = {};
    items.forEach((entry, key) => {
      if (entry.expiresAt !== null) {
        timedEntries[key] = entry.expiresAt;
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timedEntries));
  } catch (err) {
    console.warn("[useSnoozeStore] Failed to persist snoozed items:", err);
  }
}

function loadSnoozedItems(): SnoozedItemsMap {
  const items: SnoozedItemsMap = new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return items;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return items;
    }

    const now = Date.now();
    for (const [key, value] of Object.entries(parsed)) {
      const expiresAt =
        typeof value === "number"
          ? value
          : (value as SnoozeEntry | null)?.expiresAt;
      if (typeof expiresAt !== "number" || expiresAt <= now) continue;
      items.set(key, { expiresAt });
    }
  } catch (err) {
    console.warn("[useSnoozeStore] Failed to load snoozed items:", err);
  }
  return items;
}

interface SnoozeStoreState {
  snoozedItems: SnoozedItemsMap;
  snoozeItem: (key: string, durationMs: number | null) => void;
  unsnoozeItem: (key: string) => void;
  pruneExpired: (now?: number) => void;
}

/**
 * Session-scoped SoClose item snooze. The store lives at module scope so
 * switching workstation tabs does not drop session snoozes; timed snoozes
 * also survive app restarts via localStorage.
 */
export const useSnoozeStore = create<SnoozeStoreState>((set) => ({
  snoozedItems: loadSnoozedItems(),

  snoozeItem: (key, durationMs) =>
    set((state) => {
      const next = new Map(state.snoozedItems);
      next.set(key, {
        expiresAt: durationMs === null ? null : Date.now() + durationMs,
      });
      persistSnoozedItems(next);
      return { snoozedItems: next };
    }),

  unsnoozeItem: (key) =>
    set((state) => {
      if (!state.snoozedItems.has(key)) return state;
      const next = new Map(state.snoozedItems);
      next.delete(key);
      persistSnoozedItems(next);
      return { snoozedItems: next };
    }),

  pruneExpired: (now = Date.now()) =>
    set((state) => {
      let changed = false;
      const next: SnoozedItemsMap = new Map();
      state.snoozedItems.forEach((entry, key) => {
        if (entry.expiresAt !== null && entry.expiresAt <= now) {
          changed = true;
          return;
        }
        next.set(key, entry);
      });
      if (!changed) return state;
      persistSnoozedItems(next);
      return { snoozedItems: next };
    }),
}));

if (typeof window !== "undefined") {
  const sweeperWindow = window as typeof window & {
    __socloseSnoozeSweeper?: number;
  };
  if (!sweeperWindow.__socloseSnoozeSweeper) {
    sweeperWindow.__socloseSnoozeSweeper = window.setInterval(() => {
      useSnoozeStore.getState().pruneExpired();
    }, EXPIRY_SWEEP_INTERVAL_MS);
  }
}
