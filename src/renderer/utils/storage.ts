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
