/**
 * RAID — Live Negotiation Table room helpers.
 *
 * Share links intentionally carry only the room id and the short-lived guest
 * token. The deal inventory is pushed over the encrypted WebRTC DataChannel via
 * `INIT_DEAL_STATE`; no compressed inventory belongs in the URL.
 */

/**
 * Guest URL: `<base>#room=<roomId>&token=<guestToken>`.
 * The hash fragment never leaves the browser.
 */
export function buildDealShareUrl(
  baseUrl: string,
  roomId: string,
  guestToken?: string,
): string {
  const base = String(baseUrl || '')
    .split('#')[0]
    .replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('room', roomId);
  if (guestToken) params.set('token', guestToken);
  return `${base}#${params.toString()}`;
}
