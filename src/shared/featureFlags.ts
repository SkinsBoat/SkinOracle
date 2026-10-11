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
   * Skinport Workstation — sidebar entry for the public Skinport market items
   * scan and the live sale feed. Always visible in development
   * (`import.meta.env.DEV`); visible in production only while this is `true`.
   * No API key is required (both Skinport endpoints are public).
   */
  SKINPORT_WORKSTATION: true,
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
