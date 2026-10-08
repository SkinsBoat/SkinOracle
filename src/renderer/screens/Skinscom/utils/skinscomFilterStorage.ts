import { safeGetItem, safeSetItem } from "../../../utils/storage";
import {
  DEFAULT_EVENT_FILTERS,
  DEFAULT_FILTERS,
  type SkinscomFilterState,
} from "../constants";

/**
 * Persist the trader's filter choices across app restarts.
 * UI preferences only — no secrets are stored here.
 */
const MARKET_STORAGE_KEY = "skinscom_market_filters_v1";
const EVENT_STORAGE_KEY = "skinscom_event_filters_v1";

function loadFrom(
  storageKey: string,
  fallback: SkinscomFilterState,
): SkinscomFilterState {
  try {
    const raw = safeGetItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SkinscomFilterState>;
    return {
      ...fallback,
      ...parsed,
      allowedWears: {
        ...fallback.allowedWears,
        ...(parsed?.allowedWears ?? {}),
      },
    };
  } catch {
    return fallback;
  }
}

function persistTo(storageKey: string, filters: SkinscomFilterState): void {
  try {
    safeSetItem(storageKey, JSON.stringify(filters));
  } catch {
    // Storage is best-effort; ignore failures.
  }
}

/** Market Scan tab filters. */
export function loadPersistedFilters(): SkinscomFilterState {
  return loadFrom(MARKET_STORAGE_KEY, DEFAULT_FILTERS);
}

export function persistFilters(filters: SkinscomFilterState): void {
  persistTo(MARKET_STORAGE_KEY, filters);
}

/** Events tab filters (separate so the tabs do not overwrite each other). */
export function loadPersistedEventFilters(): SkinscomFilterState {
  return loadFrom(EVENT_STORAGE_KEY, DEFAULT_EVENT_FILTERS);
}

export function persistEventFilters(filters: SkinscomFilterState): void {
  persistTo(EVENT_STORAGE_KEY, filters);
}
