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
};

/** Human-readable feature name used in disabled responses and notices. */
export const TREND_MARKET_FEATURE_NAME =
  "Community Trend History Marketplace";

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
