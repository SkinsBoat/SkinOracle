import { RaidMarketplaceId, RaidOfferPayload } from "./types/raid.types";

/**
 * Purchase-offer PDF HTML builder.
 *
 * Pure (no Electron / Node imports) so it can be unit-tested. The final
 * document is passed through `maskSteamIdsInText`, guaranteeing that no
 * SteamID64 survives anywhere in the rendered offer.
 */

const MARKETPLACE_LABELS: Record<RaidMarketplaceId, string> = {
  skinport: "Skinport",
  csfloat: "CSFloat",
  dmarket: "DMarket",
  csmoney: "CS.MONEY",
  steam: "Steam Inventory",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function formatUsd(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `$${safe.toFixed(2)}`;
}

function formatFloat(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(4)
    : "—";
}

/** Masks a SteamID, leaving only the last 5 characters visible. */
export function maskSteamId(value: string | undefined): string {
  const id = String(value ?? "").trim();
  if (!id) return "";
  const visible = id.slice(-5);
  return `${"*".repeat(Math.max(0, id.length - visible.length))}${visible}`;
}

/**
 * Masks any SteamID-like digit run (15–20 digits) embedded anywhere in a
 * string — including URLs and usernames. Only the last 5 digits are kept.
 */
export function maskSteamIdsInText(value: string): string {
  return String(value ?? "").replace(/\d{15,20}/g, (match) => {
    const visible = match.slice(-5);
    return `${"*".repeat(Math.max(0, match.length - visible.length))}${visible}`;
  });
}

export function buildOfferHtml(payload: RaidOfferPayload): string {
  const sellerName = escapeHtml(
    maskSteamIdsInText(payload.seller?.name || "Unknown Seller"),
  );
  const marketplace =
    MARKETPLACE_LABELS[payload.seller?.marketplace] ||
    escapeHtml(payload.seller?.marketplace || "");
  const rawSellerRef = payload.seller?.steamId
    ? `SteamID ${maskSteamId(payload.seller.steamId)}`
    : payload.seller?.url || "";
  const sellerRef = escapeHtml(maskSteamIdsInText(rawSellerRef));

  const generatedAt = new Date(payload.generatedAt);
  const generatedLabel = Number.isNaN(generatedAt.getTime())
    ? "—"
    : generatedAt.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const summary = payload.summary || {
    itemCount: rows.length,
    ceilingTotal: 0,
    listingTotal: 0,
    belowCeilingCount: 0,
  };

  const bodyRows = rows
    .map((row, index) => {
      return `<tr>
        <td class="num">${index + 1}</td>
        <td>${escapeHtml(row.marketHashName)}</td>
        <td class="num">${formatFloat(row.floatValue)}</td>
        <td class="num">${formatUsd(row.listingPrice)}</td>
        <td class="num strong">${formatUsd(row.buyCeiling)}</td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111827; font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 11px; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 10px; }
  .brand { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
  .sub { margin-top: 2px; font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; }
  .meta { text-align: right; font-size: 10px; color: #374151; line-height: 1.5; }
  .seller { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 12px; }
  .seller h2 { margin: 0; font-size: 15px; font-weight: 800; }
  .summary { display: flex; gap: 8px; margin: 14px 0; }
  .card { flex: 1; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; }
  .card .label { font-size: 8.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .card .value { margin-top: 2px; font-size: 15px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; }
  th { padding: 6px 5px; text-align: left; font-size: 9px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1.5px solid #111827; }
  td { padding: 5px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .green { color: #15803d; font-weight: 700; }
  .red { color: #b91c1c; font-weight: 700; }
  .strong { font-weight: 800; }
  .total td { background: #ffffff; border-top: 2px solid #111827; border-bottom: none; font-weight: 800; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand">PURCHASE OFFER</div>
      <div class="sub">Buyer Offer to Seller · Buy Ceilings</div>
    </div>
    <div class="meta">Prepared<br /><strong>${escapeHtml(generatedLabel)}</strong></div>
  </div>

  <div class="seller">
    <div>
      <div class="sub">Prepared for</div>
      <h2>${sellerName}</h2>
      <div class="sub">${marketplace} · ${sellerRef}</div>
    </div>
    <div class="meta">Listings in this offer<br /><strong>${summary.itemCount}</strong></div>
  </div>

  <div class="summary">
    <div class="card"><div class="label">Items Offered</div><div class="value">${summary.itemCount}</div></div>
    <div class="card"><div class="label">Total Offer</div><div class="value green">${formatUsd(summary.ceilingTotal)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Item</th>
        <th class="num">Float</th>
        <th class="num">Current Listing</th>
        <th class="num">Our Offer</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="5">No seller listings matched a buy ceiling.</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="total">
        <td colspan="4">Total Offer</td>
        <td class="num">${formatUsd(summary.ceilingTotal)}</td>
      </tr>
    </tfoot>
  </table>

</body>
</html>`;

  // Final safety pass: no SteamID-like digit run can survive anywhere.
  return maskSteamIdsInText(html);
}
