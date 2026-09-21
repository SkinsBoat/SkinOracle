import {
  BuildPreFilters,
  ListingPriceStrategy,
  OracleStrategyProfile,
  NexusStrategyProfile,
} from "../../../store/useOracleStore";
import {
  roundToCsFloatStep,
  snapCsFloatBuyOrderPriceCents,
  getCsFloatIncrementInCents,
} from "../../../../shared/csfloatUtils";

export {
  roundToCsFloatStep,
  snapCsFloatBuyOrderPriceCents,
  getCsFloatIncrementInCents,
};

// ── Blocked Skins Utilities ───────────────────────────────────────────────────

const WEAR_SUFFIX_RE =
  /\s*\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i;

/**
 * Strips StatTrak™ / Souvenir prefixes and wear condition suffixes from a
 * full market_hash_name to yield the canonical "base" skin name used for
 * pattern-based blocking.
 *
 * Examples:
 *   "StatTrak™ AWP | Atheris (Minimal Wear)"  → "AWP | Atheris"
 *   "Souvenir AWP | Atheris (Field-Tested)"   → "AWP | Atheris"
 *   "AWP | Atheris (Battle-Scarred)"          → "AWP | Atheris"
 *   "Sticker | AWP | Atheris"                 → "Sticker | AWP | Atheris"
 *   "★ Karambit (Vanilla)"                    → "★ Karambit (Vanilla)"
 */
export function extractBaseName(marketHashName: string): string {
  let name = marketHashName.trim();
  // Strip leading "StatTrak™ " (with unicode trademark symbol)
  if (name.startsWith("StatTrak\u2122 ")) {
    name = name.slice("StatTrak\u2122 ".length);
  }
  // Strip leading "Souvenir "
  if (name.startsWith("Souvenir ")) {
    name = name.slice("Souvenir ".length);
  }
  // Strip trailing wear suffix
  name = name.replace(WEAR_SUFFIX_RE, "");
  return name.trim();
}

/**
 * Returns true if the item should be blocked based on the blocked-skins Set.
 * The Set contains base names (output of extractBaseName). This check is O(1)
 * regardless of how large the blocked list is.
 */
export function isBlockedBySkinList(
  marketHashName: string,
  blockedSet: Set<string>,
): boolean {
  if (blockedSet.size === 0) return false;
  return blockedSet.has(extractBaseName(marketHashName));
}

export function passesSmartPreFilters(
  itemName: string,
  filters: BuildPreFilters,
  itemData?: any,
): boolean {
  if (!itemName || typeof itemName !== "string") return false;
  const trimmed = itemName.trim();
  const lower = trimmed.toLowerCase();

  // 1. Souvenir Weapons check (targets Souvenir weapon skins e.g. "Souvenir AWP | Desert Hydra", not packages)
  const isSouvenir = lower.includes("souvenir");
  const isPackage = lower.includes("package");
  if (filters.excludeSouvenir && isSouvenir && !isPackage) {
    return false;
  }

  // 2. StatTrak check
  if (
    filters.excludeStatTrak &&
    (trimmed.includes("StatTrak™") || lower.includes("stattrak"))
  ) {
    return false;
  }

  // 3. Sticker Check (Standalone Stickers ONLY — Patches and Graffiti are excluded)
  const isSticker = lower.startsWith("sticker |");
  if (isSticker) {
    if (filters.excludeStickers) return false;
  } else {
    // 4. Wear Condition Check (Weapons, Knives, Gloves)
    const hasWearInName =
      /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i.test(
        trimmed,
      );
    if (hasWearInName) {
      if (trimmed.includes("(Factory New)") && !filters.allowedWears.fn)
        return false;
      if (trimmed.includes("(Minimal Wear)") && !filters.allowedWears.mw)
        return false;
      if (trimmed.includes("(Field-Tested)") && !filters.allowedWears.ft)
        return false;
      if (trimmed.includes("(Well-Worn)") && !filters.allowedWears.ww)
        return false;
      if (trimmed.includes("(Battle-Scarred)") && !filters.allowedWears.bs)
        return false;
    } else {
      // Vanilla Knives / Weapons (no wear in name, e.g. ★ Karambit, ★ Bayonet) are automatically allowed as valid items
      const isVanillaWeapon =
        trimmed.includes("★") || lower.startsWith("vanilla");
      if (!isVanillaWeapon) {
        // 5. Reject all non-wear items (Cases, Capsules, Packages, Charms, Keys, Music Kits, Agents, Collectibles, etc.)
        return false;
      }
    }
  }

  // 6. Price Range Filter Check (Min & Max Price)
  const minPrice = filters.minPrice;
  const maxPrice = filters.maxPrice;
  const hasMinFilter =
    minPrice !== null && minPrice !== undefined && minPrice > 0;
  const hasMaxFilter =
    maxPrice !== null && maxPrice !== undefined && maxPrice > 0;

  if ((hasMinFilter || hasMaxFilter) && itemData) {
    const listings: { p?: number; price?: number }[] = itemData.l || [];
    const validPrices = listings
      .map((l) => l.p ?? l.price ?? 0)
      .filter((p) => p > 0);
    if (validPrices.length > 0) {
      const lowestPrice = Math.min(...validPrices);
      if (hasMinFilter && lowestPrice < minPrice!) return false;
      if (hasMaxFilter && lowestPrice > maxPrice!) return false;
    }
  }

  return true;
}

export function calculateSuggestedListingPrice(
  prices: number[],
  averageMarketPrice: number,
  strategy: ListingPriceStrategy,
): number {
  let validPrices = prices.filter((p) => p > 0);

  // Outlier Dump Protection: Ignore prices that are > maxOutlierDiscountPercent% below average
  if (
    strategy.ignoreOutliers &&
    validPrices.length > 1 &&
    averageMarketPrice > 0
  ) {
    const cutoffPercentage =
      strategy.maxOutlierDiscountPercent !== undefined
        ? strategy.maxOutlierDiscountPercent
        : 30;
    const minThreshold = averageMarketPrice * (1 - cutoffPercentage / 100);
    const filtered = validPrices.filter((p) => p >= minThreshold);
    if (filtered.length > 0) {
      validPrices = filtered;
    }
  }

  const lowestPrice =
    validPrices.length > 0 ? Math.min(...validPrices) : averageMarketPrice;

  let basePrice = lowestPrice > 0 ? lowestPrice : averageMarketPrice;

  if (strategy.mode === "average" && averageMarketPrice > 0) {
    basePrice = averageMarketPrice;
  } else if (strategy.mode === "undercut") {
    basePrice = (lowestPrice > 0 ? lowestPrice : averageMarketPrice) * 0.99;
  } else if (strategy.mode === "markup") {
    basePrice = (lowestPrice > 0 ? lowestPrice : averageMarketPrice) * 1.02;
  }

  if (strategy.offsetPercent !== 0) {
    basePrice *= 1 + strategy.offsetPercent / 100;
  }

  return roundToCsFloatStep(basePrice);
}

export const NEXUS_PRESETS: Record<string, NexusStrategyProfile> = {
  capital_shield: {
    preset: "capital_shield",
    trendWindow: 14,
    downsideCut: "strict",
    volatilityFilter: "strict",
  },
  balanced: {
    preset: "balanced",
    trendWindow: 14,
    downsideCut: "standard",
    volatilityFilter: "standard",
  },
  aggressive: {
    preset: "aggressive",
    trendWindow: 7,
    downsideCut: "light",
    volatilityFilter: "permissive",
  },
};

export interface MarketQuantityAudit {
  totalListings: number;
  verifiedQtyListings: number;
  missingQtyListings: number;
}

export interface QuantityIntegrityReport {
  totalListings: number;
  verifiedQtyListings: number;
  missingQtyListings: number;
  verifiedPercentage: number;
  marketsWithMissingQty: Record<string, MarketQuantityAudit>;
  isFullyVerified: boolean;
}

/**
 * Audits market listings across the entire price cache to verify genuine, positive quantity data.
 * Does not synthesize or guess missing quantities.
 */
export function auditCacheQuantityIntegrity(
  cache: Record<string, any> | null,
): QuantityIntegrityReport {
  if (!cache || typeof cache !== "object") {
    return {
      totalListings: 0,
      verifiedQtyListings: 0,
      missingQtyListings: 0,
      verifiedPercentage: 100,
      marketsWithMissingQty: {},
      isFullyVerified: true,
    };
  }

  let totalListings = 0;
  let verifiedQtyListings = 0;
  let missingQtyListings = 0;
  const marketStats: Record<string, MarketQuantityAudit> = {};

  for (const item of Object.values(cache)) {
    if (!item?.l || !Array.isArray(item.l)) continue;
    for (const listing of item.l) {
      if (!listing || !listing.m) continue;
      const market = listing.m;
      totalListings++;

      if (!marketStats[market]) {
        marketStats[market] = {
          totalListings: 0,
          verifiedQtyListings: 0,
          missingQtyListings: 0,
        };
      }
      marketStats[market].totalListings++;

      const isVerified =
        typeof listing.q === "number" &&
        Number.isFinite(listing.q) &&
        listing.q > 0;

      if (isVerified) {
        verifiedQtyListings++;
        marketStats[market].verifiedQtyListings++;
      } else {
        missingQtyListings++;
        marketStats[market].missingQtyListings++;
      }
    }
  }

  const marketsWithMissingQty: Record<string, MarketQuantityAudit> = {};
  for (const [market, stats] of Object.entries(marketStats)) {
    if (stats.missingQtyListings > 0) {
      marketsWithMissingQty[market] = stats;
    }
  }

  const verifiedPercentage =
    totalListings > 0
      ? Math.round((verifiedQtyListings / totalListings) * 100)
      : 100;

  return {
    totalListings,
    verifiedQtyListings,
    missingQtyListings,
    verifiedPercentage,
    marketsWithMissingQty,
    isFullyVerified: missingQtyListings === 0,
  };
}

/**
 * Formats ISO timestamps, epoch numbers, Date objects, or time strings into
 * relative "time ago" format (e.g., "just now", "2m ago", "1h ago", "3d ago").
 */
export function formatTimeAgo(
  timestamp: string | number | Date | null | undefined,
): string {
  if (!timestamp) return "Never";

  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "number") {
    date = new Date(timestamp);
  } else {
    const str = String(timestamp).trim();
    if (!str) return "Never";
    const parsed = Date.parse(str);
    if (!isNaN(parsed)) {
      date = new Date(parsed);
    } else {
      // Fallback for "HH:MM:SS" or "HH:MM:SS AM/PM" strings
      const todayParsed = Date.parse(`${new Date().toDateString()} ${str}`);
      if (!isNaN(todayParsed)) {
        date = new Date(todayParsed);
      } else {
        return str;
      }
    }
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  if (diffMs < 0) return "just now";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export interface TrendHealthStatus {
  daysCount: number;
  latestDate: string | null;
  oldestDate: string | null;
  daysSinceLatest: number | null;
  spanDays: number | null;
  missingDaysInRange: number;
  isStale: boolean;
  isDecaying: boolean;
  hasContinuityGap: boolean;
  isInsufficient: boolean;
  status: "insufficient" | "stale" | "decaying" | "gap" | "healthy" | "empty";
  badgeText: string;
  badgeClass: string;
  warningMessage: string | null;
}

/**
 * Evaluates the health and continuity of historical trend data for Nexus Pro.
 * Flags staleness (> 3 days old, which triggers backend Nexus fallback to base Oracle),
 * decaying recency (2-3 days old, missing 48h moves), and continuity gaps (> 2 missing days in range).
 */
export function evaluateTrendHealth(
  stats: {
    daysCount: number;
    totalSnapshots: number;
    itemCoverage: number;
    latestDate: string | null;
    oldestDate: string | null;
  } | null,
  referenceDateStr?: string | null,
): TrendHealthStatus {
  if (
    !stats ||
    stats.daysCount === 0 ||
    !stats.latestDate ||
    !stats.oldestDate
  ) {
    const days = stats?.daysCount || 0;
    return {
      daysCount: days,
      latestDate: stats?.latestDate || null,
      oldestDate: stats?.oldestDate || null,
      daysSinceLatest: null,
      spanDays: null,
      missingDaysInRange: 0,
      isStale: false,
      isDecaying: false,
      hasContinuityGap: false,
      isInsufficient: true,
      status: "empty",
      badgeText:
        days > 0
          ? `▲ Baseline Building (${days}/3 Days)`
          : "○ No History (0/3 Days)",
      badgeClass: days > 0 ? "badge-warning" : "badge-ghost",
      warningMessage:
        "No trend snapshots recorded yet. Build price cache in Step 1 daily to accumulate history.",
    };
  }

  let refDateMs: number;
  if (referenceDateStr && /^\d{4}-\d{2}-\d{2}$/.test(referenceDateStr)) {
    refDateMs = Date.parse(`${referenceDateStr}T00:00:00Z`);
  } else {
    const todayIso = new Date().toISOString().slice(0, 10);
    refDateMs = Date.parse(`${todayIso}T00:00:00Z`);
  }

  const latestMs = Date.parse(`${stats.latestDate}T00:00:00Z`);
  const oldestMs = Date.parse(`${stats.oldestDate}T00:00:00Z`);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysSinceLatest = Math.max(
    0,
    Math.floor((refDateMs - latestMs) / msPerDay),
  );
  const spanDays = Math.max(
    1,
    Math.floor((latestMs - oldestMs) / msPerDay) + 1,
  );
  const missingDaysInRange = Math.max(0, spanDays - stats.daysCount);

  const isInsufficient = stats.daysCount < 3;
  const isStale = !isInsufficient && daysSinceLatest > 3;
  const isDecaying = !isInsufficient && !isStale && daysSinceLatest >= 2;
  const hasContinuityGap =
    !isInsufficient && !isStale && missingDaysInRange >= 2;

  let status: TrendHealthStatus["status"] = "healthy";
  let badgeText = `● Verified (${stats.daysCount}d)`;
  let badgeClass = stats.daysCount >= 7 ? "badge-primary" : "badge-primary";
  let warningMessage: string | null = null;

  if (isInsufficient) {
    status = "insufficient";
    badgeText = `▲ Baseline Building (${stats.daysCount}/3 Days — Recommended 7 Days)`;
    badgeClass = "badge-warning";
    warningMessage = `Minimum 3 days of trend required for Nexus engine (currently ${stats.daysCount} day${stats.daysCount === 1 ? "" : "s"}).`;
  } else if (isStale) {
    status = "stale";
    badgeText = `▲ Stale Trends (${daysSinceLatest}d ago — Engine Bypassed)`;
    badgeClass = "badge-warning";
    warningMessage = `Critical: Latest snapshot was recorded ${daysSinceLatest} days ago (${stats.latestDate}). Because Nexus caps data age at 3 days, trend momentum and downside protection will be BYPASSED, falling back to base pricing. Refresh price cache in Step 1.`;
  } else if (isDecaying) {
    status = "decaying";
    badgeText = `▲ Trends Outdated (${daysSinceLatest}d lag)`;
    badgeClass = "badge-warning";
    warningMessage = `Caution: Latest snapshot is ${daysSinceLatest} days old (${stats.latestDate}). Price movements from the last 48 hours are missing, which may delay price trend detection. We recommend refreshing price cache in Step 1.`;
  } else if (hasContinuityGap) {
    status = "gap";
    badgeText = `▲ Trend Gap (${missingDaysInRange}d missing)`;
    badgeClass = "badge-warning";
    warningMessage = `Notice: ${missingDaysInRange} days are missing between ${stats.oldestDate} and ${stats.latestDate} (${stats.daysCount} of ${spanDays} days recorded). Linear regression slope may be sensitive to gaps.`;
  } else if (stats.daysCount < 7) {
    badgeText = `● Verified (${stats.daysCount}d — Recommended 7d)`;
  }

  return {
    daysCount: stats.daysCount,
    latestDate: stats.latestDate,
    oldestDate: stats.oldestDate,
    daysSinceLatest,
    spanDays,
    missingDaysInRange,
    isStale,
    isDecaying,
    hasContinuityGap,
    isInsufficient,
    status,
    badgeText,
    badgeClass,
    warningMessage,
  };
}
