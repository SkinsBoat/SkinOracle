import { ipcMain } from "electron";
import axios from "axios";
import { SKINPORT_ITEMS, SKINPORT_SHOP, SKINPORT_SITE } from "../constants/apiUrls";
import { getAppUserAgent } from "../constants/userAgent";
import type {
  SkinportItemsParams,
  SkinportMarketItem,
  SkinportShopApiResponse,
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

// ─────────────────────────────────────────────────────────────────
// RAID — Skinport seller storefront stock
//
// Public endpoint reached directly from the trader's machine. Only the
// shop slug is forwarded, and it is strictly validated before use so the
// handle can never rewrite the request path.
// ─────────────────────────────────────────────────────────────────

/** Skinport shop slugs are lowercase alphanumerics with `_` / `-` separators. */
const SKINPORT_SHOP_HANDLE = /^[A-Za-z0-9_.-]{1,64}$/;

ipcMain.handle(
  "skinport:get-shop",
  async (_, shopLink: string): Promise<SkinportShopApiResponse> => {
    const handle = typeof shopLink === "string" ? shopLink.trim() : "";
    if (!SKINPORT_SHOP_HANDLE.test(handle)) {
      throw new Error(
        "Invalid storefront link — a valid Skinport shop slug is required.",
      );
    }

    try {
      const res = await axios.get(SKINPORT_SHOP(handle), {
        headers: {
          "Accept-Encoding": "br",
          Accept: "application/json",
          "User-Agent": getAppUserAgent(),
          Referer: `${SKINPORT_SITE}/shop/${handle}`,
        },
        timeout: 20000,
        decompress: true,
      });

      const data = res.data;
      if (!data || data.success !== true || !Array.isArray(data.items)) {
        throw new Error(
          data?.message || "Storefront not found, private, or empty.",
        );
      }
      return {
        success: true,
        message: data.message ?? null,
        shopSteamId: data.shopSteamId,
        shopName: data.shopName,
        shopLink: data.shopLink,
        filter: data.filter,
        items: data.items,
      };
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const raw =
          (typeof err.response?.data === "string" && err.response.data) ||
          err.response?.data?.message ||
          err.message;
        // Cloudflare can return an HTML challenge page; keep the surfaced
        // message short and single-line instead of dumping markup into the UI.
        const message =
          typeof raw === "string"
            ? raw.replace(/\s+/g, " ").trim().slice(0, 200)
            : String(raw);
        throw new Error(status ? `[${status}] ${message}` : message);
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  },
);
