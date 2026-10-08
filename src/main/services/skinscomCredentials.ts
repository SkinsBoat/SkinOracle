import { secureGet, STORAGE_KEYS } from "../../storage/secure-store";
import { normalizeSkinscomApiKey } from "./skinscomKeyFormat";

// ─────────────────────────────────────────────────────────────────
// Skins.com credential access
//
// The Bearer key is read from the OS-encrypted store and placed in an
// `Authorization` header, so it is normalized (see skinscomKeyFormat.ts) before
// use.
// ─────────────────────────────────────────────────────────────────

/** Read + normalize the Skins.com API key from the OS-encrypted store. */
export function readSkinscomApiKey(): string {
  const raw = secureGet(STORAGE_KEYS.SKINSCOM);
  if (!raw) throw new Error("Skins.com API key not set");
  return normalizeSkinscomApiKey(raw);
}

export { normalizeSkinscomApiKey };
