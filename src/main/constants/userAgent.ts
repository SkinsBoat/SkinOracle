import { app } from "electron";

/**
 * Standard RFC 7231 User-Agent for all external platform integrations
 * (CSFloat, DMarket, Skins.com, Skinsnipe, CS2Cap).
 *
 * Clearly identifies SkinOracle desktop clients in third-party exchange & Cloudflare logs,
 * establishing brand credibility, showing active trader volume, and enabling partner/affiliate recognition.
 */
let cachedUserAgent: string | null = null;

export function getAppUserAgent(): string {
  if (!cachedUserAgent) {
    const version =
      typeof app?.getVersion === "function" ? app.getVersion() : "0.1.7";
    cachedUserAgent = `SkinOracle-Desktop/${version} (+https://skinsboat.com)`;
  }
  return cachedUserAgent;
}
