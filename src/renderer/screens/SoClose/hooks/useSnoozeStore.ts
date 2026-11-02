import { useCallback, useEffect, useState } from "react";
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

/**
 * Session-scoped SoClose item snooze. Timed snoozes survive app restarts via
 * localStorage; "This session" snoozes live only in memory.
 */
export function useSnoozeStore() {
  const [snoozedItems, setSnoozedItems] =
    useState<SnoozedItemsMap>(loadSnoozedItems);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, EXPIRY_SWEEP_INTERVAL_MS);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, []);

  useEffect(() => {
    setSnoozedItems((prev) => {
      let changed = false;
      const next: SnoozedItemsMap = new Map();
      prev.forEach((entry, key) => {
        if (entry.expiresAt !== null && entry.expiresAt <= now) {
          changed = true;
          return;
        }
        next.set(key, entry);
      });
      return changed ? next : prev;
    });
  }, [now]);

  useEffect(() => {
    persistSnoozedItems(snoozedItems);
  }, [snoozedItems]);

  const snoozeItem = useCallback((key: string, durationMs: number | null) => {
    setSnoozedItems((prev) => {
      const next = new Map(prev);
      next.set(key, {
        expiresAt: durationMs === null ? null : Date.now() + durationMs,
      });
      return next;
    });
  }, []);

  const unsnoozeItem = useCallback((key: string) => {
    setSnoozedItems((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isSnoozeItemActive = useCallback(
    (key: string): boolean => {
      const entry = snoozedItems.get(key);
      if (!entry) return false;
      return entry.expiresAt === null || entry.expiresAt > Date.now();
    },
    [snoozedItems],
  );

  return {
    snoozedItems,
    snoozeItem,
    unsnoozeItem,
    isSnoozeItemActive,
  };
}
