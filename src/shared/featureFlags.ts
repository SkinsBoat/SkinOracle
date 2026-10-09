/**
 * Central feature flags for temporarily disabling shipped features.
 *
 * Flip a flag back to `true` to fully restore a feature — no other code change
 * is required. Flags are shared between the main process (IPC gating) and the
 * renderer (navigation/route gating) so both stay in sync.
 */

export const FEATURE_FLAGS = {
  /** Community Trend History Marketplace (browse, purchase, publish, seller dashboard). */
  TREND_MARKET: false,

  /**
   * Skins.com "Listings & Inventory" tab (seller deposit flow) — PRODUCTION
   * gate. The tab is always visible in development (`import.meta.env.DEV`) and
   * hidden in production unless this flag is `true`.
   *
   * Why it's disabled in prod: the Skins.com Trading API exposes NO
   * listing/sale status for the trader's own items — there is no "get my
   * deposits" endpoint, `GET /trading/user/inventory` has no listing flag, and
   * `GET /trading/deposit/status/{tracking_code}` only reports deposit
   * creation (processing/completed/failed). So the UI cannot correctly show
   * LISTED vs UNLISTED (or SOLD) and would go stale. Only a live websocket
   * session (new_item/deleted_item) could signal it, with no persistence.
   * See src/renderer/screens/Skinscom/SKINSCOM_TRADING_API.md for the full
   * write-up. Flip to `true` only once a reliable status source exists.
   */
  SKINSCOM_LISTINGS: false,

  /**
   * Skins.com Workstation — PRODUCTION gate for the sidebar entry.
   *
   * Always visible in development (`import.meta.env.DEV`) and hidden in
   * production unless this flag is `true`. Flip to `true` to re-expose the
   * Skins.com workstation in production.
   */
  SKINSCOM_WORKSTATION: false,
};

/** Human-readable feature name used in disabled responses and notices. */
export const TREND_MARKET_FEATURE_NAME = "Community Trend History Marketplace";

/** Uniform soft result returned by a disabled feature's endpoints. */
export interface FeatureDisabledResponse {
  success: false;
  code: "FEATURE_DISABLED";
  message: string;
}

/** Builds the standard "feature temporarily disabled" response payload. */
export function featureDisabledResponse(
  featureName: string,
): FeatureDisabledResponse {
  return {
    success: false,
    code: "FEATURE_DISABLED",
    message: `${featureName} is temporarily disabled.`,
  };
}
