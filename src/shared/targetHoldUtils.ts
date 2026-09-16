import { DmarketTargetItem } from "./types";

/**
 * DMarket Target hold/cooldown duration in seconds: 11 minutes (660 seconds).
 * After creating or updating a target, DMarket enforces a hold time limit and rejects
 * further modifications until this duration has expired.
 */
export const TARGET_HOLD_DURATION_SECONDS = 11 * 60; // 660 seconds

export interface TargetHoldInfo {
  isHoldActive: boolean;
  remainingSeconds: number;
  formattedRemaining: string; // e.g. "10:48" or "00:00"
  holdExpiresAt: number | null; // Unix timestamp in ms
  lastActionTime: number | null; // Unix timestamp in ms of creation or last update
}

/**
 * Formats remaining cooldown seconds as "MM:SS" or "H:MM:SS".
 */
export function formatTargetCooldown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "00:00";
  const clamped = Math.max(0, Math.round(remainingSeconds));

  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Parses diverse timestamp formats returned by DMarket (ISO strings, Unix ms, Unix seconds).
 */
export function parseTargetTimestamp(time: any): number | null {
  if (!time) return null;
  if (typeof time === "number") {
    if (isNaN(time) || time <= 0) return null;
    return time < 1e11 ? time * 1000 : time;
  }
  if (typeof time === "string") {
    const trimmed = time.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      return num < 1e11 ? num * 1000 : num;
    }
    const parsed = new Date(trimmed).getTime();
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Calculates whether a target is currently under the 11-minute DMarket hold,
 * the remaining seconds, and formatted countdown string.
 */
export function getTargetHoldInfo(
  target: Partial<DmarketTargetItem> | null | undefined,
  now: number = Date.now(),
): TargetHoldInfo {
  if (!target) {
    return {
      isHoldActive: false,
      remainingSeconds: 0,
      formattedRemaining: "00:00",
      holdExpiresAt: null,
      lastActionTime: null,
    };
  }

  // Use updatedAt if present, otherwise fall back to createdAt (or _raw fields)
  const rawUpdated =
    target.updatedAt ||
    (target as any)._raw?.updatedAt ||
    (target as any).updatedAtMs ||
    target.createdAt ||
    (target as any)._raw?.createdAt ||
    (target as any).createdAtMs;

  const lastActionTime = parseTargetTimestamp(rawUpdated);
  if (!lastActionTime) {
    return {
      isHoldActive: false,
      remainingSeconds: 0,
      formattedRemaining: "00:00",
      holdExpiresAt: null,
      lastActionTime: null,
    };
  }

  const holdDurationMs = TARGET_HOLD_DURATION_SECONDS * 1000;
  const holdExpiresAt = lastActionTime + holdDurationMs;
  const remainingMs = holdExpiresAt - now;
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const isHoldActive = remainingSeconds > 0;

  return {
    isHoldActive,
    remainingSeconds,
    formattedRemaining: formatTargetCooldown(remainingSeconds),
    holdExpiresAt,
    lastActionTime,
  };
}
