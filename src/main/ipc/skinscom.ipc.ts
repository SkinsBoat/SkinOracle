import { ipcMain } from "electron";
import axios from "axios";
import {
  SKINSCOM_METADATA,
  SKINSCOM_LISTED_ITEMS,
  SKINSCOM_USER_INVENTORY,
  SKINSCOM_DEPOSITS,
  SKINSCOM_DEPOSIT_BY_ID,
  SKINSCOM_DEPOSIT_BULK_PRICES,
  SKINSCOM_DEPOSIT_CANCEL,
} from "../constants/apiUrls";
import { getAppUserAgent } from "../constants/userAgent";
import type {
  SkinscomListedItemsParams,
  SkinscomCreateDepositItem,
  SkinscomBulkPriceItem,
  SkinscomStreamFilters,
} from "../../shared/types/skinscom.types";
import {
  startSkinscomStream,
  stopSkinscomStream,
  getSkinscomStreamStatus,
} from "../services/skinscomSocket";
import { readSkinscomApiKey } from "../services/skinscomCredentials";

// ─────────────────────────────────────────────────────────────────
// Skins.com Trading API IPC handlers
//
// Clean-room implementation of the Skins.com Trading API
// (https://trading-api.skins.com). See
// src/renderer/screens/Skinscom/SKINSCOM_TRADING_API.md for the full
// endpoint/field reference and the vendored OpenAPI spec.
//
// All requests go DIRECTLY from the trader's machine to Skins.com.
// Zero traffic through our SaaS backend. The Bearer API key is read
// from the OS-encrypted store and never leaves the main process.
// ─────────────────────────────────────────────────────────────────

function getHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": getAppUserAgent(),
  };
}

function requireApiKey(): string {
  return readSkinscomApiKey();
}

/** Explicit allow-list of query params (never spread caller input wholesale). */
function buildListedItemsParams(
  query: SkinscomListedItemsParams,
  perPage: number,
  page: number,
): Record<string, string | number | undefined> {
  return {
    search: query.search,
    auction: query.auction,
    sort: query.sort,
    order: query.order,
    price_min: query.price_min,
    price_max: query.price_max,
    price_max_above: query.price_max_above,
    wear_min: query.wear_min,
    wear_max: query.wear_max,
    delivery_time_long_min: query.delivery_time_long_min,
    delivery_time_long_max: query.delivery_time_long_max,
    has_stickers: query.has_stickers,
    is_commodity: query.is_commodity,
    per_page: perPage,
    page,
  };
}

/**
 * Translate Axios errors into a clean, user-facing message. Skins.com returns
 * `{ success, message, message_localized }` for both auth and validation errors.
 */
function toCleanError(err: any): Error {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    const message =
      data?.message ||
      data?.error ||
      (typeof data === "string" ? data : null) ||
      err.message;
    const status = err.response?.status;
    return new Error(status ? `[${status}] ${message}` : message);
  }
  return err instanceof Error ? err : new Error(String(err));
}

async function request<T>(
  fn: () => Promise<{ data: T }>,
): Promise<T> {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    throw toCleanError(err);
  }
}

// ── Account / metadata (user + wallet balance in USD cents) ────────
ipcMain.handle("skinscom:get-metadata", async () => {
  const apiKey = requireApiKey();
  return request(() =>
    axios.get(SKINSCOM_METADATA, { headers: getHeaders(apiKey) }),
  );
});

// ── Public marketplace listings (paginated) ────────────────────────
// `GET /trading/items` returns items listed for sale by ANY depositor,
// not the trader's own inventory/deposits. See the API reference doc.
// Skins.com rate limit: 120 requests / 60s per IP across all endpoints
// (HTTP 429 + 60s lockout when exceeded). Paging pauses at 550ms and is
// capped so a sync stays well under that budget.
const LISTED_ITEMS_PAGE_DELAY_MS = 550;
const LISTED_ITEMS_MAX_PAGES = 40;

ipcMain.handle(
  "skinscom:get-listed-items",
  async (_, params: SkinscomListedItemsParams = {}) => {
    const apiKey = requireApiKey();
    const { fetchAll = false, ...query } = params;
    const perPage = query.per_page ?? 100;

    if (!fetchAll) {
      return request(() =>
        axios.get(SKINSCOM_LISTED_ITEMS, {
          headers: getHeaders(apiKey),
          params: buildListedItemsParams(query, perPage, query.page ?? 1),
        }),
      );
    }

    const first = await request<any>(() =>
      axios.get(SKINSCOM_LISTED_ITEMS, {
        headers: getHeaders(apiKey),
        params: buildListedItemsParams(query, perPage, 1),
      }),
    );

    const lastPage: number = first?.last_page ?? 1;
    let allItems: any[] = Array.isArray(first?.data) ? first.data : [];

    const maxPages = Math.min(lastPage, LISTED_ITEMS_MAX_PAGES);
    for (let page = 2; page <= maxPages; page++) {
      await new Promise((r) => setTimeout(r, LISTED_ITEMS_PAGE_DELAY_MS));
      const next = await request<any>(() =>
        axios.get(SKINSCOM_LISTED_ITEMS, {
          headers: getHeaders(apiKey),
          params: buildListedItemsParams(query, perPage, page),
        }),
      );
      const pageItems = Array.isArray(next?.data) ? next.data : [];
      if (pageItems.length === 0) break;
      allItems = allItems.concat(pageItems);
    }

    return { ...first, data: allItems, current_page: 1, total: allItems.length };
  },
);

// ── Steam CS2 inventory (deposit source) ───────────────────────────
ipcMain.handle("skinscom:get-inventory", async () => {
  const apiKey = requireApiKey();
  return request(() =>
    axios.get(SKINSCOM_USER_INVENTORY, { headers: getHeaders(apiKey) }),
  );
});

// ── Create deposits (list items). Max 20 items per request. ────────
ipcMain.handle(
  "skinscom:create-deposit",
  async (_, items: SkinscomCreateDepositItem[]) => {
    const apiKey = requireApiKey();
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("No items supplied to deposit");
    }
    return request(() =>
      axios.post(
        SKINSCOM_DEPOSITS,
        { items },
        { headers: getHeaders(apiKey) },
      ),
    );
  },
);

// ── Update a single listing price (USD cents) ──────────────────────
ipcMain.handle(
  "skinscom:update-listing-price",
  async (_, depositId: number | string, coinValue: number) => {
    const apiKey = requireApiKey();
    return request(() =>
      axios.patch(
        SKINSCOM_DEPOSIT_BY_ID(depositId),
        { coin_value: coinValue },
        { headers: getHeaders(apiKey) },
      ),
    );
  },
);

// ── Bulk update listing prices. Max 20 items per request. ──────────
ipcMain.handle(
  "skinscom:bulk-update-listing-prices",
  async (_, items: SkinscomBulkPriceItem[]) => {
    const apiKey = requireApiKey();
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("No items supplied to bulk reprice");
    }
    return request(() =>
      axios.patch(
        SKINSCOM_DEPOSIT_BULK_PRICES,
        { items },
        { headers: getHeaders(apiKey) },
      ),
    );
  },
);

// ── Cancel a listing ───────────────────────────────────────────────
ipcMain.handle(
  "skinscom:cancel-deposit",
  async (_, depositId: number | string) => {
    const apiKey = requireApiKey();
    return request(() =>
      axios.post(
        SKINSCOM_DEPOSIT_CANCEL(depositId),
        {},
        { headers: getHeaders(apiKey) },
      ),
    );
  },
);

// ── Live item feed (websocket) ─────────────────────────────────────
// The socket is owned by the main process (see services/skinscomSocket.ts);
// these handlers only start/stop it and report status. Events are pushed to the
// renderer on `skinscom:stream-event`.
ipcMain.handle(
  "skinscom:start-stream",
  async (_, filters?: SkinscomStreamFilters) =>
    startSkinscomStream(filters ?? {}),
);
ipcMain.handle("skinscom:stop-stream", () => stopSkinscomStream());
ipcMain.handle("skinscom:get-stream-status", () =>
  getSkinscomStreamStatus(),
);
