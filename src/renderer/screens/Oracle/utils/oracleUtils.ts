import { BuildPreFilters, ListingPriceStrategy, OracleStrategyProfile } from '../../../store/useOracleStore';
import {
  roundToCsFloatStep,
  snapCsFloatBuyOrderPriceCents,
  getCsFloatIncrementInCents,
} from '../../../../shared/csfloatUtils';

export {
  roundToCsFloatStep,
  snapCsFloatBuyOrderPriceCents,
  getCsFloatIncrementInCents,
};

export function passesSmartPreFilters(itemName: string, filters: BuildPreFilters, itemData?: any): boolean {
  const lower = itemName.toLowerCase();

  // 1. Souvenir check
  if (filters.excludeSouvenir && lower.includes('souvenir')) {
    return false;
  }

  // 2. StatTrak check
  if (filters.excludeStatTrak && (itemName.includes('StatTrak™') || lower.includes('stattrak'))) {
    return false;
  }

  // 3. Sticker Check (Stickers, Patches, Sealed Graffiti)
  const isSticker = lower.startsWith('sticker |') || lower.startsWith('patch |') || lower.startsWith('sealed graffiti |');
  if (isSticker) {
    if (filters.excludeStickers) return false;
  } else {
    // 4. Wear Condition Check (Weapons, Knives, Gloves)
    const hasWearInName = /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/i.test(itemName);
    if (hasWearInName) {
      if (itemName.includes('(Factory New)') && !filters.allowedWears.fn) return false;
      if (itemName.includes('(Minimal Wear)') && !filters.allowedWears.mw) return false;
      if (itemName.includes('(Field-Tested)') && !filters.allowedWears.ft) return false;
      if (itemName.includes('(Well-Worn)') && !filters.allowedWears.ww) return false;
      if (itemName.includes('(Battle-Scarred)') && !filters.allowedWears.bs) return false;
    } else {
      // Vanilla Knives / Weapons (no wear in name, e.g. ★ Karambit, ★ Bayonet) are automatically allowed as valid items
      const isVanillaWeapon = itemName.includes('★') || lower.startsWith('vanilla');
      if (!isVanillaWeapon) {
        // 5. Reject all non-wear items (Cases, Capsules, Packages, Charms, Keys, Music Kits, Agents, Collectibles, etc.)
        return false;
      }
    }
  }

  // 6. Price Range Filter Check (Min & Max Price)
  const minPrice = filters.minPrice;
  const maxPrice = filters.maxPrice;
  const hasMinFilter = minPrice !== null && minPrice !== undefined && minPrice > 0;
  const hasMaxFilter = maxPrice !== null && maxPrice !== undefined && maxPrice > 0;

  if ((hasMinFilter || hasMaxFilter) && itemData) {
    const listings: { p?: number; price?: number }[] = itemData.l || [];
    const validPrices = listings.map(l => l.p ?? l.price ?? 0).filter(p => p > 0);
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
  strategy: ListingPriceStrategy
): number {
  let validPrices = prices.filter(p => p > 0);

  // Outlier Dump Protection: Ignore prices that are > maxOutlierDiscountPercent% below average
  if (strategy.ignoreOutliers && validPrices.length > 1 && averageMarketPrice > 0) {
    const cutoffPercentage = strategy.maxOutlierDiscountPercent !== undefined ? strategy.maxOutlierDiscountPercent : 30;
    const minThreshold = averageMarketPrice * (1 - cutoffPercentage / 100);
    const filtered = validPrices.filter(p => p >= minThreshold);
    if (filtered.length > 0) {
      validPrices = filtered;
    }
  }

  const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : averageMarketPrice;

  let basePrice = lowestPrice > 0 ? lowestPrice : averageMarketPrice;

  if (strategy.mode === 'average' && averageMarketPrice > 0) {
    basePrice = averageMarketPrice;
  } else if (strategy.mode === 'undercut') {
    basePrice = (lowestPrice > 0 ? lowestPrice : averageMarketPrice) * 0.99;
  } else if (strategy.mode === 'markup') {
    basePrice = (lowestPrice > 0 ? lowestPrice : averageMarketPrice) * 1.02;
  }

  if (strategy.offsetPercent !== 0) {
    basePrice *= (1 + strategy.offsetPercent / 100);
  }

  return roundToCsFloatStep(basePrice);
}

// Translate friendly strategy parameters to backend evaluation options without exposing internal math
export function mapStrategyToBackendOptions(strategy: OracleStrategyProfile) {
  let minGlobalQty = 100;
  if (strategy.liquidityDepth === 'strict') minGlobalQty = 250;
  if (strategy.liquidityDepth === 'broad') minGlobalQty = 10;

  let safetyMultiplier = 1.0;
  if (strategy.valuationMargin === 'conservative') safetyMultiplier = 0.95;
  if (strategy.valuationMargin === 'competitive') safetyMultiplier = 1.03;

  // Spike & Outlier Protection Parameter Mapping
  let outlierCap = 1.28; // Default 28% ceiling above lowest listing price
  let useStdDevFilter = false;
  let stdDevThreshold = 0.10;

  if (strategy.outlierProtection === 'strict') {
    outlierCap = 1.15; // Tight 15% cap (filters out high price spikes & artificial listings)
    useStdDevFilter = true; // Enables Standard Deviation price agreement shield
    stdDevThreshold = 0.08; // Trims items if market price variance > 8%
  } else if (strategy.outlierProtection === 'permissive') {
    outlierCap = 1.50; // Broad 50% cap above lowest price
    useStdDevFilter = false;
  }

  return {
    minGlobalQty,
    safetyMultiplier,
    outlierCap,
    useStdDevFilter,
    stdDevThreshold,
    outlierMode: strategy.outlierProtection,
  };
}
