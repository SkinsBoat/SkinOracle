// ─────────────────────────────────────────────────────────────────
// Skins.com API key format validation (no Electron/fs dependencies, so it can
// be unit-tested in isolation).
// ─────────────────────────────────────────────────────────────────

const MIN_KEY_LENGTH = 16;
const MAX_KEY_LENGTH = 512;

/** Reject control characters (incl. CR/LF) and any interior whitespace. */
const INVALID_KEY_CHARS = /[\u0000-\u001f\u007f\s]/;

/**
 * Normalize a raw Skins.com API key before it is placed in an `Authorization`
 * header: enforce the type and length bounds, and reject control characters /
 * whitespace so a malformed keystore entry cannot inject headers.
 */
export function normalizeSkinscomApiKey(key: unknown): string {
  if (typeof key !== "string") {
    throw new Error("Invalid Skins.com API key");
  }
  const normalized = key.trim();
  if (
    normalized.length < MIN_KEY_LENGTH ||
    normalized.length > MAX_KEY_LENGTH
  ) {
    throw new Error("Skins.com API key has an unexpected length");
  }
  if (INVALID_KEY_CHARS.test(normalized)) {
    throw new Error("Skins.com API key contains invalid characters");
  }
  return normalized;
}
