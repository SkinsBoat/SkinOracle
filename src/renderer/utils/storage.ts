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
  STORE_LINKS: 'so_seller_store_links',
} as const;

// ─────────────────────────────────────────────────────────────────
// Seller Store Links Registry
// ─────────────────────────────────────────────────────────────────
// Traders can maintain multiple marketplace store / stall links and mark one
// default per marketplace for 1-click sharing after a flash deal matches.
// ─────────────────────────────────────────────────────────────────

export interface StoreLink {
  id: string;
  /** Canonical marketplace id (e.g. 'csfloat', 'dmarket', 'skinscom'). */
  marketplace: string;
  /** Optional trader-defined label (e.g. "Main Stall", "Alt Account"). */
  label: string;
  /** Full stall / personal store URL. */
  url: string;
  /** True when this link is the preferred 1-click share target for its marketplace. */
  isDefault: boolean;
}

function generateStoreLinkId(): string {
  try {
    const uuid = (globalThis as any)?.crypto?.randomUUID;
    if (typeof uuid === 'function') return uuid.call((globalThis as any).crypto);
  } catch {}
  return `store_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMarketplace(marketplace: string): string {
  const norm = (marketplace || '').trim().toLowerCase();
  if (norm.includes('csfloat') || norm.includes('csgofloat') || norm === 'cs_float') {
    return 'csfloat';
  }
  if (norm.includes('dmarket')) return 'dmarket';
  if (norm.includes('skinscom')) return 'skinscom';
  return norm;
}

/**
 * Read all configured seller store links. Malformed entries are dropped.
 */
export function getStoreLinks(): StoreLink[] {
  const raw = safeGetItem(STORAGE_KEYS.STORE_LINKS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object' && entry.url)
      .map((entry) => ({
        id: String(entry.id || generateStoreLinkId()),
        marketplace: normalizeMarketplace(String(entry.marketplace || '')),
        label: String(entry.label || ''),
        url: String(entry.url || '').trim(),
        isDefault: Boolean(entry.isDefault),
      }))
      .filter((entry) => entry.url.length > 0);
  } catch {
    return [];
  }
}

/** Persist the full store-link registry. */
export function saveStoreLinks(links: StoreLink[]): void {
  safeSetItem(STORAGE_KEYS.STORE_LINKS, JSON.stringify(links || []));
}

/**
 * Enforce at most one default link per marketplace. When multiple defaults
 * exist for the same marketplace, the last one wins.
 */
function ensureSingleDefaultPerMarket(links: StoreLink[]): StoreLink[] {
  const seen = new Set<string>();
  const result: StoreLink[] = [];
  // Walk backwards so the most recently inserted default is preserved.
  for (let i = links.length - 1; i >= 0; i -= 1) {
    const link = links[i];
    if (link.isDefault) {
      if (seen.has(link.marketplace)) {
        result.unshift({ ...link, isDefault: false });
        continue;
      }
      seen.add(link.marketplace);
    }
    result.unshift(link);
  }
  // Guarantee each marketplace that has links also has a default.
  const defaulted = new Set(result.filter((l) => l.isDefault).map((l) => l.marketplace));
  for (const link of result) {
    if (!defaulted.has(link.marketplace)) {
      link.isDefault = true;
      defaulted.add(link.marketplace);
    }
  }
  return result;
}

export interface StoreLinkInput {
  marketplace: string;
  label?: string;
  url: string;
  isDefault?: boolean;
}

/** Add a new seller store link and return the persisted record. */
export function addStoreLink(input: StoreLinkInput): StoreLink {
  const marketplace = normalizeMarketplace(input.marketplace);
  const url = (input.url || '').trim();
  let links = getStoreLinks();

  const hasDefaultForMarket = links.some(
    (l) => l.marketplace === marketplace && l.isDefault,
  );
  const link: StoreLink = {
    id: generateStoreLinkId(),
    marketplace,
    label: (input.label || '').trim(),
    url,
    isDefault: input.isDefault ?? !hasDefaultForMarket,
  };

  links = links.map((l) =>
    link.isDefault && l.marketplace === marketplace ? { ...l, isDefault: false } : l,
  );
  links.push(link);
  links = ensureSingleDefaultPerMarket(links);
  saveStoreLinks(links);
  return link;
}

/** Update mutable fields of an existing store link. */
export function updateStoreLink(
  id: string,
  patch: Partial<Omit<StoreLink, 'id'>>,
): StoreLink | null {
  let updated: StoreLink | null = null;
  let links = getStoreLinks().map((link) => {
    if (link.id !== id) return link;
    const next: StoreLink = {
      ...link,
      ...patch,
      marketplace:
        patch.marketplace !== undefined
          ? normalizeMarketplace(patch.marketplace)
          : link.marketplace,
      label: patch.label !== undefined ? String(patch.label).trim() : link.label,
      url: patch.url !== undefined ? String(patch.url).trim() : link.url,
    };
    updated = next;
    return next;
  });

  if (updated && (updated as StoreLink).isDefault) {
    const market = (updated as StoreLink).marketplace;
    links = links.map((l) =>
      l.id !== id && l.marketplace === market ? { ...l, isDefault: false } : l,
    );
  }

  links = ensureSingleDefaultPerMarket(links.filter((l) => l.url.length > 0));
  saveStoreLinks(links);
  return updated;
}

/** Remove a store link, promoting another link of the same market to default. */
export function removeStoreLink(id: string): void {
  const links = getStoreLinks();
  const removed = links.find((l) => l.id === id);
  let next = links.filter((l) => l.id !== id);
  if (removed?.isDefault) {
    const sameMarket = next.find((l) => l.marketplace === removed.marketplace);
    if (sameMarket) {
      next = next.map((l) =>
        l.id === sameMarket.id ? { ...l, isDefault: true } : l,
      );
    }
  }
  saveStoreLinks(ensureSingleDefaultPerMarket(next));
}

/** Mark a store link as the default for its marketplace. */
export function setDefaultStoreLink(id: string): void {
  const target = getStoreLinks().find((l) => l.id === id);
  if (!target) return;
  const next = getStoreLinks().map((l) => {
    if (l.marketplace !== target.marketplace) return l;
    return { ...l, isDefault: l.id === id };
  });
  saveStoreLinks(next);
}

/** Retrieve the default store link for a marketplace, if configured. */
export function getDefaultStoreLink(marketplace: string): StoreLink | null {
  const market = normalizeMarketplace(marketplace);
  if (!market) return null;
  const links = getStoreLinks();
  return (
    links.find((l) => l.marketplace === market && l.isDefault) ||
    links.find((l) => l.marketplace === market) ||
    null
  );
}

/**
 * Retrieve the preferred seller store / stall URL for a marketplace.
 * Reads the default registry entry first, then falls back to the legacy keys.
 * @param marketplace 'csfloat' | 'dmarket' | 'skinscom'
 */
export function getSavedStoreUrl(marketplace: string): string {
  const fromRegistry = getDefaultStoreLink(marketplace);
  if (fromRegistry?.url) return fromRegistry.url;

  const norm = normalizeMarketplace(marketplace);
  if (norm === 'csfloat') {
    return safeGetItem(STORAGE_KEYS.CSFLOAT_STALL_URL) || '';
  }
  if (norm === 'dmarket') {
    return safeGetItem(STORAGE_KEYS.DMARKET_STORE_URL) || '';
  }
  return '';
}

/**
 * Persist a seller marketplace store / stall URL as the default registry entry
 * (and the legacy key for backward compatibility).
 * @param marketplace 'csfloat' | 'dmarket' | 'skinscom'
 * @param url Full stall or personal store URL
 */
export function setSavedStoreUrl(marketplace: string, url: string): void {
  const norm = normalizeMarketplace(marketplace);
  const trimmed = (url || '').trim();
  if (!norm || !trimmed) return;

  if (norm === 'csfloat') {
    safeSetItem(STORAGE_KEYS.CSFLOAT_STALL_URL, trimmed);
  } else if (norm === 'dmarket') {
    safeSetItem(STORAGE_KEYS.DMARKET_STORE_URL, trimmed);
  }

  const links = getStoreLinks();
  const existing = links.find((l) => l.marketplace === norm && l.isDefault);
  if (existing) {
    updateStoreLink(existing.id, { url: trimmed });
  } else {
    addStoreLink({ marketplace: norm, url: trimmed, isDefault: true });
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

