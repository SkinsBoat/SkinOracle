/**
 * DMarket Cooldown / AssetTimeLocked Utilities
 *
 * Handles parsing, storage, countdown formatting, and protection against
 * repeating operations on items subject to DMarket's new rate-limit time limits:
 * "New time limits are applied from now on - after creating/updating an offer,
 * you can make any changes only after the time limit expired"
 */

export interface CooldownEntry {
  offerId: string;
  assetId?: string;
  expiresAt: number; // Unix timestamp in milliseconds
  durationSeconds: number;
  reason?: string;
  code?: string;
}

export const COOLDOWNS_STORAGE_KEY = "dmarket_active_cooldowns";

/**
 * Parses DMarket's cooldown duration from error message string or number.
 * Supported formats:
 * - "10:48" (MM:SS) -> 648 seconds
 * - "01:10:48" (HH:MM:SS) -> 4248 seconds
 * - "648" (seconds) -> 648 seconds
 * - "10m 48s", "10 min", "15m" -> parsed seconds
 * - Fallback: 600 seconds (10 minutes) if format unrecognized
 */
export function parseCooldownSeconds(
  message: string | number | undefined | null,
  fallbackSeconds: number = 600,
): number {
  if (typeof message === "number" && !isNaN(message)) {
    return Math.max(0, Math.round(message));
  }
  if (!message || typeof message !== "string") {
    return fallbackSeconds;
  }

  const trimmed = message.trim();
  if (!trimmed) return fallbackSeconds;

  // 1. Check HH:MM:SS (e.g. 01:10:48)
  const hhmmssMatch = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (hhmmssMatch) {
    const hours = parseInt(hhmmssMatch[1], 10);
    const mins = parseInt(hhmmssMatch[2], 10);
    const secs = parseInt(hhmmssMatch[3], 10);
    return Math.max(0, hours * 3600 + mins * 60 + secs);
  }

  // 2. Check MM:SS (e.g. 10:48, 05:02, 1:30)
  const mmssMatch = trimmed.match(/^(\d{1,3}):(\d{2})$/);
  if (mmssMatch) {
    const mins = parseInt(mmssMatch[1], 10);
    const secs = parseInt(mmssMatch[2], 10);
    return Math.max(0, mins * 60 + secs);
  }

  // 3. Check plain seconds integer (e.g. "648" or "648s")
  const plainSecMatch = trimmed.match(/^(\d+)\s*s(?:ec(?:ond)?s?)?$/i);
  if (plainSecMatch) {
    return Math.max(0, parseInt(plainSecMatch[1], 10));
  }
  if (/^\d+$/.test(trimmed)) {
    return Math.max(0, parseInt(trimmed, 10));
  }

  // 4. Check descriptive text like "10 min 48 sec", "15m", "10 minutes"
  let totalSecs = 0;
  let matchedAny = false;

  const hoursMatch = trimmed.match(/(\d+)\s*(?:h|hr|hour)s?/i);
  if (hoursMatch) {
    totalSecs += parseInt(hoursMatch[1], 10) * 3600;
    matchedAny = true;
  }

  const minsMatch = trimmed.match(/(\d+)\s*(?:m|min|minute)s?/i);
  if (minsMatch) {
    totalSecs += parseInt(minsMatch[1], 10) * 60;
    matchedAny = true;
  }

  const secsMatch = trimmed.match(/(\d+)\s*(?:s|sec|second)s?/i);
  if (secsMatch) {
    totalSecs += parseInt(secsMatch[1], 10);
    matchedAny = true;
  }

  if (matchedAny && totalSecs > 0) {
    return totalSecs;
  }

  return fallbackSeconds;
}

/**
 * Formats remaining cooldown seconds as "MM:SS" or "H:MM:SS".
 */
export function formatCooldown(remainingSeconds: number): string {
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
 * Loads valid (non-expired) cooldowns from localStorage.
 */
export function loadStoredCooldowns(): Record<string, CooldownEntry> {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(COOLDOWNS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};

    const now = Date.now();
    const valid: Record<string, CooldownEntry> = {};
    let hasExpired = false;

    Object.entries(parsed).forEach(([key, val]: [string, any]) => {
      if (val && typeof val.expiresAt === "number" && val.expiresAt > now) {
        valid[key] = val;
      } else {
        hasExpired = true;
      }
    });

    if (hasExpired) {
      saveStoredCooldowns(valid);
    }
    return valid;
  } catch (err) {
    console.warn("[CooldownUtils] Failed to load stored cooldowns:", err);
    return {};
  }
}

/**
 * Saves cooldowns map to localStorage.
 */
export function saveStoredCooldowns(
  cooldowns: Record<string, CooldownEntry>,
): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(
      COOLDOWNS_STORAGE_KEY,
      JSON.stringify(cooldowns),
    );
  } catch (err) {
    console.warn("[CooldownUtils] Failed to save cooldowns:", err);
  }
}
