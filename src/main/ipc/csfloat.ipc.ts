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
  CSFLOAT_USER_STALL,
  CSFLOAT_ITEM_BUY_ORDERS,
  CSFLOAT_ME_TRADES,
} from "../constants/apiUrls";
import { snapCsFloatBuyOrderPriceCents } from "../../shared/csfloatUtils";
import { getAppUserAgent } from "../constants/userAgent";
export { snapCsFloatBuyOrderPriceCents };

let cachedSteamId: string | null = null;

// ─────────────────────────────────────────────────────────────────
// CSFloat buy order IPC handlers
//
// All requests go DIRECTLY from the trader's machine to CSFloat's API.
// Zero traffic through our SaaS backend.
// This avoids 429 rate limits on our server and keeps API keys secure.
// ─────────────────────────────────────────────────────────────────

function getHeaders(apiKey: string) {
  return {
    Authorization: apiKey,
    "Content-Type": "application/json",
    "User-Agent": getAppUserAgent(),
  };
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
  if (res.data?.user?.steam_id) {
    cachedSteamId = res.data.user.steam_id;
  }
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

    const listed = inventory.filter((i: any) => !!i.listing_id);
    console.log(
      `[CSFloat IPC] 🔎 Listed/Stall items count: ${listed.length}`,
    );

    // Track sold / queued / pending delivery trades and listings
    const soldMap: Record<
      string,
      { is_sold: boolean; trade_state: string; trade_id?: string; price?: number }
    > = {};

    // 0. Query active seller trades on CSFloat to detect pending P2P deliveries
    try {
      const tradesRes = await axios.get(CSFLOAT_ME_TRADES, {
        headers: getHeaders(apiKey),
        params: { role: "seller", limit: 50 },
      });
      const tradesList = Array.isArray(tradesRes.data?.trades)
        ? tradesRes.data.trades
        : Array.isArray(tradesRes.data)
          ? tradesRes.data
          : [];

      for (const t of tradesList) {
        const isTradeActiveOrSold =
          t.state === "queued" ||
          t.state === "pending" ||
          t.state === "waiting_for_trade" ||
          t.contract?.state === "sold";

        if (isTradeActiveOrSold) {
          const soldInfo = {
            is_sold: true,
            trade_state: t.state || t.contract?.state || "queued",
            trade_id: t.id,
            price: t.contract?.price,
          };
          if (t.contract?.item?.asset_id) {
            soldMap[t.contract.item.asset_id] = soldInfo;
          }
          if (t.contract_id) {
            soldMap[t.contract_id] = soldInfo;
          }
          if (t.contract?.id) {
            soldMap[t.contract.id] = soldInfo;
          }
        }
      }
      if (Object.keys(soldMap).length > 0) {
        console.log(
          `[CSFloat IPC] 📦 Found ${Object.keys(soldMap).length} active/pending seller trades.`,
        );
      }
    } catch (tradeErr: any) {
      console.warn(
        "[CSFloat IPC] ⚠️ Could not fetch seller trades:",
        tradeErr.message,
      );
    }

    // CSFloat /me/inventory provides listing_id, but the active listing price
    // lives in the user stall or listing endpoint. Enrich all listed items with price.
    if (listed.length > 0) {
      const priceMap: Record<string, { price: number; private?: boolean }> = {};

      // 1. Batch fetch from user's stall via CSFloat stall endpoint
      try {
        if (!cachedSteamId) {
          const meRes = await axios.get(CSFLOAT_ME, {
            headers: getHeaders(apiKey),
          });
          cachedSteamId = meRes.data?.user?.steam_id || null;
        }

        if (cachedSteamId) {
          let stallCursor: string | undefined = undefined;
          let stallDone = false;
          let pageCount = 0;

          while (!stallDone && pageCount < 10) {
            pageCount++;
            const params: any = { limit: 100 };
            if (stallCursor) params.cursor = stallCursor;

            const stallRes = await axios.get(
              CSFLOAT_USER_STALL(cachedSteamId),
              {
                headers: getHeaders(apiKey),
                params,
              },
            );

            const stallList = Array.isArray(stallRes.data?.data)
              ? stallRes.data.data
              : [];

            for (const stallItem of stallList) {
              if (stallItem.id && typeof stallItem.price === "number") {
                priceMap[stallItem.id] = {
                  price: stallItem.price,
                  private: !!stallItem.private,
                };
                if (stallItem.item?.asset_id) {
                  priceMap[stallItem.item.asset_id] = {
                    price: stallItem.price,
                    private: !!stallItem.private,
                  };
                }
              }
            }

            stallCursor = stallRes.data?.cursor;
            if (!stallCursor || stallList.length < 100) {
              stallDone = true;
            }
          }
        }
      } catch (stallErr: any) {
        console.warn(
          "[CSFloat IPC] ⚠️ Could not fetch stall batch prices:",
          stallErr.message,
        );
      }

      // 2. Fallback for any listed items not found in public stall (e.g. private listings, sold listings, or race conditions)
      const missingListings = listed.filter(
        (i: any) => !priceMap[i.listing_id] && !priceMap[i.asset_id],
      );

      if (missingListings.length > 0) {
        console.log(
          `[CSFloat IPC] 🔄 Fetching ${missingListings.length} individual listing details for missing prices...`,
        );
        await Promise.allSettled(
          missingListings.map(async (item: any) => {
            try {
              const listingRes = await axios.get(
                CSFLOAT_LISTING_BY_ID(item.listing_id),
                { headers: getHeaders(apiKey) },
              );
              const l = listingRes.data;
              if (l && typeof l.price === "number") {
                priceMap[item.listing_id] = {
                  price: l.price,
                  private: !!l.private,
                };
                if (item.asset_id) {
                  priceMap[item.asset_id] = {
                    price: l.price,
                    private: !!l.private,
                  };
                }
              }

              // Also check if listing itself is marked sold or queued
              if (l && (l.state === "sold" || l.state === "queued")) {
                const soldInfo = {
                  is_sold: true,
                  trade_state: l.state,
                  price: l.price,
                };
                soldMap[item.listing_id] = soldInfo;
                if (item.asset_id) {
                  soldMap[item.asset_id] = soldInfo;
                }
              }
            } catch (err: any) {
              console.warn(
                `[CSFloat IPC] ⚠️ Failed to fetch listing ${item.listing_id}:`,
                err.message,
              );
            }
          }),
        );
      }

      // 3. Attach price and private mode to inventory items
      for (const item of inventory) {
        const match = priceMap[item.listing_id] || priceMap[item.asset_id];
        if (match) {
          item.price = match.price;
          if (match.private !== undefined && item.private === undefined) {
            item.private = match.private;
          }
        }
      }

      console.log(
        `[CSFloat IPC] ✅ Enriched ${Object.keys(priceMap).length} listed items with active prices.`,
      );
    }

    // 4. Attach sold status to all inventory items matching soldMap
    for (const item of inventory) {
      const sold = soldMap[item.listing_id] || soldMap[item.asset_id];
      if (sold) {
        item.is_sold = true;
        item.trade_state = sold.trade_state || "queued";
        if (sold.trade_id) item.trade_id = sold.trade_id;
        if (typeof sold.price === "number") item.price = sold.price;
      }
    }

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

ipcMain.handle(
  "csfloat:get-item-buy-orders",
  async (
    _,
    serializedInspect: string,
    marketHashName: string,
    gsSig: string,
    limit: number = 3,
  ) => {
    const apiKey = secureGet(STORAGE_KEYS.CSFLOAT);
    if (!apiKey) throw new Error("CSFloat API key not set");

    if (!serializedInspect || !marketHashName || !gsSig) {
      throw new Error(
        "Missing serializedInspect, marketHashName, or gsSig for buy order query",
      );
    }

    console.log(
      `[CSFloat IPC] 🔎 Fetching item buy orders for "${marketHashName}" (sig: ${gsSig}, limit: ${limit})...`,
    );

    try {
      const res = await axios.get(CSFLOAT_ITEM_BUY_ORDERS, {
        headers: getHeaders(apiKey),
        params: {
          url: serializedInspect,
          market_hash_name: marketHashName,
          sig: gsSig,
          limit,
        },
      });

      const orders = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      console.log(
        `[CSFloat IPC] ✅ Fetched ${orders.length} item matching buy orders.`,
      );
      return orders;
    } catch (err: any) {
      const errorData = err.response?.data || err.message;
      console.error(
        "[CSFloat IPC] ❌ Error fetching item buy orders:",
        errorData,
      );
      throw new Error(
        errorData?.message ||
          errorData?.error ||
          (typeof errorData === "string"
            ? errorData
            : "Failed to fetch item buy orders"),
      );
    }
  },
);

