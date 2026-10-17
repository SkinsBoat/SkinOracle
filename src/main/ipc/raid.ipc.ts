import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import {
  RaidMarketplaceId,
  RaidQuotePayload,
} from "../../shared/types/raid.types";

// ─────────────────────────────────────────────────────────────────
// RAID — Acquisition Quote PDF export
//
// Generates a PDF entirely on the trader's machine via an offscreen
// BrowserWindow + printToPDF (no external service, no extra dependency).
// The HTML is built from escaped values only; the window has no Node
// access and loads a local temp file.
// ─────────────────────────────────────────────────────────────────

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

function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe >= 0 ? "+" : ""}${safe.toFixed(1)}%`;
}

function formatFloat(value?: number): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(4)
    : "—";
}

function sanitizeFileName(value: string): string {
  return (
    (value || "seller")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "seller"
  );
}

export function buildQuoteHtml(payload: RaidQuotePayload): string {
  const sellerName = escapeHtml(payload.seller?.name || "Unknown Seller");
  const marketplace =
    MARKETPLACE_LABELS[payload.seller?.marketplace] ||
    escapeHtml(payload.seller?.marketplace || "");
  const sellerRef = payload.seller?.steamId
    ? `SteamID ${escapeHtml(payload.seller.steamId)}`
    : escapeHtml(payload.seller?.url || "");

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
    purchaseTotal: 0,
    ceilingTotal: 0,
    potentialProfit: 0,
  };

  const bodyRows = rows
    .map((row, index) => {
      const wear = row.exterior ? escapeHtml(row.exterior) : "—";
      return `<tr>
        <td class="num">${index + 1}</td>
        <td>${escapeHtml(row.marketHashName)}</td>
        <td>${wear}</td>
        <td class="num">${formatFloat(row.floatValue)}</td>
        <td class="num">${formatUsd(row.purchasePrice)}</td>
        <td class="num">${formatUsd(row.ceiling)}</td>
        <td class="num green">${formatUsd(row.spread)}</td>
        <td class="num green">${formatPercent(row.marginPercent)}</td>
      </tr>`;
    })
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
  .total td { background: #ffffff; border-top: 2px solid #111827; border-bottom: none; font-weight: 800; }
  .foot { margin-top: 14px; font-size: 8.5px; color: #6b7280; line-height: 1.5; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand">RAID · ACQUISITION QUOTE</div>
      <div class="sub">Targeted Seller Audit · Buy Ceiling Sweep</div>
    </div>
    <div class="meta">Generated<br /><strong>${escapeHtml(generatedLabel)}</strong></div>
  </div>

  <div class="seller">
    <div>
      <div class="sub">Seller</div>
      <h2>${sellerName}</h2>
      <div class="sub">${marketplace} · ${sellerRef}</div>
    </div>
    <div class="meta">Listings in quote<br /><strong>${summary.itemCount}</strong></div>
  </div>

  <div class="summary">
    <div class="card"><div class="label">Items</div><div class="value">${summary.itemCount}</div></div>
    <div class="card"><div class="label">Total Purchase</div><div class="value">${formatUsd(summary.purchaseTotal)}</div></div>
    <div class="card"><div class="label">Total Ceiling</div><div class="value">${formatUsd(summary.ceilingTotal)}</div></div>
    <div class="card"><div class="label">Potential Profit</div><div class="value green">${formatUsd(summary.potentialProfit)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Item</th>
        <th>Wear</th>
        <th class="num">Float</th>
        <th class="num">Purchase</th>
        <th class="num">Ceiling</th>
        <th class="num">Spread</th>
        <th class="num">Margin</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows || '<tr><td colspan="8">No listings at or below the Buy Ceiling.</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="total">
        <td colspan="4">Totals</td>
        <td class="num">${formatUsd(summary.purchaseTotal)}</td>
        <td class="num">${formatUsd(summary.ceilingTotal)}</td>
        <td class="num green">${formatUsd(summary.potentialProfit)}</td>
        <td class="num">—</td>
      </tr>
    </tfoot>
  </table>

  <div class="foot">
    Purchase prices are the seller's listing prices at audit time. Ceilings are the locally
    calculated Oracle Buy Ceilings (Accepted Prices). This quote reflects a single audited
    snapshot — marketplace stock changes continuously, so confirm availability before purchasing.
  </div>
</body>
</html>`;
}

ipcMain.handle("raid:export-quote", async (event, payload: RaidQuotePayload) => {
  if (!payload || !payload.seller || !Array.isArray(payload.rows)) {
    throw new Error("Invalid quote payload.");
  }

  const parent = BrowserWindow.fromWebContents(event.sender);
  const date = new Date().toISOString().slice(0, 10);
  const defaultPath = `raid-quote-${sanitizeFileName(
    payload.seller.name,
  )}-${date}.pdf`;
  const dialogOptions = {
    title: "Export RAID Acquisition Quote",
    defaultPath,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  };

  const result = parent
    ? await dialog.showSaveDialog(parent, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  if (result.canceled || !result.filePath) {
    return { canceled: true as const };
  }

  const html = buildQuoteHtml(payload);
  const tmpHtml = path.join(
    app.getPath("temp"),
    `raid-quote-${Date.now()}.html`,
  );
  fs.writeFileSync(tmpHtml, html, "utf8");

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    await win.loadFile(tmpHtml);
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
    });
    fs.writeFileSync(result.filePath, pdf);
    return { canceled: false as const, filePath: result.filePath };
  } finally {
    win.destroy();
    try {
      fs.unlinkSync(tmpHtml);
    } catch {
      // Temp cleanup is best-effort.
    }
  }
});
