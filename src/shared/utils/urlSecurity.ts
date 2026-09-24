/**
 * Safe URL parsing and validation helpers conforming to CodeQL SAST standards.
 * Eliminates incomplete substring sanitization vulnerabilities (CWE-20).
 */

/**
 * Validates whether a given URL safely belongs to SteamApis image delivery domain.
 * Strictly checks parsed WHATWG URL hostname rather than substring inclusion.
 */
export function isSteamApisImage(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.protocol === "https:" &&
      (parsed.hostname === "api.steamapis.com" ||
        parsed.hostname.endsWith(".steamapis.com"))
    );
  } catch {
    return false;
  }
}
