import { ipcMain } from "electron";
import axios from "axios";
import { secureGet, STORAGE_KEYS } from "../../storage/secure-store";
import {
  CSFLOAT_ME,
  CSFLOAT_ME_BUY_ORDERS,
  CSFLOAT_BUY_ORDERS,
  CSFLOAT_BUY_ORDER_BY_ID,
  CSFLOAT_ME_INVENTORY,
  CSFLOAT_LISTINGS,
  CSFLOAT_LISTING_BY_ID,
} from "../constants/apiUrls";
import { snapCsFloatBuyOrderPriceCents } from "../../shared/csfloatUtils";
export { snapCsFloatBuyOrderPriceCents };

// ─────────────────────────────────────────────────────────────────
// CSFloat buy order IPC handlers
//
// All requests go DIRECTLY from the trader's machine to CSFloat's API.
// Zero traffic through our SaaS backend.
// This avoids 429 rate limits on our server and keeps API keys secure.
// ─────────────────────────────────────────────────────────────────

function getHeaders(apiKey: string) {
  return { Authorization: apiKey, "Content-Type": "application/json" };
}

ipcMain.handle("csfloat:get-orders", async () => {
  const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
  if (!apiKey) throw new Error("CSFloat API key not set");

  console.log(
    "[CSFloat IPC] Fetching ALL active buy orders across all pages...",
  );

  let allOrders: any[] = [];
  let currentPage = 0;
  const pageSize = 100;
  let hasMorePages = true;

  while (hasMorePages) {
    console.log(
      `[CSFloat IPC] Fetching page ${currentPage} (limit=${pageSize})...`,
    );
    const res = await axios.get(CSFLOAT_ME_BUY_ORDERS, {
      headers: getHeaders(apiKey),
      params: { page: currentPage, limit: pageSize, order: "desc" },
    });

    const pageOrders = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.orders)
        ? res.data.orders
        : Array.isArray(res.data?.buy_orders)
          ? res.data.buy_orders
          : [];

    if (pageOrders.length > 0) {
      allOrders = allOrders.concat(pageOrders);
    }

    // Stop if page returned less than pageSize items or no items found
    if (pageOrders.length < pageSize) {
      hasMorePages = false;
    } else {
      currentPage++;
      // Small safety pause between pages to respect CSFloat rate limits
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `[CSFloat IPC] ✅ Fetched total ${allOrders.length} active buy orders across ${currentPage + 1} page(s).`,
  );
  return { orders: allOrders, count: allOrders.length };
});

ipcMain.handle(
  "csfloat:create-buy-order",
  async (
    _,
    marketHashName: string,
    maxPriceCents: number,
    quantity: number,
  ) => {
    const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
    if (!apiKey) throw new Error("CSFloat API key not set");

    const validPriceCents = snapCsFloatBuyOrderPriceCents(maxPriceCents);
    console.log(
      `[CSFloat IPC] create-buy-order: ${marketHashName}, raw: ${maxPriceCents}, snapped: ${validPriceCents}, qty: ${quantity}`,
    );

    const res = await axios.post(
      CSFLOAT_BUY_ORDERS,
      {
        market_hash_name: marketHashName,
        max_price: validPriceCents,
        quantity,
      },
      { headers: getHeaders(apiKey) },
    );
    return res.data;
  },
);

export interface CSFloatUpdateBuyOrderPayload {
  max_price: number;
  quantity: number;
  [key: string]: any;
}

ipcMain.handle(
  "csfloat:update-order",
  async (
    _,
    orderId: string,
    maxPriceCentsArg: any,
    quantityArg?: any,
    extraProps?: any,
  ) => {
    const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
    if (!apiKey) throw new Error("CSFloat API key not set");

    if (!orderId || typeof orderId !== "string") {
      throw new Error("CSFloat update error: Valid orderId string is required");
    }

    const rawPriceCents =
      typeof maxPriceCentsArg === "number"
        ? maxPriceCentsArg
        : parseFloat(maxPriceCentsArg);
    const quantity =
      quantityArg !== undefined
        ? typeof quantityArg === "number"
          ? quantityArg
          : parseInt(quantityArg, 10)
        : 1;

    console.log(`[CSFloat IPC] update-order called with args:`, {
      orderId,
      maxPriceCents: rawPriceCents,
      quantity,
      extraProps,
    });

    if (isNaN(rawPriceCents) || rawPriceCents <= 0) {
      throw new Error(
        `CSFloat update error: Invalid maxPriceCents value: ${maxPriceCentsArg}`,
      );
    }

    const validPriceCents = snapCsFloatBuyOrderPriceCents(rawPriceCents);

    const payload: CSFloatUpdateBuyOrderPayload = {
      ...(extraProps && typeof extraProps === "object" ? extraProps : {}),
      max_price: validPriceCents,
      quantity: isNaN(quantity) || quantity < 1 ? 1 : Math.floor(quantity),
    };

    const targetUrl = CSFLOAT_BUY_ORDER_BY_ID(orderId);

    console.log(`[CSFloat IPC] 🚀 Executing updateOrder for ID: ${orderId}`);
    console.log(`[CSFloat IPC] Target URL: ${targetUrl}`);
    console.log(`[CSFloat IPC] Payload Sent:`, JSON.stringify(payload));

    try {
      const res = await axios.patch(targetUrl, payload, {
        headers: getHeaders(apiKey),
      });
      console.log(
        `[CSFloat IPC] ✅ CSFloat Response Success (${res.status}):`,
        JSON.stringify(res.data, null, 2),
      );
      return res.data;
    } catch (err: any) {
      const errorData = err.response?.data || err.message;
      console.error(
        `[CSFloat IPC] ❌ CSFloat Response Error (${err.response?.status || "Network"}):`,
        JSON.stringify(errorData, null, 2),
      );
      throw new Error(
        errorData?.message ||
          errorData?.error ||
          (typeof errorData === "string"
            ? errorData
            : "CSFloat API Update Failed"),
      );
    }
  },
);

ipcMain.handle("csfloat:delete-order", async (_, orderId: string) => {
  const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
  if (!apiKey) throw new Error("CSFloat API key not set");

  await axios.delete(CSFLOAT_BUY_ORDER_BY_ID(orderId), {
    headers: getHeaders(apiKey),
  });
  return { success: true };
});

ipcMain.handle("csfloat:get-me", async () => {
  const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
  if (!apiKey) throw new Error("CSFloat API key not set");

  const res = await axios.get(CSFLOAT_ME, {
    headers: getHeaders(apiKey),
  });
  console.log(
    "[CSFloat IPC] /me Response data:",
    JSON.stringify(res.data, null, 2),
  );
  return res.data;
});

// ── CSFloat Inventory & Listing Management Handlers ───────────────

ipcMain.handle("csfloat:get-inventory", async () => {
  const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
  if (!apiKey) throw new Error("CSFloat API key not set");

  console.log("[CSFloat IPC] Fetching CSFloat user inventory...");
  try {
    const res = await axios.get(CSFLOAT_ME_INVENTORY, {
      headers: getHeaders(apiKey),
    });
    const inventory = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.inventory)
          ? res.data.inventory
          : [];
    console.log(
      `[CSFloat IPC] ✅ Fetched ${inventory.length} inventory items.`,
    );
    return inventory;
  } catch (err: any) {
    const errorData = err.response?.data || err.message;
    console.error("[CSFloat IPC] ❌ Error fetching inventory:", errorData);
    throw new Error(
      errorData?.message ||
        errorData?.error ||
        (typeof errorData === "string"
          ? errorData
          : "Failed to fetch CSFloat inventory"),
    );
  }
});

ipcMain.handle(
  "csfloat:create-listing",
  async (
    _,
    assetId: string,
    priceCentsArg: any,
    privateMode: boolean = false,
  ) => {
    const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
    if (!apiKey) throw new Error("CSFloat API key not set");

    if (!assetId || typeof assetId !== "string") {
      throw new Error(
        "CSFloat create listing error: Valid assetId string is required",
      );
    }

    const priceCents =
      typeof priceCentsArg === "number"
        ? priceCentsArg
        : parseFloat(priceCentsArg);
    if (isNaN(priceCents) || priceCents <= 0) {
      throw new Error(
        `CSFloat create listing error: Invalid priceCents value: ${priceCentsArg}`,
      );
    }

    const payload = {
      asset_id: assetId,
      price: Math.floor(priceCents),
      type: "buy_now",
      private: !!privateMode,
    };

    console.log("[CSFloat IPC] 🚀 Creating CSFloat listing:", payload);
    try {
      const res = await axios.post(CSFLOAT_LISTINGS, payload, {
        headers: getHeaders(apiKey),
      });
      console.log("[CSFloat IPC] ✅ Listing created successfully:", res.data);
      return res.data;
    } catch (err: any) {
      const errorData = err.response?.data || err.message;
      console.error("[CSFloat IPC] ❌ Error creating listing:", errorData);
      throw new Error(
        errorData?.message ||
          errorData?.error ||
          (typeof errorData === "string"
            ? errorData
            : "Failed to create CSFloat listing"),
      );
    }
  },
);

ipcMain.handle("csfloat:delete-listing", async (_, listingId: string) => {
  const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
  if (!apiKey) throw new Error("CSFloat API key not set");

  if (!listingId || typeof listingId !== "string") {
    throw new Error(
      "CSFloat delete listing error: Valid listingId string is required",
    );
  }

  console.log(`[CSFloat IPC] 🚀 Deleting listing ID: ${listingId}`);
  try {
    await axios.delete(CSFLOAT_LISTING_BY_ID(listingId), {
      headers: getHeaders(apiKey),
    });
    console.log(`[CSFloat IPC] ✅ Listing ${listingId} deleted successfully.`);
    return { success: true };
  } catch (err: any) {
    const errorData = err.response?.data || err.message;
    console.error(
      `[CSFloat IPC] ❌ Error deleting listing ${listingId}:`,
      errorData,
    );
    throw new Error(
      errorData?.message ||
        errorData?.error ||
        (typeof errorData === "string"
          ? errorData
          : "Failed to delete CSFloat listing"),
    );
  }
});

ipcMain.handle(
  "csfloat:update-listing",
  async (_, listingId: string, priceCentsArg: any, privateMode?: boolean) => {
    const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
    if (!apiKey) throw new Error("CSFloat API key not set");

    if (!listingId || typeof listingId !== "string") {
      throw new Error(
        "CSFloat update listing error: Valid listingId string is required",
      );
    }

    const priceCents =
      typeof priceCentsArg === "number"
        ? priceCentsArg
        : parseFloat(priceCentsArg);
    if (isNaN(priceCents) || priceCents <= 0) {
      throw new Error(
        `CSFloat update listing error: Invalid priceCents value: ${priceCentsArg}`,
      );
    }

    const payload: any = {
      price: Math.floor(priceCents),
    };
    if (typeof privateMode === "boolean") {
      payload.private = privateMode;
    }

    console.log(`[CSFloat IPC] 🚀 Updating listing ID: ${listingId}`, payload);
    try {
      const res = await axios.patch(CSFLOAT_LISTING_BY_ID(listingId), payload, {
        headers: getHeaders(apiKey),
      });
      console.log(
        `[CSFloat IPC] ✅ Listing ${listingId} updated successfully:`,
        res.data,
      );
      return res.data;
    } catch (err: any) {
      const errorData = err.response?.data || err.message;
      console.error(
        `[CSFloat IPC] ❌ Error updating listing ${listingId}:`,
        errorData,
      );
      throw new Error(
        errorData?.message ||
          errorData?.error ||
          (typeof errorData === "string"
            ? errorData
            : "Failed to update CSFloat listing"),
      );
    }
  },
);
