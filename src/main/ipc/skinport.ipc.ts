import { ipcMain } from "electron";
import axios from "axios";
import { SKINPORT_ITEMS } from "../constants/apiUrls";
import { getAppUserAgent } from "../constants/userAgent";
import type {
  SkinportItemsParams,
  SkinportMarketItem,
} from "../../shared/types/skinport.types";
import {
  startSkinportStream,
  stopSkinportStream,
  getSkinportStreamStatus,
} from "../services/skinportSocket";

// ─────────────────────────────────────────────────────────────────
// Skinport Marketplace IPC handlers
//
// All requests fire DIRECTLY from the trader's machine to Skinport.
// No auth and no SaaS routing: `GET /v1/items` is public. Brotli
// (`Accept-Encoding: br`) is required by Skinport for this endpoint.
// ─────────────────────────────────────────────────────────────────

ipcMain.handle(
  "skinport:get-items",
  async (_, params: SkinportItemsParams = {}): Promise<SkinportMarketItem[]> => {
    const query = {
      app_id: params.app_id ?? 730,
      currency: params.currency ?? "USD",
      // Skinport's default (tradable only) matches the website price. Passing
      // tradable=0 surfaces stale / trade-locked listings that are far cheaper
      // than what a buyer sees on the market page.
      tradable: params.tradable === false ? 0 : 1,
    };

    try {
      const res = await axios.get(SKINPORT_ITEMS, {
        headers: {
          "Accept-Encoding": "br",
          Accept: "application/json",
          "User-Agent": getAppUserAgent(),
        },
        params: query,
        timeout: 20000,
        decompress: true,
      });
      return Array.isArray(res.data) ? res.data : [];
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message =
          (typeof err.response?.data === "string" && err.response.data) ||
          err.response?.data?.message ||
          err.message;
        throw new Error(status ? `[${status}] ${message}` : message);
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  },
);

ipcMain.handle("skinport:start-stream", async () => startSkinportStream());
ipcMain.handle("skinport:stop-stream", () => stopSkinportStream());
ipcMain.handle("skinport:get-stream-status", () => getSkinportStreamStatus());
