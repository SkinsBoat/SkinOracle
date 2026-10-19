import { ipcMain } from "electron";
import axios from "axios";
import { STEAM_COMMUNITY_SITE, STEAM_INVENTORY } from "../constants/apiUrls";
import { getAppUserAgent } from "../constants/userAgent";
import type {
  SteamInventoryAsset,
  SteamInventoryAssetProperties,
  SteamInventoryDescription,
  SteamInventoryResponse,
} from "../../shared/types/steam.types";

// ─────────────────────────────────────────────────────────────────
// RAID — Steam Community CS2 inventory
//
// Public inventory endpoint reached DIRECTLY from the trader's machine.
// Only a validated SteamID64 is interpolated into the URL. The endpoint is
// paginated; pages are merged and deduplicated before returning to the
// renderer, which then filters non-tradable items and normalizes metadata.
// ─────────────────────────────────────────────────────────────────

const STEAM_ID64 = /^\d{17}$/;
const PAGE_SIZE = 2000;
const MAX_PAGES = 20;

function normalizeError(err: any): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const raw =
      (typeof err.response?.data === "string" && err.response.data) ||
      err.response?.data?.Error ||
      err.response?.data?.message ||
      err.message;
    const message =
      typeof raw === "string"
        ? raw.replace(/\s+/g, " ").trim().slice(0, 240)
        : "Failed to fetch the Steam inventory.";
    return new Error(status ? `[${status}] ${message}` : message);
  }
  return err instanceof Error ? err : new Error(String(err));
}

ipcMain.handle(
  "steam:get-inventory",
  async (_, steamId: string): Promise<SteamInventoryResponse> => {
    const id = typeof steamId === "string" ? steamId.trim() : "";
    if (!STEAM_ID64.test(id)) {
      throw new Error(
        "A valid 17-digit SteamID64 is required for a Steam inventory.",
      );
    }

    const assets = new Map<string, SteamInventoryAsset>();
    const descriptions = new Map<string, SteamInventoryDescription>();
    const properties = new Map<string, SteamInventoryAssetProperties>();
    let total = 0;
    let startAssetId: string | undefined;

    try {
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const params: Record<string, string | number> = {
          l: "english",
          count: PAGE_SIZE,
        };
        if (startAssetId) params.start_assetid = startAssetId;

        const res = await axios.get(STEAM_INVENTORY(id), {
          headers: {
            Accept: "application/json",
            "User-Agent": getAppUserAgent(),
            Referer: `${STEAM_COMMUNITY_SITE}/profiles/${id}/inventory`,
          },
          params,
          timeout: 20000,
        });

        const data = res.data as SteamInventoryResponse;
        if (!data || data.success !== 1) {
          throw new Error(
            data?.Error ||
              "Steam inventory is private, unavailable, or empty.",
          );
        }

        for (const asset of data.assets ?? []) {
          assets.set(asset.assetid, asset);
        }
        for (const description of data.descriptions ?? []) {
          descriptions.set(
            `${description.classid}_${description.instanceid}`,
            description,
          );
        }
        for (const property of data.asset_properties ?? []) {
          properties.set(property.assetid, property);
        }

        total = Math.max(total, data.total_inventory_count ?? 0);

        const more = data.more_items === 1;
        const last = data.last_assetid;
        if (!more || !last || last === startAssetId) break;
        startAssetId = last;

        // Respect the public endpoint between pages.
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      return {
        success: 1,
        assets: Array.from(assets.values()),
        descriptions: Array.from(descriptions.values()),
        asset_properties: Array.from(properties.values()),
        total_inventory_count: total || assets.size,
        more_items: 0,
      };
    } catch (err) {
      throw normalizeError(err);
    }
  },
);
