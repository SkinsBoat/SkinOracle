/**
 * Validation helpers for Community Trend History Marketplace IPC inputs.
 *
 * The renderer is untrusted, so every value that crosses the IPC bridge is
 * normalized here before it reaches the SaaS API. Kept framework-free so it can
 * be unit-tested without booting Electron.
 */

export const TREND_LISTING_SORTS = [
  "popular",
  "recent",
  "days",
  "coverage",
  "quality",
] as const;

export type TrendListingSort = (typeof TREND_LISTING_SORTS)[number];

export const TREND_PACK_TITLE_MAX_LENGTH = 120;
export const TREND_MARKET_MAX_PAGE = 1000;
export const TREND_MARKET_MAX_LIMIT = 50;
export const TREND_EXPORT_MAX_DAYS = 90;

const UUID_PATTERN = /^[0-9a-fA-F-]{36}$/;

/** Clamps an untrusted numeric input to a safe integer range. */
export function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export interface RawListingParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}

export interface SanitizedListingParams {
  page: number;
  limit: number;
  sort: TrendListingSort;
  search?: string;
}

/** Validates/normalizes renderer-supplied listing query params. */
export function sanitizeListingParams(
  params?: RawListingParams,
): SanitizedListingParams {
  const sort = TREND_LISTING_SORTS.includes(params?.sort as TrendListingSort)
    ? (params!.sort as TrendListingSort)
    : "popular";
  const search =
    typeof params?.search === "string"
      ? params.search.trim().slice(0, TREND_PACK_TITLE_MAX_LENGTH) || undefined
      : undefined;

  return {
    page: clampInt(params?.page, 1, TREND_MARKET_MAX_PAGE, 1),
    limit: clampInt(params?.limit, 1, TREND_MARKET_MAX_LIMIT, 12),
    sort,
    search,
  };
}

/** Trims and bounds an untrusted pack title; throws when empty. */
export function sanitizeTitle(value: unknown): string {
  const title =
    typeof value === "string"
      ? value.trim().slice(0, TREND_PACK_TITLE_MAX_LENGTH)
      : "";
  if (!title) throw new Error("A dataset title is required.");
  return title;
}

/** Trims and bounds an untrusted skin name. */
export function sanitizeSkinName(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, 255).trim() || undefined;
}

/** True when the value looks like a UUID (pack id). */
export function isTrendPackId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// ── Nexus Pro trend-history requirements ────────────────────────────────────
/** Minimum recorded days required before Nexus Pro will run. */
export const NEXUS_MIN_TREND_DAYS = 3;
/** Maximum missing days tolerated in the retained trend span before Nexus blocks. */
export const NEXUS_MAX_MISSING_DAYS = 3;

export interface TrendPackSuitability {
  ok: boolean;
  spanDays: number;
  missingDays: number;
  reason?: string;
}

/**
 * Determines whether a marketplace pack alone can unlock Nexus Pro when it
 * fully replaces local history. Because purchase now replaces (not merges), a
 * pack with too few days or a large internal gap would leave the user blocked,
 * so we refuse it up front instead of charging for a useless pack.
 */
export function evaluateTrendPackSuitability(pack: {
  daysCount: number;
  oldestDate?: string | null;
  latestDate?: string | null;
}): TrendPackSuitability {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysCount = Number(pack?.daysCount) || 0;
  const hasDates =
    typeof pack?.oldestDate === "string" &&
    typeof pack?.latestDate === "string" &&
    !Number.isNaN(Date.parse(`${pack.oldestDate}T00:00:00Z`)) &&
    !Number.isNaN(Date.parse(`${pack.latestDate}T00:00:00Z`));
  const spanDays = hasDates
    ? Math.round(
        (Date.parse(`${pack.latestDate}T00:00:00Z`) -
          Date.parse(`${pack.oldestDate}T00:00:00Z`)) /
          msPerDay,
      ) + 1
    : daysCount;
  const missingDays = Math.max(0, spanDays - daysCount);

  if (daysCount < NEXUS_MIN_TREND_DAYS) {
    return {
      ok: false,
      spanDays,
      missingDays,
      reason: `This pack contains only ${daysCount} day(s) of history. Nexus Pro requires at least ${NEXUS_MIN_TREND_DAYS}.`,
    };
  }
  if (missingDays > NEXUS_MAX_MISSING_DAYS) {
    return {
      ok: false,
      spanDays,
      missingDays,
      reason: `This pack has ${missingDays} missing days in its window (max ${NEXUS_MAX_MISSING_DAYS} allowed). It would leave Nexus Pro blocked.`,
    };
  }
  return { ok: true, spanDays, missingDays };
}
