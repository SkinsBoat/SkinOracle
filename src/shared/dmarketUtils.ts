/**
 * DMarket balance helpers.
 *
 * DMarket reports the flat USD balance (cents) and any proceeds still under
 * Steam Trade Protection (`usdTradeProtected`, cents) separately. Trade-
 * protected funds remain spendable on the market during the protection window,
 * so the tradeable USD balance is their sum.
 */

export interface DmarketSpendableBalance {
  /** Flat USD balance as reported by DMarket, in cents. */
  rawUsdCents: number;
  /** Trade-protected proceeds that are still spendable, in cents. */
  tradeProtectedSpendableCents: number;
  /** Combined tradeable USD balance, in cents. */
  usdCents: number;
  /** Combined tradeable USD balance rendered as "$0.00". */
  usdFormatted: string;
}

/** Parse a DMarket cent-denominated field, tolerating strings and nulls. */
export function parseDmarketCents(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const cents = parseInt(String(value), 10);
  return Number.isFinite(cents) && cents > 0 ? cents : 0;
}

export function getTradeProtectedSpendableCents(data: any): number {
  if (!data || typeof data !== "object") return 0;
  return parseDmarketCents(data.usdTradeProtected);
}

/**
 * Build the combined tradeable USD balance from a raw `/account/v1/balance`
 * response.
 */
export function buildDmarketSpendableBalance(
  data: any,
): DmarketSpendableBalance {
  const rawUsdCents = parseDmarketCents(data?.usd);
  const tradeProtectedSpendableCents = getTradeProtectedSpendableCents(data);
  const usdCents = rawUsdCents + tradeProtectedSpendableCents;

  return {
    rawUsdCents,
    tradeProtectedSpendableCents,
    usdCents,
    usdFormatted: `$${(usdCents / 100).toFixed(2)}`,
  };
}
