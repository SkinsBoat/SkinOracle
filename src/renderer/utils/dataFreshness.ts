/**
 * Shared freshness/expiry evaluation for locally held market data.
 *
 * All locally cached datasets expose a single ISO timestamp for the whole
 * map (`lastFetchedAt` for the price cache, `storedAt` for calculated
 * accepted/listing prices), so expiry is evaluated per dataset, not per item.
 */

export interface FreshnessInfo {
  /** Whether a parseable timestamp was provided. */
  hasTimestamp: boolean;
  /** Effective TTL in minutes, or null when expiry is disabled. */
  ttlMinutes: number | null;
  /** Age of the data in milliseconds (0 when unknown). */
  ageMs: number;
  /** Epoch ms when the data expires, or null when it never expires. */
  expiresAt: number | null;
  /** Epoch ms remaining until expiry (0 once expired), or null if never. */
  remainingMs: number | null;
  /** True when a TTL is set and the timestamp is older than the TTL. */
  isExpired: boolean;
}

/**
 * Resolves freshness for a dataset given its last-updated timestamp and the
 * trader-configured TTL. A TTL of 0 / null / undefined means "never expires".
 */
export function getFreshness(
  storedAt: string | null | undefined,
  ttlMinutes: number | null | undefined,
  now: number = Date.now(),
): FreshnessInfo {
  const ttl =
    typeof ttlMinutes === "number" && ttlMinutes > 0 ? ttlMinutes : null;
  const parsed = storedAt ? Date.parse(storedAt) : NaN;
  const hasTimestamp = !Number.isNaN(parsed);

  if (!hasTimestamp) {
    return {
      hasTimestamp: false,
      ttlMinutes: ttl,
      ageMs: 0,
      expiresAt: null,
      remainingMs: null,
      isExpired: false,
    };
  }

  const ageMs = Math.max(0, now - parsed);
  const expiresAt = ttl !== null ? parsed + ttl * 60_000 : null;
  const isExpired = expiresAt !== null && now >= expiresAt;
  const remainingMs = expiresAt !== null ? Math.max(0, expiresAt - now) : null;

  return {
    hasTimestamp: true,
    ttlMinutes: ttl,
    ageMs,
    expiresAt,
    remainingMs,
    isExpired,
  };
}

/** Human label for a TTL in minutes, e.g. 90 -> "1h 30m", 0 -> "Never". */
export function formatTtlLabel(ttlMinutes: number | null | undefined): string {
  if (typeof ttlMinutes !== "number" || ttlMinutes <= 0) return "Never";
  const totalMinutes = Math.round(ttlMinutes);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  return parts.length > 0 ? parts.join(" ") : `${totalMinutes}m`;
}

/** Short countdown label for the time left before expiry. */
export function formatRemainingLabel(remainingMs: number | null): string {
  if (remainingMs === null) return "no expiry";
  if (remainingMs <= 0) return "expired";
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  return `${formatTtlLabel(totalMinutes)} left`;
}
