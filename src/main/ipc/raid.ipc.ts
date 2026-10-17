import { app, BrowserWindow, clipboard, dialog, ipcMain } from "electron";
import * as fs from "fs";
import * as path from "path";
import { RaidOfferPayload } from "../../shared/types/raid.types";
import { buildOfferHtml } from "../../shared/offerHtml";
import { parseStorefrontClipboard } from "../../shared/raidStorefront";

// ─────────────────────────────────────────────────────────────────
// RAID — Purchase Offer PDF export
//
// Generates a PDF entirely on the trader's machine via an offscreen
// BrowserWindow + printToPDF (no external service, no extra dependency).
// The HTML builder lives in src/shared/offerHtml.ts (pure + unit-tested)
// and guarantees SteamIDs are masked.
// ─────────────────────────────────────────────────────────────────

function sanitizeFileName(value: string): string {
  return (
    (value || "seller")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "seller"
  );
}

// RAID-scoped clipboard paste.
//
// Reads the clipboard in main and returns ONLY a validated storefront
// reference (marketplace + handle + canonical URL) or an error. Raw clipboard
// contents never reach the renderer, and bare slugs are rejected because they
// could be an API key/token sitting on the clipboard.
ipcMain.handle("raid:paste-storefront", () =>
  parseStorefrontClipboard(clipboard.readText()),
);

ipcMain.handle("raid:export-offer", async (event, payload: RaidOfferPayload) => {
  if (!payload || !payload.seller || !Array.isArray(payload.rows)) {
    throw new Error("Invalid offer payload.");
  }

  const parent = BrowserWindow.fromWebContents(event.sender);
  const date = new Date().toISOString().slice(0, 10);
  const defaultPath = `purchase-offer-${sanitizeFileName(
    payload.seller.name,
  )}-${date}.pdf`;
  const dialogOptions = {
    title: "Export Purchase Offer",
    defaultPath,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  };

  const result = parent
    ? await dialog.showSaveDialog(parent, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions);

  if (result.canceled || !result.filePath) {
    return { canceled: true as const };
  }

  const html = buildOfferHtml(payload);
  const tmpHtml = path.join(
    app.getPath("temp"),
    `purchase-offer-${Date.now()}.html`,
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
