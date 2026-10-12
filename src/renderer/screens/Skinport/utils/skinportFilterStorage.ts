import { safeGetItem, safeSetItem } from "../../../utils/storage";
import {
  DEFAULT_EVENT_FILTERS,
  DEFAULT_FILTERS,
  type SkinportFilterState,
} from "../constants";

/**
 * Persist the trader's Skinport filter choices across restarts.
 * UI preferences only — no secrets are stored here.
 */
const MARKET_STORAGE_KEY = "skinport_market_filters_v1";
const EVENT_STORAGE_KEY = "skinport_event_filters_v1";

function loadFrom(
  storageKey: string,
  defaults: SkinportFilterState,
): SkinportFilterState {
  try {
    const raw = safeGetItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SkinportFilterState>;
    return {
      ...defaults,
      ...parsed,
      allowedWears: {
        ...defaults.allowedWears,
        ...(parsed?.allowedWears ?? {}),
      },
    };
  } catch {
    return defaults;
  }
}

function persistTo(storageKey: string, filters: SkinportFilterState): void {
  try {
    safeSetItem(storageKey, JSON.stringify(filters));
  } catch {
    // Storage is best-effort; ignore failures.
  }
}

export function loadPersistedFilters(): SkinportFilterState {
  return loadFrom(MARKET_STORAGE_KEY, DEFAULT_FILTERS);
}

export function persistFilters(filters: SkinportFilterState): void {
  persistTo(MARKET_STORAGE_KEY, filters);
}

export function loadPersistedEventFilters(): SkinportFilterState {
  return loadFrom(EVENT_STORAGE_KEY, DEFAULT_EVENT_FILTERS);
}

export function persistEventFilters(filters: SkinportFilterState): void {
  persistTo(EVENT_STORAGE_KEY, filters);
}
