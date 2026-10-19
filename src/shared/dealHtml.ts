import { maskSteamIdsInText } from "./offerHtml";
import { DealExportPayload } from "./types/dealExport.types";

/**
 * Locked negotiation-deal PDF HTML builder.
 *
 * Pure (no Electron / Node imports) so it can be unit-tested. The payload is a
 * strict public projection: no ceilings, spreads, margins, or internal formulas.
 */

const MARKETPLACE_LABELS: Record<string, string> = {
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

function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatUsd(value: number): string {
  return `$${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
}

function formatFloat(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(4)
    : "—";
}

function formatPct(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "0%";
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}%`;
}

function statusLabel(status: string, selected: boolean): string {
  if (!selected) return "Excluded";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Excluded";
  return "Pending";
}

export function buildDealHtml(payload: DealExportPayload): string {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const discount = Number.isFinite(payload.globalDiscountPct)
    ? payload.globalDiscountPct
    : 0;

  const rows = items.map((item, index) => ({
    ...item,
    index: index + 1,
    effectiveOffer: roundUsd(
      (Number.isFinite(item.proposedPrice) ? item.proposedPrice : 0) *
        (1 + discount / 100),
    ),
  }));

  const selected = rows.filter((item) => item.selected);
  const listedTotal = roundUsd(
    selected.reduce((sum, item) => sum + item.listingPrice, 0),
  );
  const offerTotal = roundUsd(
    selected.reduce((sum, item) => sum + item.effectiveOffer, 0),
  );
  const delta = roundUsd(listedTotal - offerTotal);

  const sellerName = escapeHtml(
    maskSteamIdsInText(payload.sellerHandle || "Seller"),
  );
  const marketplace =
    MARKETPLACE_LABELS[payload.marketplace] ||
    escapeHtml(payload.marketplace || "Marketplace");
  const generatedAt = new Date(payload.exportedAt);
  const generatedLabel = Number.isNaN(generatedAt.getTime())
    ? "—"
    : generatedAt.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const bodyRows = rows
    .map(
      (item) => `<tr>
        <td class="num">${item.index}</td>
        <td>
          <div class="item-name">${escapeHtml(item.marketHashName)}</div>
          <div class="item-meta">${escapeHtml(item.exterior || "")}${
            item.exterior ? " · " : ""
          }Float ${formatFloat(item.floatValue)}</div>
        </td>
        <td class="num">${formatUsd(item.listingPrice)}</td>
        <td class="num strong">${formatUsd(item.effectiveOffer)}</td>
        <td class="num">${
          typeof item.counterPrice === "number"
            ? formatUsd(item.counterPrice)
            : "—"
        }</td>
        <td class="num ${item.selected ? "accepted" : "excluded"}">${statusLabel(
          item.status,
          item.selected,
        )}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
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
  .meta strong { color: #111827; }
  .cards { display: flex; gap: 8px; margin: 14px 0; }
  .card { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; }
  .label { font-size: 8px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { margin-top: 3px; font-size: 16px; font-weight: 800; }
  .value.green { color: #047857; }
  .value.amber { color: #b45309; }
  .value.blue { color: #1d4ed8; }
  .note { margin: 0 0 10px; padding: 8px 10px; border-radius: 6px; background: #f3f4f6; color: #374151; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { text-align: left; font-size: 8px; text-transform: uppercase; letter-spacing: 0.4px; color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 6px 5px; }
  td { border-bottom: 1px solid #f3f4f6; padding: 6px 5px; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .strong { font-weight: 800; color: #1d4ed8; }
  .accepted { color: #047857; font-weight: 700; }
  .excluded { color: #9ca3af; font-weight: 700; }
  .item-name { font-weight: 700; color: #111827; }
  .item-meta { margin-top: 2px; font-size: 8px; color: #6b7280; }
  .footer { margin-top: 14px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 8px; color: #6b7280; line-height: 1.5; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand">SKINORACLE</div>
      <div class="sub">Live Negotiation · Locked Deal</div>
    </div>
    <div class="meta">
      Generated<br /><strong>${escapeHtml(generatedLabel)}</strong><br />
      Room ${escapeHtml(payload.roomId)}
    </div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Seller</div><div class="value" style="font-size:12px">${sellerName}</div><div class="sub">${marketplace}</div></div>
    <div class="card"><div class="label">Included Items</div><div class="value">${selected.length}</div><div class="sub">${rows.length} total listings</div></div>
    <div class="card"><div class="label">Agreed Offer</div><div class="value blue">${formatUsd(offerTotal)}</div><div class="sub">Listed ${formatUsd(listedTotal)}</div></div>
    <div class="card"><div class="label">${delta >= 0 ? "Savings" : "Premium"}</div><div class="value ${delta >= 0 ? "green" : "amber"}">${formatUsd(Math.abs(delta))}</div><div class="sub">Adjustment ${formatPct(discount)}</div></div>
  </div>

  <div class="note">
    Deal locked by both parties · Trader ${payload.traderReady ? "ready" : "not ready"} · Seller ${payload.sellerReady ? "ready" : "not ready"}.
    Public pricing only — internal ceilings and margins are never included.
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Item</th>
        <th class="num">Listed</th>
        <th class="num">Agreed Offer</th>
        <th class="num">Counter</th>
        <th class="num">Status</th>
      </tr>
    </thead>
    <tbody>${bodyRows || `<tr><td colspan="6">No items in this deal.</td></tr>`}</tbody>
  </table>

  <div class="footer">
    SkinOracle Live Negotiation Table · Room ${escapeHtml(payload.roomId)} · ${escapeHtml(
      payload.dealLocked ? "Deal locked" : "Deal not locked",
    )}.<br />
    This summary is generated locally from the agreed peer-to-peer state. It contains no account credentials, ceilings, spreads, or internal margin formulas.
  </div>
</body>
</html>`;
}
