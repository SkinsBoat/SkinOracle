/**
 * SaaS API error helpers shared between the main process and renderer.
 *
 * The backend registers a global MaintenanceGuard that returns HTTP 503 with
 * MAINTENANCE_MODE or ENGINE_RESTART_HOLD before any billable or storage-mutating
 * work runs. Consumers use these helpers to pause UI actions and show a friendly
 * "server is restarting" message instead of a raw failure.
 */

export type ApiErrorLike = {
  statusCode?: number;
  code?: string;
  message?: string;
  rawMessage?: string;
} | null | undefined;

function messageOf(err: ApiErrorLike): string {
  return `${err?.message || ""} ${err?.rawMessage || ""}`.toLowerCase();
}

/** True when the API rejected the request with a transient engine restart hold. */
export function isEngineRestartHoldError(err: ApiErrorLike): boolean {
  if (!err) return false;
  if (err.code === "ENGINE_RESTART_HOLD") return true;
  const msg = messageOf(err);
  return (
    msg.includes("preparing for server restart") ||
    msg.includes("engine_restart_hold") ||
    msg.includes("temporarily paused")
  );
}

/** True when the whole platform is in a maintenance window. */
export function isMaintenanceModeError(err: ApiErrorLike): boolean {
  if (!err) return false;
  if (err.code === "MAINTENANCE_MODE") return true;
  return messageOf(err).includes("undergoing maintenance");
}

/** True when marketplace object storage (Cloudflare R2) is unavailable. */
export function isStorageUnavailableError(err: ApiErrorLike): boolean {
  if (!err) return false;
  if (
    err.code === "STORAGE_UNAVAILABLE" ||
    err.code === "STORAGE_NOT_CONFIGURED"
  ) {
    return true;
  }
  const msg = messageOf(err);
  return msg.includes("marketplace storage") && msg.includes("unavailable");
}

/** True when a request was intentionally held (restart hold or maintenance). */
export function isRequestHeldError(err: ApiErrorLike): boolean {
  return isEngineRestartHoldError(err) || isMaintenanceModeError(err);
}

/** Standard trader-facing copy for a held request. */
export const REQUEST_HOLD_MESSAGE =
  "Server is preparing for restart. Marketplace actions are temporarily paused — please retry in a few seconds.";

/** Standard trader-facing copy when marketplace storage is unavailable. */
export const STORAGE_UNAVAILABLE_MESSAGE =
  "Marketplace storage is temporarily unavailable. Buying and publishing are paused — please try again shortly.";
