export function safeGetItem(
  key: string,
  fallback: string | null = null,
): string | null {
  try {
    return typeof window !== "undefined" && window.localStorage
      ? (window.localStorage.getItem(key) ?? fallback)
      : fallback;
  } catch {
    return fallback;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

export function getPersistedThreshold(
  key: string,
  fallbackKey?: string,
  defaultValue = 2,
): number {
  const saved =
    safeGetItem(key) ?? (fallbackKey ? safeGetItem(fallbackKey) : null);
  if (saved !== null) {
    const parsed = parseFloat(saved);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return defaultValue;
}

export function setPersistedThreshold(
  key: string,
  value: number,
  fallbackKey?: string,
): void {
  safeSetItem(key, String(value));
  if (fallbackKey) {
    safeSetItem(fallbackKey, String(value));
  }
}

export const STORAGE_KEYS = {
  CSFLOAT_STALL_URL: 'so_seller_csfloat_stall_url',
  DMARKET_STORE_URL: 'so_seller_dmarket_store_url',
} as const;

/**
 * Retrieve saved seller marketplace store / stall URL from local storage.
 * @param marketplace 'csfloat' | 'dmarket'
 */
export function getSavedStoreUrl(marketplace: string): string {
  const norm = (marketplace || '').toLowerCase();
  if (norm.includes('csfloat')) {
    return safeGetItem(STORAGE_KEYS.CSFLOAT_STALL_URL) || '';
  }
  if (norm.includes('dmarket')) {
    return safeGetItem(STORAGE_KEYS.DMARKET_STORE_URL) || '';
  }
  return '';
}

/**
 * Persist seller marketplace store / stall URL to local storage.
 * @param marketplace 'csfloat' | 'dmarket'
 * @param url Full stall or personal store URL
 */
export function setSavedStoreUrl(marketplace: string, url: string): void {
  const norm = (marketplace || '').toLowerCase();
  const trimmed = (url || '').trim();
  if (norm.includes('csfloat')) {
    safeSetItem(STORAGE_KEYS.CSFLOAT_STALL_URL, trimmed);
  } else if (norm.includes('dmarket')) {
    safeSetItem(STORAGE_KEYS.DMARKET_STORE_URL, trimmed);
  }
}

/**
 * Helper to extract wear abbreviation (FN, MW, FT, WW, BS) from item market hash name.
 */
export function extractWearFromName(name: string): string {
  if (!name) return 'FT';
  if (name.includes('(Factory New)')) return 'FN';
  if (name.includes('(Minimal Wear)')) return 'MW';
  if (name.includes('(Field-Tested)')) return 'FT';
  if (name.includes('(Well-Worn)')) return 'WW';
  if (name.includes('(Battle-Scarred)')) return 'BS';
  return 'FT';
}

