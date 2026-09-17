import { ipcMain } from "electron";
import axios from "axios";
import nacl from "tweetnacl";
import { secureGet, STORAGE_KEYS } from "../../storage/secure-store";
import {
  DMARKET_API,
  DMARKET_CS2_GAME_ID,
  DMARKET_SYNC_CSGO_GAME_ID,
  DMARKET_USER_PROFILE,
  DMARKET_USER_BALANCE,
  DMARKET_USER_TARGETS,
  DMARKET_CREATE_TARGETS,
  DMARKET_DELETE_TARGETS,
  DMARKET_CLOSED_TARGETS,
  DMARKET_USER_INVENTORY,
  DMARKET_USER_OFFERS,
  DMARKET_CLOSED_OFFERS,
  DMARKET_MARKETPLACE_OFFERS,
  DMARKET_LAST_SALES,
  DMARKET_OFFERS_BUY,
  DMARKET_WITHDRAW_ASSETS,
  DMARKET_CUSTOMIZED_FEES,
  DMARKET_DEPOSIT_ASSETS,
  DMARKET_DEPOSIT_BLOCKED_TITLES,
  DMARKET_AGGREGATED_PRICES,
} from "../constants/apiUrls";
import {
  getTargetHoldInfo,
  parseTargetTimestamp,
} from "../../shared/targetHoldUtils";
import { getAppUserAgent } from "../constants/userAgent";

// ─────────────────────────────────────────────────────────────────
// DMarket Ed25519 Signature Utilities
// ─────────────────────────────────────────────────────────────────

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, "");
  if (clean.length % 2 !== 0) {
    throw new Error(
      "Invalid hex string length: must have an even number of characters",
    );
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getNormalizedSecretKey(secretKeyHex: string): Uint8Array {
  const bytes = hexToBytes(secretKeyHex);
  if (bytes.length === 64) {
    // Standard 64-byte NaCl Ed25519 secret key (32-byte seed + 32-byte public key)
    return bytes;
  } else if (bytes.length === 32) {
    // 32-byte seed -> derive 64-byte secret key via tweetnacl
    return nacl.sign.keyPair.fromSeed(bytes).secretKey;
  } else {
    throw new Error(
      `Invalid DMarket secret key length: expected 32 or 64 bytes (64 or 128 hex chars), got ${bytes.length} bytes (${secretKeyHex.length} hex chars)`,
    );
  }
}

/**
 * Builds the Ed25519 signature according to DMarket Trading API specification:
 * Formula: (HTTP Method) + (Route path + HTTP query params) + (body string) + (timestamp)
 * - Path parameters must appear DECODED in the string to sign.
 * - Query string parameters must appear percent-encoded.
 * - Body string is empty string "" for GET/DELETE without body, or exact JSON string.
 */
export function generateDmarketSignature(
  method: string,
  pathAndQuery: string,
  bodyString: string,
  timestamp: number,
  secretKeyHex: string,
): string {
  const stringToSign = `${method.toUpperCase()}${pathAndQuery}${bodyString || ""}${timestamp}`;
  const secretKeyBytes = getNormalizedSecretKey(secretKeyHex);
  const messageBytes = new TextEncoder().encode(stringToSign);
  const signatureBytes = nacl.sign.detached(messageBytes, secretKeyBytes);
  return bytesToHex(signatureBytes);
}

export function buildDmarketHeaders(
  method: string,
  pathAndQuery: string,
  bodyString: string,
  publicKey: string,
  secretKey: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateDmarketSignature(
    method,
    pathAndQuery,
    bodyString,
    timestamp,
    secretKey,
  );
  return {
    "X-Api-Key": publicKey.trim().toLowerCase(),
    "X-Sign-Date": String(timestamp),
    "X-Request-Sign": `dmar ed25519 ${signature}`,
    "Content-Type": "application/json",
    "User-Agent": getAppUserAgent(),
  };
}

// ─────────────────────────────────────────────────────────────────
// DMarket Authenticated HTTP Client
// ─────────────────────────────────────────────────────────────────

function getStoredDmarketKeys(): { publicKey: string; secretKey: string } {
  const publicKey = secureGet(STORAGE_KEYS.DMARKET_PUBLIC);
  const secretKey = secureGet(STORAGE_KEYS.DMARKET_SECRET);
  if (!publicKey || !secretKey) {
    throw new Error(
      "DMarket API keys not configured. Please set your Public and Secret keys in Settings.",
    );
  }
  return { publicKey, secretKey };
}

async function dmarketRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  endpointPath: string,
  queryParams?: Record<string, any>,
  body?: any,
  decodedPathForSigning?: string,
): Promise<any> {
  const { publicKey, secretKey } = getStoredDmarketKeys();

  // Construct URL query string if params are provided
  let queryString = "";
  if (queryParams && Object.keys(queryParams).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) queryString = `?${qs}`;
  }

  const pathAndQueryForUrl = `${endpointPath}${queryString}`;
  const pathAndQueryForSigning = `${decodedPathForSigning || endpointPath}${queryString}`;
  const bodyString = body
    ? typeof body === "string"
      ? body
      : JSON.stringify(body)
    : "";

  const headers = buildDmarketHeaders(
    method,
    pathAndQueryForSigning,
    bodyString,
    publicKey,
    secretKey,
  );

  const fullUrl = `${DMARKET_API}${pathAndQueryForUrl}`;

  try {
    const res = await axios({
      method,
      url: fullUrl,
      headers,
      data: bodyString || undefined,
      timeout: 15000,
    });
    return res.data;
  } catch (err: any) {
    const errorData = err.response?.data;
    const status = err.response?.status;
    console.error(
      `[DMarket IPC] ❌ Request failed (${status || "Network"}):`,
      errorData || err.message,
    );

    const errorMsg = formatDmarketError(errorData, err.message);
    throw new Error(errorMsg);
  }
}

export function formatDmarketError(
  errorData: any,
  fallbackMessage?: string,
): string {
  if (errorData) {
    if (typeof errorData === "string") {
      try {
        const parsed = JSON.parse(errorData);
        return (
          parsed.detail ||
          parsed.message ||
          parsed.Message ||
          parsed.error ||
          errorData
        );
      } catch {
        return errorData;
      }
    }
    if (errorData.detail && typeof errorData.detail === "string") {
      return errorData.detail;
    }
    if (errorData.message && typeof errorData.message === "string") {
      return errorData.message;
    }
    if (errorData.Message && typeof errorData.Message === "string") {
      try {
        const parsed = JSON.parse(errorData.Message);
        return (
          parsed.detail ||
          parsed.message ||
          parsed.Message ||
          parsed.error ||
          errorData.Message
        );
      } catch {
        return errorData.Message;
      }
    }
    if (errorData.description && typeof errorData.description === "string") {
      return errorData.description;
    }
    if (errorData.error) {
      return typeof errorData.error === "string"
        ? errorData.error
        : JSON.stringify(errorData.error);
    }
    if (
      Array.isArray(errorData.Result) &&
      errorData.Result[0]?.Error?.Message
    ) {
      return errorData.Result[0].Error.Message;
    }
    if (errorData.Code && typeof errorData.Code === "string") {
      return errorData.Code;
    }
  }
  return fallbackMessage || "DMarket API request failed";
}

export function buildDmarketSyncPayload(): { Type: string; GameID: string } {
  return {
    Type: "Inventory",
    GameID: DMARKET_SYNC_CSGO_GAME_ID,
  };
}

// ─────────────────────────────────────────────────────────────────
// DMarket Item & Offer Normalization Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Resolves the true market hash name / skin title from various DMarket API response structures.
 * DMarket endpoints interchangeably return `Title`, `title`, `marketHashName`, `MarketHashName`,
 * `assetTitle`, `extra.name`, `attributes.title`, etc.
 */
export function resolveDmarketTitle(item: any): string {
  if (!item) return "CS2 Item";

  let rawTitle =
    item.title ||
    item.Title ||
    item.extra?.name ||
    item.name ||
    item.marketHashName ||
    item.MarketHashName ||
    item.market_hash_name ||
    item.assetTitle ||
    item.description ||
    item.attributes?.title ||
    "";

  rawTitle = String(rawTitle).trim();
  if (!rawTitle || rawTitle.toLowerCase() === "cs2 item") {
    return "CS2 Item";
  }

  // If the title does not yet end with wear condition in parentheses (e.g. "(Field-Tested)")
  // check if exterior is defined in extra/attributes and append it.
  if (!rawTitle.match(/\([^)]+\)$/)) {
    const rawExt =
      item.extra?.exterior ||
      item.attributes?.exterior ||
      item.attributes?.cs2?.exterior ||
      item.cs2?.exterior ||
      item.exterior ||
      "";
    const extStr = String(rawExt).toLowerCase().trim();
    let wearSuffix = "";
    if (
      extStr.includes("factory new") ||
      extStr.includes("exterior_factory_new") ||
      extStr === "fn"
    ) {
      wearSuffix = "(Factory New)";
    } else if (
      extStr.includes("minimal wear") ||
      extStr.includes("exterior_minimal_wear") ||
      extStr === "mw"
    ) {
      wearSuffix = "(Minimal Wear)";
    } else if (
      extStr.includes("field-tested") ||
      extStr.includes("field tested") ||
      extStr.includes("exterior_field_tested") ||
      extStr === "ft"
    ) {
      wearSuffix = "(Field-Tested)";
    } else if (
      extStr.includes("well-worn") ||
      extStr.includes("well worn") ||
      extStr.includes("exterior_well_worn") ||
      extStr === "ww"
    ) {
      wearSuffix = "(Well-Worn)";
    } else if (
      extStr.includes("battle-scarred") ||
      extStr.includes("battle scarred") ||
      extStr.includes("exterior_battle_scarred") ||
      extStr === "bs"
    ) {
      wearSuffix = "(Battle-Scarred)";
    }

    if (wearSuffix) {
      rawTitle = `${rawTitle} ${wearSuffix}`;
    }
  }

  // StatTrak prefix reconstruction if marked in attributes but omitted in title
  const isStatTrak =
    item.attributes?.cs2?.category === "CATEGORY_STATTRACK" ||
    item.attributes?.category === "CATEGORY_STATTRACK" ||
    item.attributes?.isStatTrak ||
    item.attributes?.isStattrak ||
    item.extra?.isStatTrak ||
    item.extra?.isStattrak ||
    item.isStatTrak;

  if (isStatTrak && !rawTitle.includes("StatTrak™")) {
    rawTitle = `StatTrak™ ${rawTitle}`;
  }

  return rawTitle;
}

/**
 * Resolves the primary image URL for a DMarket item or offer.
 * Properly prefixes relative Steam CDN economy image hashes and falls back
 * to the Steam API image endpoint using the resolved market hash name.
 */
export function resolveDmarketImageUrl(
  item: any,
  resolvedTitle?: string,
): string {
  const rawImage =
    item?.image ||
    item?.Image ||
    item?.imageUrl ||
    item?.imageUri ||
    item?.extra?.image ||
    item?.attributes?.image ||
    item?.icon_url ||
    "";

  if (rawImage && typeof rawImage === "string") {
    const trimmed = rawImage.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    // Steam image hash without URL prefix
    return `https://community.cloudflare.steamstatic.com/economy/image/${trimmed}`;
  }

  const titleForImg = resolvedTitle || (item ? resolveDmarketTitle(item) : "");
  if (titleForImg && titleForImg !== "CS2 Item") {
    return `https://api.steamapis.com/image/item/730/${encodeURIComponent(titleForImg)}`;
  }

  return "";
}

/**
 * Validates and formats a string into standard RFC 4122 UUID format (8-4-4-4-12 hex).
 * Supports both standard hyphenated UUIDs and 32-hex character strings.
 * Returns null if the value is not a valid UUID format.
 */
export function formatAsUuid(val?: any): string | null {
  if (typeof val !== "string") return null;
  const s = val.trim();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  ) {
    return s.toLowerCase();
  }
  if (/^[0-9a-f]{32}$/i.test(s)) {
    return s
      .replace(
        /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i,
        "$1-$2-$3-$4-$5",
      )
      .toLowerCase();
  }
  return null;
}

export function formatCreateOfferRequest(
  rawId: string,
  priceCents: number,
): { assetId: string; priceCents: string } {
  const resolvedUuid = formatAsUuid(rawId);
  if (!resolvedUuid) {
    throw new Error(
      `Item is currently in your Steam inventory (not deposited to DMarket). Please deposit the item to DMarket first before creating sell listings.`,
    );
  }
  return {
    assetId: resolvedUuid,
    priceCents: String(priceCents),
  };
}

export function formatUpdateOfferRequest(
  offerId: string,
  priceCents: number,
): { offerId: string; priceCents: string } {
  return {
    offerId,
    priceCents: String(priceCents),
  };
}

export function formatDeleteOfferRequest(offerId: string): { offerId: string } {
  return {
    offerId,
  };
}

/**
 * Searches an item for a valid DMarket asset UUID.
 * CRITICAL RULE: NEVER pick user/account IDs like owner, depositor, botId, userId!
 */
export function findDmarketUuid(item: any): string | null {
  if (!item || typeof item !== "object") return null;

  const attr = item.attributes || item.Attributes || {};
  const extra = item.extra || item.Extra || {};
  const ownerUuid = formatAsUuid(attr.owner || item.owner);
  const depositorUuid = formatAsUuid(attr.depositor || item.depositor);

  const isExcluded = (val: string | null) =>
    !val || val === ownerUuid || val === depositorUuid;

  // 1. Check primary known item ID fields first
  const primaryCandidates = [
    attr.id,
    attr.itemId,
    attr.assetId,
    item.id,
    item.Id,
    item.itemId,
    item.ItemId,
    item.assetId,
    item.AssetId,
    extra.id,
    extra.itemId,
    extra.assetId,
  ];

  for (const cand of primaryCandidates) {
    const uuid = formatAsUuid(cand);
    if (uuid && !isExcluded(uuid)) {
      return uuid;
    }
  }

  return null;
}

/**
 * Resolves the unique asset identifier across DMarket V1/V2 endpoints.
 * - When an item is held on DMarket (inMarket: true), returns the DMarket item UUID.
 * - When an item is in Steam (inMarket: false), returns the distinct inGameAssetId coordinates.
 * CRITICAL: NEVER returns the user's owner account ID!
 */
export function resolveDmarketAssetId(item: any): string {
  if (!item) return "";

  const attr = item.attributes || item.Attributes || {};
  const extra = item.extra || item.Extra || {};
  const ownerUuid = formatAsUuid(attr.owner || item.owner);
  const depositorUuid = formatAsUuid(attr.depositor || item.depositor);

  // 1. Prioritize valid item UUID if present (excluding owner/depositor accounts)
  const uuid = findDmarketUuid(item);
  if (uuid) {
    return uuid;
  }

  // 2. If it's a Steam item (inMarket: false), use the inGameAssetId coordinates or id
  const candidateRawIds = [
    attr.inGameAssetId,
    attr.inGameAssetID,
    extra.inGameAssetID,
    extra.inGameAssetId,
    item.inGameAssetId,
    attr.id,
    item.id,
    item.Id,
    item.ID,
    item.itemId,
    item.ItemId,
    item.assetId,
    item.AssetId,
    item.asset_id,
    item.AssetID,
    attr.steamAssetId,
    item.steamAssetId,
  ];

  for (const raw of candidateRawIds) {
    if (raw && typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed && trimmed !== ownerUuid && trimmed !== depositorUuid) {
        return trimmed;
      }
    }
  }

  return "";
}

/**
 * Resolves price in cents across diverse DMarket price representation shapes.
 */
export function resolveDmarketPriceCents(item: any): number {
  if (!item) return 0;
  let priceCents = 0;
  if (item.priceCents !== undefined && item.priceCents !== null) {
    priceCents = Number(item.priceCents);
  } else if (item.price_cents !== undefined && item.price_cents !== null) {
    priceCents = Number(item.price_cents);
  } else if (item.PriceCents !== undefined && item.PriceCents !== null) {
    priceCents = Number(item.PriceCents);
  } else if (item.price?.amount !== undefined) {
    priceCents = Math.round(Number(item.price.amount) * 100);
  } else if (item.Price?.Amount !== undefined) {
    priceCents = Math.round(Number(item.Price.Amount) * 100);
  } else if (item.price?.USD !== undefined) {
    priceCents = Number(item.price.USD);
  } else if (item.Price?.USD !== undefined) {
    priceCents = Number(item.Price.USD);
  } else if (item.price?.usd !== undefined) {
    priceCents = Number(item.price.usd);
  }
  return isNaN(priceCents) ? 0 : priceCents;
}

export function resolveDmarketInstantPrice(item: any): number | null {
  if (!item) return null;

  if (typeof item.instantPriceUsd === "number" && item.instantPriceUsd > 0) {
    return item.instantPriceUsd;
  }

  // DMarket standard item structure: "instantPrice": { "DMC": "", "USD": "6289" }
  const rawUsd =
    item.instantPrice?.USD ??
    item.instantPrice?.usd ??
    item._raw?.instantPrice?.USD ??
    item._raw?.instantPrice?.usd;

  if (rawUsd === undefined || rawUsd === null || rawUsd === "") return null;

  const str = String(rawUsd).trim();
  if (!str) return null;

  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return null;

  // If decimal point exists (e.g. "62.89"), it's in dollars; otherwise DMarket returns cents ("6289" -> 62.89)
  return str.includes(".") ? num : num / 100;
}

// ─────────────────────────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────────────────────────

if (ipcMain?.handle) {
  // 1. User Profile
  ipcMain.handle("dmarket:get-profile", async () => {
    console.log("[DMarket IPC] Fetching user profile...");
    const data = await dmarketRequest("GET", "/account/v1/user");
    console.log("[DMarket IPC] ✅ Profile fetched:", data?.username || "User");
    return data;
  });

  // 2. User Balance
  ipcMain.handle("dmarket:get-balance", async () => {
    console.log("[DMarket IPC] Fetching account balance...");
    const data = await dmarketRequest("GET", "/account/v1/balance");
    // DMarket USD balance is returned in cents (e.g., "15420" = $154.20)
    const usdCents = data?.usd ? parseInt(data.usd, 10) : 0;
    const usdFormatted = (usdCents / 100).toFixed(2);
    return {
      ...data,
      usdCents,
      usdFormatted: `$${usdFormatted}`,
    };
  });

  // 3. Active User Targets
  ipcMain.handle(
    "dmarket:get-targets",
    async (
      _,
      params?: {
        fetchAll?: boolean;
        cursor?: string;
        limit?: number;
        title?: string;
        treeFilters?: string;
        priceFrom?: number;
        priceTo?: number;
        orderBy?: string;
        orderDir?: string;
      },
    ) => {
      console.log("[DMarket IPC] Fetching user targets with params:", params);

      const baseParams: Record<string, any> = {
        gameId: DMARKET_CS2_GAME_ID,
        limit: Math.min(params?.limit || 100, 100),
      };

      if (params?.title) baseParams.title = params.title;
      if (params?.treeFilters) baseParams.treeFilters = params.treeFilters;
      if (params?.priceFrom !== undefined)
        baseParams.priceFrom = params.priceFrom;
      if (params?.priceTo !== undefined) baseParams.priceTo = params.priceTo;
      if (params?.orderBy) baseParams.orderBy = params.orderBy;
      if (params?.orderDir) baseParams.orderDir = params.orderDir;

      const normalizeTargetItem = (raw: any) => {
        const cs2Attrs = raw?.attributes?.cs2;
        const extra = raw?.extra;
        const isAdvanced = Boolean(
          raw?.isAdvanced === true ||
          cs2Attrs?.isAdvanced === true ||
          extra?.isAdvanced === true,
        );

        const createdAt =
          raw?.createdAt || raw?.CreatedAt || raw?.created_at || "";
        const updatedAt =
          raw?.updatedAt ||
          raw?.UpdatedAt ||
          raw?.updated_at ||
          createdAt ||
          "";
        const createdAtMs = parseTargetTimestamp(createdAt);
        const updatedAtMs = parseTargetTimestamp(updatedAt);

        const holdInfo = getTargetHoldInfo({
          createdAt,
          updatedAt,
          createdAtMs,
          updatedAtMs,
          _raw: raw,
        });

        const title =
          raw?.title ||
          raw?.Title ||
          raw?.name ||
          raw?.attributes?.title ||
          "";

        const image =
          raw?.image ||
          raw?.attributes?.image ||
          raw?.attributes?.imageUri ||
          raw?.attributes?.image_url ||
          "";

        const attributes = {
          ...(raw?.attributes || {}),
          ...(image ? { image } : {}),
          ...(title ? { title } : {}),
        };

        return {
          ...raw,
          targetId: raw?.targetId || raw?.TargetID || raw?.id,
          title,
          amount: String(raw?.amount || "1"),
          priceCents:
            raw?.priceCents !== undefined
              ? String(raw.priceCents)
              : String(raw?.price?.amount || raw?.price || "0"),
          status: raw?.status || "active",
          attributes,
          image,
          createdAt,
          updatedAt,
          createdAtMs,
          updatedAtMs,
          holdExpiresAt: holdInfo.holdExpiresAt,
          holdRemainingSeconds: holdInfo.remainingSeconds,
          isHoldActive: holdInfo.isHoldActive,
          extra: {
            ...(extra || cs2Attrs || {}),
            isAdvanced,
          },
          isAdvanced,
          _raw: raw,
        };
      };

      // Single page fetch when fetchAll is not requested
      if (!params?.fetchAll) {
        if (params?.cursor) baseParams.cursor = params.cursor;
        const data = await dmarketRequest(
          "GET",
          "/marketplace-api/v2/user/targets",
          baseParams,
        );
        const rawList = Array.isArray(data?.targets)
          ? data.targets
          : Array.isArray(data?.items)
            ? data.items
            : [];

        console.log("==================== [DMarket IPC RAW TARGETS RESPONSE] ====================");
        console.log(`Total raw items in batch: ${rawList.length}`);
        console.log("Sample of raw items from DMarket API (first 5):");
        console.log(JSON.stringify(rawList.slice(0, 5), null, 2));
        console.log("============================================================================");

        return {
          items: rawList.map(normalizeTargetItem),
          total: data?.total || String(rawList.length),
          cursor: data?.cursor || "",
        };
      }

      // Multi-page fetch: walk all cursors to get full portfolio of active targets
      let allItems: any[] = [];
      let currentCursor = "";
      let hasNext = true;
      let page = 1;
      const maxPages = 50; // Safety guard against runaway loops

      while (hasNext && page <= maxPages) {
        const pageParams = { ...baseParams };
        if (currentCursor) pageParams.cursor = currentCursor;

        const pageData = await dmarketRequest(
          "GET",
          "/marketplace-api/v2/user/targets",
          pageParams,
        );
        const items = Array.isArray(pageData?.targets)
          ? pageData.targets
          : Array.isArray(pageData?.items)
            ? pageData.items
            : [];

        if (page === 1) {
          console.log("==================== [DMarket IPC RAW TARGETS RESPONSE] ====================");
          console.log(`Page 1 raw targets count: ${items.length}`);
          console.log("Sample of raw targets from DMarket API (first 5):");
          console.log(JSON.stringify(items.slice(0, 5), null, 2));
          console.log("============================================================================");
        }

        if (items.length > 0) {
          allItems = allItems.concat(items.map(normalizeTargetItem));
        }

        currentCursor = pageData?.cursor || "";
        if (!currentCursor || items.length < baseParams.limit) {
          hasNext = false;
        } else {
          page++;
          // Polite delay between pagination requests
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      console.log(
        `[DMarket IPC] ✅ Fetched total ${allItems.length} active targets across ${page} page(s).`,
      );
      return {
        items: allItems,
        total: String(allItems.length),
        cursor: "",
      };
    },
  );

  // 4. Create Target
  ipcMain.handle(
    "dmarket:create-target",
    async (
      _,
      title: string,
      priceInUsd: number,
      amount: number = 1,
      attrs?: { floatPartValue?: string; phase?: string; paintSeed?: number },
    ) => {
      console.log("[DMarket IPC] Creating target:", {
        title,
        priceInUsd,
        amount,
        attrs,
      });

      if (!title || typeof title !== "string") {
        throw new Error("Valid item title is required to create a target");
      }
      const numPrice =
        typeof priceInUsd === "number" ? priceInUsd : parseFloat(priceInUsd);
      if (isNaN(numPrice) || numPrice <= 0) {
        throw new Error("Valid target price in USD is required");
      }

      const targetPayload: any = {
        Amount: String(Math.max(1, Math.floor(amount || 1))),
        Price: {
          Currency: "USD",
          Amount: parseFloat(numPrice.toFixed(2)),
        },
        Title: title,
      };

      if (attrs && Object.keys(attrs).length > 0) {
        targetPayload.Attrs = attrs;
      }

      const body = {
        GameID: DMARKET_CS2_GAME_ID,
        Targets: [targetPayload],
      };

      const res = await dmarketRequest(
        "POST",
        "/marketplace-api/v1/user-targets/create",
        undefined,
        body,
      );
      const resultItem = res?.Result?.[0];
      if (resultItem && !resultItem.Successful) {
        const errDetail =
          resultItem.Error?.Message || "Target creation rejected by DMarket";
        throw new Error(errDetail);
      }

      console.log(
        "[DMarket IPC] ✅ Target created successfully:",
        resultItem?.TargetID,
      );
      return res;
    },
  );

  // 5. Delete Target
  ipcMain.handle("dmarket:delete-target", async (_, targetId: string) => {
    console.log("[DMarket IPC] Deleting target:", targetId);
    if (!targetId || typeof targetId !== "string") {
      throw new Error("TargetID string is required to delete a target");
    }

    const body = {
      Targets: [{ TargetID: targetId }],
    };

    const res = await dmarketRequest(
      "POST",
      "/marketplace-api/v1/user-targets/delete",
      undefined,
      body,
    );
    const resultItem = res?.Result?.[0];
    if (resultItem && !resultItem.Successful) {
      const errDetail = resultItem.Error?.Message || "Failed to delete target";
      throw new Error(errDetail);
    }

    console.log("[DMarket IPC] ✅ Target deleted successfully:", targetId);
    return { success: true, result: res };
  });

  // 5b. Batch Create Targets (Native OpenAPI Batch endpoint)
  ipcMain.handle(
    "dmarket:batch-create-targets",
    async (
      _,
      requests: Array<{
        Title: string;
        Amount: string | number;
        Price: { Currency: string; Amount: number };
        Attrs?: { floatPartValue?: string; phase?: string; paintSeed?: number };
      }>,
    ) => {
      console.log(
        `[DMarket IPC] Batch creating ${requests?.length || 0} target(s)...`,
      );
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new Error("Targets array is required for batch target creation");
      }

      const body = {
        GameID: DMARKET_CS2_GAME_ID,
        Targets: requests.map((r) => ({
          Amount: String(Math.max(1, Math.floor(Number(r.Amount || 1)))),
          Price: {
            Currency: r.Price?.Currency || "USD",
            Amount: parseFloat(Number(r.Price?.Amount || 0).toFixed(2)),
          },
          Title: r.Title,
          ...(r.Attrs && Object.keys(r.Attrs).length > 0 ? { Attrs: r.Attrs } : {}),
        })),
      };

      const res = await dmarketRequest(
        "POST",
        "/marketplace-api/v1/user-targets/create",
        undefined,
        body,
      );
      return res;
    },
  );

  // 5c. Batch Delete Targets (Native OpenAPI Batch endpoint)
  ipcMain.handle(
    "dmarket:batch-delete-targets",
    async (_, targetIds: string[]) => {
      console.log(
        `[DMarket IPC] Batch deleting ${targetIds?.length || 0} target(s)...`,
      );
      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        throw new Error("Target IDs array is required for batch target deletion");
      }

      const body = {
        Targets: targetIds.map((id) => ({ TargetID: String(id).trim() })),
      };

      const res = await dmarketRequest(
        "POST",
        "/marketplace-api/v1/user-targets/delete",
        undefined,
        body,
      );
      return res;
    },
  );

  // 6. Update Target Price (Direct in-place update via POST /exchange/v1/target/update with Delete+Create fallback)
  ipcMain.handle(
    "dmarket:update-target",
    async (
      _,
      oldTargetId: string,
      title: string,
      newPriceInUsd: number,
      amount: number = 1,
      attrs?: any,
    ) => {
      console.log("[DMarket IPC] Updating target:", {
        oldTargetId,
        title,
        newPriceInUsd,
        amount,
      });

      const priceCents = Math.round(newPriceInUsd * 100);

      // 1. Attempt direct in-place update via POST /exchange/v1/target/update
      if (oldTargetId) {
        try {
          console.log(
            `[DMarket IPC] ⚡ Attempting direct target update via POST /exchange/v1/target/update for "${title}" ($${Number(newPriceInUsd).toFixed(2)})...`,
          );

          const attributes: Record<string, any> = {
            gameId: DMARKET_CS2_GAME_ID,
            title,
          };
          if (attrs && typeof attrs === "object") {
            Object.assign(attributes, attrs);
          }

          const updateBody = {
            force: true,
            targets: [
              {
                id: oldTargetId,
                body: {
                  amount: Math.max(1, Math.floor(amount || 1)),
                  gameId: DMARKET_CS2_GAME_ID,
                  price: {
                    amount: String(priceCents),
                    currency: "USD",
                  },
                  attributes,
                },
              },
            ],
          };

          const updateRes = await dmarketRequest(
            "POST",
            "/exchange/v1/target/update",
            undefined,
            updateBody,
          );

          const updatedItem = updateRes?.updated?.[0];
          if (updatedItem && updatedItem.newTargetId) {
            console.log(
              `[DMarket IPC] ✅ Target updated successfully in-place for "${title}" (New TargetID: ${updatedItem.newTargetId})`,
            );
            return {
              success: true,
              newTargetId: updatedItem.newTargetId,
              oldTargetId,
              updatedAt: new Date().toISOString(),
              result: updateRes,
            };
          }

          if (
            Array.isArray(updateRes?.failedTargets) &&
            updateRes.failedTargets.length > 0
          ) {
            console.warn(
              `[DMarket IPC] ⚠️ Direct target update returned failedTargets:`,
              updateRes.failedTargets,
            );
          }
        } catch (updateErr: any) {
          console.warn(
            `[DMarket IPC] ⚠️ Direct /exchange/v1/target/update failed (${updateErr.message}). Falling back to Delete + Create...`,
          );
        }
      }

      // 2. Fallback: Delete old target first to avoid creating duplicate active targets on DMarket
      if (oldTargetId) {
        try {
          console.log(
            `[DMarket IPC] 1/2 Deleting old target ${oldTargetId}...`,
          );
          await dmarketRequest(
            "POST",
            "/marketplace-api/v1/user-targets/delete",
            undefined,
            { Targets: [{ TargetID: oldTargetId }] },
          );
          console.log(`[DMarket IPC] ✅ Deleted old target ${oldTargetId}`);
        } catch (delErr: any) {
          console.warn(
            `[DMarket IPC] ⚠️ Delete old target notice:`,
            delErr.message,
          );
        }

        // 500ms pause matching DmarketActiveTargetsManager to let DMarket release the orderbook slot
        await new Promise((r) => setTimeout(r, 500));
      }

      // 2. Create the target with new price
      const targetPayload: any = {
        Amount: String(Math.max(1, Math.floor(amount || 1))),
        Price: {
          Currency: "USD",
          Amount: parseFloat(Number(newPriceInUsd).toFixed(2)),
        },
        Title: title,
      };
      if (attrs && Object.keys(attrs).length > 0) {
        targetPayload.Attrs = attrs;
      }

      const createBody = {
        GameID: DMARKET_CS2_GAME_ID,
        Targets: [targetPayload],
      };

      console.log(
        `[DMarket IPC] 2/2 Creating updated target for "${title}" at $${Number(newPriceInUsd).toFixed(2)}...`,
      );
      const createRes = await dmarketRequest(
        "POST",
        "/marketplace-api/v1/user-targets/create",
        undefined,
        createBody,
      );
      const resultItem = createRes?.Result?.[0];
      if (resultItem && !resultItem.Successful) {
        let errDetail =
          resultItem.Error?.Message || "Failed to create updated target";
        if (errDetail.toLowerCase().includes("too fast")) {
          errDetail = `DMarket Rate Limit: You are creating/updating target for "${title}" too fast. Please wait a moment and try again.`;
        } else if (
          errDetail.toLowerCase().includes("balance") ||
          errDetail.toLowerCase().includes("funds")
        ) {
          errDetail = `Insufficient DMarket balance to update target for "${title}" to $${Number(newPriceInUsd).toFixed(2)}.`;
        }
        throw new Error(errDetail);
      }

      const newTargetId = resultItem?.TargetID || oldTargetId;
      console.log(
        `[DMarket IPC] ✅ Target updated successfully for "${title}" (TargetID: ${newTargetId})`,
      );

      return {
        success: true,
        newTargetId,
        oldTargetId,
        updatedAt: new Date().toISOString(),
        result: createRes,
      };
    },
  );

  // 7. Closed Targets (Trade History)
  ipcMain.handle(
    "dmarket:get-closed-targets",
    async (_, limit: number = 50, cursor?: string) => {
      console.log("[DMarket IPC] Fetching closed targets history...");
      const params: Record<string, any> = {
        Limit: limit,
        OrderDir: "desc",
      };
      if (cursor) params.Cursor = cursor;

      const data = await dmarketRequest(
        "GET",
        "/marketplace-api/v1/user-targets/closed",
        params,
      );
      const rawTrades = Array.isArray(data?.Trades)
        ? data.Trades
        : Array.isArray(data?.trades)
          ? data.trades
          : [];
      console.log(
        `[DMarket IPC] Loaded ${rawTrades.length} closed targets. Sample item:`,
        rawTrades[0] ? JSON.stringify(rawTrades[0]) : "None",
      );

      const trades = rawTrades.map((t: any) => {
        // 1. Resolve Title
        const title = resolveDmarketTitle(t);

        // 2. Resolve Price in USD
        const priceObj = t.Price || t.price;
        let priceFormatted = "—";
        let rawAmount: any = undefined;

        if (priceObj && typeof priceObj === "object") {
          rawAmount =
            priceObj.Amount ??
            priceObj.amount ??
            priceObj.USD ??
            priceObj.usd ??
            priceObj.price ??
            priceObj.Price;
        } else if (
          typeof priceObj === "number" ||
          typeof priceObj === "string"
        ) {
          rawAmount = priceObj;
        }

        if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
          rawAmount =
            t.PriceCents ??
            t.priceCents ??
            t.PriceAmount ??
            t.priceAmount ??
            t.AmountCents ??
            t.amountCents;
        }

        if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
          const num =
            typeof rawAmount === "number"
              ? rawAmount
              : parseFloat(String(rawAmount));
          if (!isNaN(num)) {
            const str = String(rawAmount);
            if (str.includes(".")) {
              priceFormatted = num.toFixed(2);
            } else if (
              priceObj?.USD !== undefined ||
              priceObj?.usd !== undefined ||
              num >= 50
            ) {
              priceFormatted = (num / 100).toFixed(2);
            } else {
              priceFormatted = num.toFixed(2);
            }
          }
        }

        // 3. Resolve Closed Timestamp
        const rawClosedAt =
          t.ClosedAt ??
          t.closedAt ??
          t.ClosedTime ??
          t.closedTime ??
          t.CreatedAt ??
          t.createdAt;
        let closedAtSec: number | null = null;
        if (rawClosedAt) {
          const parsedTs =
            typeof rawClosedAt === "number"
              ? rawClosedAt
              : parseInt(String(rawClosedAt), 10);
          if (!isNaN(parsedTs)) {
            closedAtSec =
              parsedTs > 1e11 ? Math.floor(parsedTs / 1000) : parsedTs;
          }
        }

        // 4. Resolve Amount / Quantity
        const amount = String(t.Amount || t.amount || "1");

        // 5. Resolve Status
        const rawStatus = t.Status || t.status || "FULFILLED";
        const status = String(rawStatus)
          .replace(/^TargetClosedStatus/, "")
          .toUpperCase();

        return {
          ...t,
          tradeId:
            t.OfferID ||
            t.offerId ||
            t.TargetID ||
            t.targetId ||
            t.AssetID ||
            t.assetId ||
            String(Math.random()),
          title,
          Title: title,
          priceUSD: priceFormatted,
          amount,
          Amount: amount,
          status,
          Status: status,
          closedAt: closedAtSec,
          ClosedAt: closedAtSec,
          imageUrl: resolveDmarketImageUrl(t, title),
        };
      });

      return {
        trades,
        total: data?.Total || data?.total || String(trades.length),
        cursor: data?.Cursor || data?.cursor || "",
      };
    },
  );

  // 8. Market Demand Targets by Title
  ipcMain.handle("dmarket:get-targets-by-title", async (_, title: string) => {
    console.log("[DMarket IPC] Fetching targets by title:", title);
    if (!title) throw new Error("Item title is required");

    const endpointPath = `/marketplace-api/v1/targets-by-title/${DMARKET_CS2_GAME_ID}/${encodeURIComponent(title)}`;
    const decodedPathForSigning = `/marketplace-api/v1/targets-by-title/${DMARKET_CS2_GAME_ID}/${title}`;

    const data = await dmarketRequest(
      "GET",
      endpointPath,
      undefined,
      undefined,
      decodedPathForSigning,
    );
    return Array.isArray(data?.orders) ? data.orders : [];
  });

  // 9. Active User Sell Offers (Listings)
  ipcMain.handle(
    "dmarket:get-offers",
    async (
      _,
      params?: {
        fetchAll?: boolean;
        cursor?: string;
        limit?: number;
        title?: string;
        treeFilters?: string;
      },
    ) => {
      console.log(
        "[DMarket IPC] Fetching user sell offers with params:",
        params,
      );

      const baseParams: Record<string, any> = {
        gameId: DMARKET_CS2_GAME_ID,
        limit: Math.min(params?.limit || 100, 100),
      };

      if (params?.title) baseParams.title = params.title;
      if (params?.treeFilters) baseParams.treeFilters = params.treeFilters;

      const normalizeOffer = (item: any) => {
        const offerId =
          item.offerId || item.offer_id || item.OfferID || item.id || "";
        const id = offerId;
        const assetId = resolveDmarketAssetId(item);
        const title = resolveDmarketTitle(item);
        const priceCents = resolveDmarketPriceCents(item);
        const priceUsd = (priceCents / 100).toFixed(2);
        const imageUrl = resolveDmarketImageUrl(item, title);
        const attributes = {
          ...(item.extra || item.Extra || {}),
          ...(item.attributes || item.Attributes || {}),
        };

        const isP2P =
          attributes?.provider === "ICS" ||
          (typeof attributes?.botId === "string" && attributes.botId.trim() === "") ||
          (!attributes?.botId && !attributes?.depositor);
        const listingMode: "p2p" | "bot" = isP2P ? "p2p" : "bot";
        const instantPriceUsd = resolveDmarketInstantPrice(item);

        return {
          ...item,
          _raw: item,
          id,
          offerId,
          assetId,
          title,
          Title: title,
          marketHashName: title,
          priceCents,
          priceUsd,
          status: item.status || item.Status || "active",
          isP2P,
          listingMode,
          imageUrl,
          attributes,
          instantPrice: item.instantPrice,
          instantPriceUsd: instantPriceUsd ?? undefined,
        };
      };

      if (!params?.fetchAll) {
        if (params?.cursor) baseParams.cursor = params.cursor;
        const data = await dmarketRequest(
          "GET",
          "/marketplace-api/v2/user/offers",
          baseParams,
        );
        const rawItems = Array.isArray(data?.items) ? data.items : [];
        console.log(
          `[DMarket IPC get-offers] ✅ Single page fetched ${rawItems.length} active sell offers.`,
        );
        console.log(
          `[DMarket IPC get-offers] 🔍 FULL RAW OFFERS PAYLOAD:\n`,
          JSON.stringify(rawItems, null, 2),
        );
        rawItems.forEach((raw, i) => {
          console.log(
            `[DMarket IPC Offer #${i + 1}] Title: "${raw.title || raw.Title || raw.name || ""}" | Keys: [${Object.keys(raw).join(", ")}]`,
            raw,
          );
        });
        return {
          items: rawItems.map(normalizeOffer),
          total: data?.total || String(rawItems.length),
          cursor: data?.cursor || "",
        };
      }

      // Multi-page fetch: walk all cursors
      let allItems: any[] = [];
      let currentCursor = "";
      let hasNext = true;
      let page = 1;
      const maxPages = 50;

      while (hasNext && page <= maxPages) {
        const pageParams = { ...baseParams };
        if (currentCursor) pageParams.cursor = currentCursor;

        const pageData = await dmarketRequest(
          "GET",
          "/marketplace-api/v2/user/offers",
          pageParams,
        );
        const items = Array.isArray(pageData?.items) ? pageData.items : [];
        if (items.length > 0) {
          allItems = allItems.concat(items);
        }

        currentCursor = pageData?.cursor || "";
        if (!currentCursor || items.length < baseParams.limit) {
          hasNext = false;
        } else {
          page++;
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      console.log(
        `[DMarket IPC get-offers] ✅ Total ${allItems.length} active sell offers fetched across ${page} page(s).`,
      );
      console.log(
        `[DMarket IPC get-offers] 🔍 FULL RAW OFFERS PAYLOAD (${allItems.length} items):\n`,
        JSON.stringify(allItems, null, 2),
      );
      allItems.forEach((raw, i) => {
        console.log(
          `[DMarket IPC Offer #${i + 1}] Title: "${raw.title || raw.Title || raw.name || ""}" | Keys: [${Object.keys(raw).join(", ")}]`,
          raw,
        );
      });
      return {
        items: allItems.map(normalizeOffer),
        total: String(allItems.length),
        cursor: "",
      };
    },
  );

  // 10. User Inventory (Available to be listed)
  ipcMain.handle(
    "dmarket:get-inventory",
    async (
      _,
      params?: {
        fetchAll?: boolean;
        cursor?: string;
        limit?: number;
        title?: string;
        treeFilters?: string;
      },
    ) => {
      console.log("[DMarket IPC] Fetching user inventory with params:", params);

      const baseParams: Record<string, any> = {
        gameId: DMARKET_CS2_GAME_ID,
        limit: Math.min(params?.limit || 100, 100),
      };

      if (params?.title) baseParams.title = params.title;
      if (params?.treeFilters) baseParams.treeFilters = params.treeFilters;

      const normalizeInvItem = (item: any) => {
        const assetId = resolveDmarketAssetId(item);
        const title = resolveDmarketTitle(item);
        const priceCents = resolveDmarketPriceCents(item);
        const priceUsd = (priceCents / 100).toFixed(2);
        const imageUrl = resolveDmarketImageUrl(item, title);
        const inMarket = Boolean(
          item.inMarket ?? item.InMarket ?? item.in_market ?? false,
        );
        const tradable =
          item.tradable ??
          item.Tradable ??
          item.extra?.tradable ??
          item.attributes?.tradable ??
          true;
        const attributes = {
          ...(item.extra || item.Extra || {}),
          ...(item.attributes || item.Attributes || {}),
        };

        const inGameAssetId = String(
          attributes?.inGameAssetId ||
          attributes?.inGameAssetID ||
          item?.inGameAssetId ||
          (assetId.includes(":") ? assetId : "") ||
          "",
        ).trim();

        const steamAssetId = String(
          attributes?.steamAssetId ||
          item?.steamAssetId ||
          attributes?.inGameAssetID ||
          item?.extra?.inGameAssetID ||
          "",
        ).trim();

        const instantPriceUsd = resolveDmarketInstantPrice(item);

        return {
          ...item,
          _raw: item,
          id: assetId,
          itemId: assetId,
          assetId,
          inGameAssetId: inGameAssetId || undefined,
          steamAssetId: steamAssetId || undefined,
          title,
          Title: title,
          marketHashName: title,
          priceCents,
          priceUsd,
          tradable: tradable !== false,
          inMarket,
          imageUrl,
          attributes,
          instantPrice: item.instantPrice,
          instantPriceUsd: instantPriceUsd ?? undefined,
        };
      };

      if (!params?.fetchAll) {
        if (params?.cursor) baseParams.cursor = params.cursor;
        const data = await dmarketRequest(
          "GET",
          "/marketplace-api/v2/user/inventory",
          baseParams,
        );
        const rawItems = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.objects)
            ? data.objects
            : Array.isArray(data?.Items)
              ? data.Items
              : [];
        console.log(
          `[DMarket IPC] Loaded ${rawItems.length} inventory items (single page). Sample item:`,
          rawItems[0] ? JSON.stringify(rawItems[0]) : "None",
        );
        return {
          items: rawItems.map(normalizeInvItem),
          total: data?.total || String(rawItems.length),
          cursor: data?.cursor || "",
        };
      }

      // Multi-page fetch: walk all cursors
      let allItems: any[] = [];
      let currentCursor = "";
      let hasNext = true;
      let page = 1;
      const maxPages = 50;

      while (hasNext && page <= maxPages) {
        const pageParams = { ...baseParams };
        if (currentCursor) pageParams.cursor = currentCursor;

        const pageData = await dmarketRequest(
          "GET",
          "/marketplace-api/v2/user/inventory",
          pageParams,
        );
        const items = Array.isArray(pageData?.items)
          ? pageData.items
          : Array.isArray(pageData?.objects)
            ? pageData.objects
            : Array.isArray(pageData?.Items)
              ? pageData.Items
              : [];
        if (items.length > 0) {
          allItems = allItems.concat(items);
        }

        currentCursor = pageData?.cursor || "";
        if (!currentCursor || items.length < baseParams.limit) {
          hasNext = false;
        } else {
          page++;
          await new Promise((r) => setTimeout(r, 150));
        }
      }

      console.log(
        `[DMarket IPC] ✅ Fetched total ${allItems.length} inventory items across ${page} page(s). Sample item:`,
        allItems[0] ? JSON.stringify(allItems[0]) : "None",
      );
      return {
        items: allItems.map(normalizeInvItem),
        total: String(allItems.length),
        cursor: "",
      };
    },
  );

  // 11. Batch Create Offers (List Inventory Items)
  ipcMain.handle(
    "dmarket:create-offers",
    async (
      _,
      requests: Array<{
        assetId?: string;
        itemId?: string;
        id?: string;
        isP2P?: boolean;
        listingMode?: "p2p" | "bot";
        priceCents?: number | string;
        priceUsd?: number | string;
      }>,
    ) => {
      console.log(
        `[DMarket IPC] Creating ${requests?.length || 0} offer(s)...`,
      );
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new Error("No items provided for listing creation");
      }

      const p2pRequests: typeof requests = [];
      const botRequests: typeof requests = [];

      for (const r of requests) {
        if (r.isP2P === true || r.listingMode === "p2p") {
          p2pRequests.push(r);
        } else {
          botRequests.push(r);
        }
      }

      const allCreated: any[] = [];
      const allFailed: any[] = [];

      // 1. Process P2P Listings via POST /exchange/v1/offers
      if (p2pRequests.length > 0) {
        console.log(
          `[DMarket IPC] Processing ${p2pRequests.length} P2P offer listing(s) via POST /exchange/v1/offers...`,
        );
        const chunkSize = 50;
        for (let i = 0; i < p2pRequests.length; i += chunkSize) {
          const chunk = p2pRequests.slice(i, i + chunkSize);
          const objects = chunk.map((r) => {
            let cents = 0;
            if (r.priceCents !== undefined && r.priceCents !== null) {
              cents = Math.round(Number(r.priceCents));
            } else if (r.priceUsd !== undefined && r.priceUsd !== null) {
              cents = Math.round(Number(r.priceUsd) * 100);
            }
            const rawId = r.assetId || r.itemId || r.id || "";
            if (cents <= 0) {
              throw new Error(
                `Invalid price for asset ${rawId}: price must be greater than 0`,
              );
            }
            return {
              type: "p2p",
              itemId: rawId,
              price: {
                amount: String(cents),
                currency: "USD",
              },
            };
          });

          const p2pBody = { objects };
          try {
            const res = await dmarketRequest(
              "POST",
              "/exchange/v1/offers",
              undefined,
              p2pBody,
            );

            const created = Array.isArray(res?.created) ? res.created : [];
            const failed = Array.isArray(res?.fail) ? res.fail : [];

            if (created.length > 0) {
              created.forEach((c: any) => {
                allCreated.push({
                  assetId: c.assetId,
                  offerId: c.offerId,
                  isP2P: true,
                  status: "active",
                });
              });
            } else if (Array.isArray(res?.success) && res.success.length > 0) {
              res.success.forEach((assetId: string) => {
                allCreated.push({
                  assetId,
                  isP2P: true,
                  status: "active",
                });
              });
            }

            if (failed.length > 0) {
              failed.forEach((f: any) => {
                allFailed.push({
                  assetId: typeof f === "string" ? f : f?.assetId || f?.itemId,
                  message: f?.message || "Failed to create P2P offer",
                });
              });
            }
          } catch (err: any) {
            console.error("[DMarket IPC] Error creating P2P offers:", err);
            // Fallback attempt to batchCreate in case it was in bot custody
            for (const r of chunk) {
              try {
                let cents = 0;
                if (r.priceCents !== undefined && r.priceCents !== null) {
                  cents = Math.round(Number(r.priceCents));
                } else if (r.priceUsd !== undefined && r.priceUsd !== null) {
                  cents = Math.round(Number(r.priceUsd) * 100);
                }
                const rawId = r.assetId || r.itemId || r.id || "";
                const fallbackRes = await dmarketRequest(
                  "POST",
                  "/marketplace-api/v2/offers:batchCreate",
                  undefined,
                  { requests: [formatCreateOfferRequest(rawId, cents)] },
                );
                if (Array.isArray(fallbackRes?.offers)) allCreated.push(...fallbackRes.offers);
                if (Array.isArray(fallbackRes?.failed)) allFailed.push(...fallbackRes.failed);
              } catch {
                allFailed.push({
                  assetId: r.assetId || r.itemId || r.id,
                  message: err.message,
                });
              }
            }
          }
        }
      }

      // 2. Process Bot Listings via POST /marketplace-api/v2/offers:batchCreate
      if (botRequests.length > 0) {
        console.log(
          `[DMarket IPC] Processing ${botRequests.length} Bot custody offer listing(s) via POST /marketplace-api/v2/offers:batchCreate...`,
        );
        const formattedRequests = botRequests.map((r) => {
          let cents = 0;
          if (r.priceCents !== undefined && r.priceCents !== null) {
            cents = Math.round(Number(r.priceCents));
          } else if (r.priceUsd !== undefined && r.priceUsd !== null) {
            cents = Math.round(Number(r.priceUsd) * 100);
          }
          const rawId = r.assetId || r.itemId || r.id || "";
          if (cents <= 0) {
            throw new Error(
              `Invalid price for asset ${rawId}: price must be greater than 0`,
            );
          }
          return { req: r, formatted: formatCreateOfferRequest(rawId, cents), cents, rawId };
        });

        const chunkSize = 100;
        for (let i = 0; i < formattedRequests.length; i += chunkSize) {
          const chunk = formattedRequests.slice(i, i + chunkSize);
          const body = { requests: chunk.map((c) => c.formatted) };
          try {
            const res = await dmarketRequest(
              "POST",
              "/marketplace-api/v2/offers:batchCreate",
              undefined,
              body,
            );

            if (Array.isArray(res?.offers)) allCreated.push(...res.offers);

            if (Array.isArray(res?.failed)) {
              // If failed, check if it can be listed via P2P POST /exchange/v1/offers
              for (const fail of res.failed) {
                const matching = chunk.find(
                  (c) =>
                    c.rawId === fail.assetId ||
                    c.req.assetId === fail.assetId ||
                    c.req.id === fail.assetId,
                );
                if (matching && (fail.code === "BadRequest" || !fail.message)) {
                  try {
                    const fallbackRes = await dmarketRequest(
                      "POST",
                      "/exchange/v1/offers",
                      undefined,
                      {
                        objects: [
                          {
                            type: "p2p",
                            itemId: matching.rawId,
                            price: {
                              amount: String(matching.cents),
                              currency: "USD",
                            },
                          },
                        ],
                      },
                    );
                    const createdP2P = fallbackRes?.created?.[0];
                    if (createdP2P) {
                      allCreated.push({
                        assetId: createdP2P.assetId,
                        offerId: createdP2P.offerId,
                        isP2P: true,
                        status: "active",
                      });
                      continue;
                    }
                  } catch {
                    // Fallback failed as well
                  }
                }
                allFailed.push(fail);
              }
            }
          } catch (err: any) {
            console.error("[DMarket IPC] Error in batchCreate:", err);
            allFailed.push(...chunk.map((c) => ({ assetId: c.rawId, message: err.message })));
          }

          if (i + chunkSize < formattedRequests.length) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }

      console.log(
        `[DMarket IPC] ✅ Batch create completed: ${allCreated.length} created, ${allFailed.length} failed`,
      );
      return {
        offers: allCreated,
        failed: allFailed,
        success: allFailed.length === 0,
      };
    },
  );

  // 12. Batch Update Offers (Update Listing Prices)
  ipcMain.handle(
    "dmarket:update-offers",
    async (
      _,
      requests: Array<{
        id: string;
        offerId?: string;
        isP2P?: boolean;
        listingMode?: "p2p" | "bot";
        priceCents?: number | string;
        priceUsd?: number | string;
      }>,
    ) => {
      console.log(
        `[DMarket IPC] Batch updating ${requests?.length || 0} offers. Raw requests:`,
        JSON.stringify(requests, null, 2),
      );
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new Error("No offers provided for price update");
      }

      const allUpdated: any[] = [];
      const allFailed: any[] = [];

      // 1. Partition requests into P2P vs Bot offers
      const p2pRequests: typeof requests = [];
      const botRequests: typeof requests = [];

      for (const r of requests) {
        if (r.isP2P === true || r.listingMode === "p2p") {
          p2pRequests.push(r);
        } else {
          botRequests.push(r);
        }
      }

      // 2. Process P2P Offers via PATCH /exchange/v1/offers
      if (p2pRequests.length > 0) {
        console.log(
          `[DMarket IPC] Processing ${p2pRequests.length} P2P offer update(s) via PATCH /exchange/v1/offers...`,
        );
        const chunkSize = 50;
        for (let i = 0; i < p2pRequests.length; i += chunkSize) {
          const chunk = p2pRequests.slice(i, i + chunkSize);
          const objects = chunk.map((r) => {
            let cents = 0;
            if (r.priceCents !== undefined && r.priceCents !== null) {
              cents = Math.round(Number(r.priceCents));
            } else if (r.priceUsd !== undefined && r.priceUsd !== null) {
              cents = Math.round(Number(r.priceUsd) * 100);
            }
            if (cents <= 0) {
              throw new Error(
                `Invalid price for P2P offer ${r.id}: price must be greater than 0`,
              );
            }
            const offerId = r.offerId || r.id;
            return {
              offerId,
              price: {
                amount: String(cents),
                currency: "USD",
              },
              selectedPricePreset: "custom",
              type: "p2p",
            };
          });

          const p2pBody = { force: true, objects };
          try {
            const res = await dmarketRequest(
              "PATCH",
              "/exchange/v1/offers",
              undefined,
              p2pBody,
            );

            const createdOffers = Array.isArray(res?.created)
              ? res.created
              : [];
            const failOffers = Array.isArray(res?.fail) ? res.fail : [];

            chunk.forEach((item, idx) => {
              const matchingCreated =
                createdOffers.find(
                  (c: any) =>
                    c.offerId === item.offerId ||
                    c.assetId === (item as any).assetId,
                ) || createdOffers[idx];

              const newOfferId =
                matchingCreated?.offerId || item.offerId || item.id;
              allUpdated.push({
                id: newOfferId,
                offerId: newOfferId,
                oldOfferId: item.offerId || item.id,
                assetId:
                  matchingCreated?.assetId || (item as any).assetId,
                isP2P: true,
              });
            });

            if (failOffers.length > 0) {
              failOffers.forEach((f: any) => {
                allFailed.push({
                  offerId: f.offerId || f.id || String(f),
                  code: "P2PUpdateFailed",
                  message: f.message || "Failed to update P2P offer",
                });
              });
            }
          } catch (err: any) {
            console.error(
              `[DMarket IPC] ❌ P2P PATCH /exchange/v1/offers failed:`,
              err.message,
            );
            chunk.forEach((item) => {
              allFailed.push({
                offerId: item.offerId || item.id,
                code: "P2PUpdateError",
                message: err.message,
              });
            });
          }

          if (i + chunkSize < p2pRequests.length) {
            await new Promise((r) => setTimeout(r, 200));
          }
        }
      }

      // 3. Process Bot Offers via POST /marketplace-api/v2/offers:batchUpdate
      if (botRequests.length > 0) {
        const formattedRequests = botRequests.map((r) => {
          let cents = 0;
          if (r.priceCents !== undefined && r.priceCents !== null) {
            cents = Math.round(Number(r.priceCents));
          } else if (r.priceUsd !== undefined && r.priceUsd !== null) {
            cents = Math.round(Number(r.priceUsd) * 100);
          }
          if (cents <= 0) {
            throw new Error(
              `Invalid price for offer ${r.id}: price must be greater than 0`,
            );
          }
          return {
            req: r,
            formatted: formatUpdateOfferRequest(r.id, cents),
            cents,
          };
        });

        const chunkSize = 100;
        for (let i = 0; i < formattedRequests.length; i += chunkSize) {
          const chunk = formattedRequests.slice(i, i + chunkSize);
          const body = { requests: chunk.map((c) => c.formatted) };
          console.log(
            `[DMarket IPC] Sending POST /marketplace-api/v2/offers:batchUpdate:`,
            JSON.stringify(body, null, 2),
          );

          try {
            const res = await dmarketRequest(
              "POST",
              "/marketplace-api/v2/offers:batchUpdate",
              undefined,
              body,
            );

            if (Array.isArray(res?.offers)) allUpdated.push(...res.offers);

            if (Array.isArray(res?.failed)) {
              // Check if any failed items are actually P2P offers that can be updated via PATCH /exchange/v1/offers
              for (const fail of res.failed) {
                const matching = chunk.find(
                  (c) =>
                    c.formatted.offerId === fail.offerId ||
                    c.req.id === fail.offerId,
                );
                if (matching && (fail.code === "BadRequest" || !fail.message)) {
                  console.log(
                    `[DMarket IPC] Attempting automatic fallback to PATCH /exchange/v1/offers for failed offer ${fail.offerId}...`,
                  );
                  try {
                    const fallbackBody = {
                      force: true,
                      objects: [
                        {
                          offerId: matching.formatted.offerId,
                          price: {
                            amount: String(matching.cents),
                            currency: "USD",
                          },
                          selectedPricePreset: "custom",
                          type: "p2p",
                        },
                      ],
                    };
                    await dmarketRequest(
                      "PATCH",
                      "/exchange/v1/offers",
                      undefined,
                      fallbackBody,
                    );
                    console.log(
                      `[DMarket IPC] ✅ Fallback to PATCH /exchange/v1/offers succeeded for offer ${fail.offerId}!`,
                    );
                    allUpdated.push({
                      id: matching.formatted.offerId,
                      offerId: matching.formatted.offerId,
                      isP2P: true,
                    });
                    continue;
                  } catch (fallbackErr: any) {
                    console.warn(
                      `[DMarket IPC] Fallback also failed: ${fallbackErr.message}`,
                    );
                  }
                }
                allFailed.push(fail);
              }
            }
          } catch (err: any) {
            console.error(
              `[DMarket IPC] ❌ Bot batchUpdate failed:`,
              err.message,
            );
            chunk.forEach((c) => {
              allFailed.push({
                offerId: c.formatted.offerId,
                code: "BatchUpdateError",
                message: err.message,
              });
            });
          }

          if (i + chunkSize < formattedRequests.length) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }

      if (allFailed.length > 0) {
        console.error(
          `[DMarket IPC] ❌ Batch update failed items:`,
          JSON.stringify(allFailed, null, 2),
        );
      }

      console.log(
        `[DMarket IPC] ✅ Batch update completed: ${allUpdated.length} updated, ${allFailed.length} failed`,
      );
      return {
        offers: allUpdated,
        failed: allFailed,
        success: allFailed.length === 0,
      };
    },
  );

  // 13. Batch Delete Offers (Delist / Remove from Sale)
  ipcMain.handle(
    "dmarket:delete-offers",
    async (
      _,
      requests: Array<{
        id: string;
        offerId?: string;
        assetId?: string;
        isP2P?: boolean;
        listingMode?: "p2p" | "bot";
      }>,
    ) => {
      console.log(
        `[DMarket IPC] Batch deleting ${requests?.length || 0} offers...`,
      );
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new Error("No offers provided for delisting");
      }

      const p2pRequests: typeof requests = [];
      const botRequests: typeof requests = [];

      for (const r of requests) {
        if (r.isP2P === true || r.listingMode === "p2p") {
          p2pRequests.push(r);
        } else {
          botRequests.push(r);
        }
      }

      const allDeleted: any[] = [];
      const allFailed: any[] = [];

      // 1. Process P2P Delisting via DELETE /exchange/v1/offers
      if (p2pRequests.length > 0) {
        console.log(
          `[DMarket IPC] Processing ${p2pRequests.length} P2P offer delist(s) via DELETE /exchange/v1/offers...`,
        );
        const chunkSize = 50;
        for (let i = 0; i < p2pRequests.length; i += chunkSize) {
          const chunk = p2pRequests.slice(i, i + chunkSize);
          const objects = chunk.map((r) => ({
            offerId: r.offerId || r.id,
            type: "p2p",
          }));

          const p2pBody = { force: true, objects };
          try {
            const res = await dmarketRequest(
              "DELETE",
              "/exchange/v1/offers",
              undefined,
              p2pBody,
            );

            const failItems = Array.isArray(res?.fail) ? res.fail : [];

            chunk.forEach((item) => {
              const offerId = item.offerId || item.id;
              const isFailed = failItems.some(
                (f: any) => f === offerId || f?.offerId === offerId,
              );
              if (isFailed) {
                allFailed.push({
                  offerId,
                  assetId: item.assetId,
                  message: "Failed to delist P2P offer",
                });
              } else {
                allDeleted.push({
                  offerId,
                  id: offerId,
                  assetId: item.assetId,
                  success: true,
                  isP2P: true,
                });
              }
            });
          } catch (err: any) {
            console.error("[DMarket IPC] Error in DELETE /exchange/v1/offers:", err);
            // Fallback to batchDelete in case it wasn't P2P
            for (const r of chunk) {
              try {
                const targetOfferId = r.offerId || r.id;
                const fallbackRes = await dmarketRequest(
                  "POST",
                  "/marketplace-api/v2/offers:batchDelete",
                  undefined,
                  { requests: [formatDeleteOfferRequest(targetOfferId)] },
                );
                if (Array.isArray(fallbackRes?.offers)) allDeleted.push(...fallbackRes.offers);
                if (Array.isArray(fallbackRes?.failed)) allFailed.push(...fallbackRes.failed);
              } catch {
                allFailed.push({ offerId: r.offerId || r.id, message: err.message });
              }
            }
          }
        }
      }

      // 2. Process Bot Delisting via POST /marketplace-api/v2/offers:batchDelete
      if (botRequests.length > 0) {
        console.log(
          `[DMarket IPC] Processing ${botRequests.length} Bot custody offer delist(s) via POST /marketplace-api/v2/offers:batchDelete...`,
        );
        const formattedRequests = botRequests.map((r) => {
          const offerId = r.offerId || r.id;
          return { req: r, formatted: formatDeleteOfferRequest(offerId), offerId };
        });

        const chunkSize = 100;
        for (let i = 0; i < formattedRequests.length; i += chunkSize) {
          const chunk = formattedRequests.slice(i, i + chunkSize);
          const body = { requests: chunk.map((c) => c.formatted) };
          try {
            const res = await dmarketRequest(
              "POST",
              "/marketplace-api/v2/offers:batchDelete",
              undefined,
              body,
            );

            if (Array.isArray(res?.offers)) allDeleted.push(...res.offers);

            if (Array.isArray(res?.failed)) {
              // Check if any failed offer is actually P2P
              for (const fail of res.failed) {
                const matching = chunk.find(
                  (c) => c.offerId === fail.offerId || c.req.id === fail.offerId,
                );
                if (matching && (fail.code === "BadRequest" || !fail.message)) {
                  try {
                    const fallbackRes = await dmarketRequest(
                      "DELETE",
                      "/exchange/v1/offers",
                      undefined,
                      {
                        force: true,
                        objects: [{ offerId: matching.offerId, type: "p2p" }],
                      },
                    );
                    const failList = Array.isArray(fallbackRes?.fail) ? fallbackRes.fail : [];
                    if (!failList.includes(matching.offerId)) {
                      allDeleted.push({
                        offerId: matching.offerId,
                        id: matching.offerId,
                        assetId: matching.req.assetId,
                        success: true,
                        isP2P: true,
                      });
                      continue;
                    }
                  } catch {
                    // Fallback failed as well
                  }
                }
                allFailed.push(fail);
              }
            }
          } catch (err: any) {
            console.error("[DMarket IPC] Error in batchDelete:", err);
            allFailed.push(...chunk.map((c) => ({ offerId: c.offerId, message: err.message })));
          }

          if (i + chunkSize < formattedRequests.length) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }

      console.log(
        `[DMarket IPC] ✅ Batch delete completed: ${allDeleted.length} delisted, ${allFailed.length} failed`,
      );
      return {
        offers: allDeleted,
        failed: allFailed,
        success: allFailed.length === 0,
      };
    },
  );

  // 14. Closed Offers (Sales History)
  ipcMain.handle(
    "dmarket:get-closed-offers",
    async (_, limit: number = 50, cursor?: string) => {
      console.log("[DMarket IPC] Fetching closed offers sales history...");
      // DMarket API v1 closed offers requires PascalCase query parameters (Limit, OrderDir, Cursor)
      const params: Record<string, any> = {
        Limit: limit,
        OrderDir: "desc",
      };
      if (cursor) params.Cursor = cursor;

      const data = await dmarketRequest(
        "GET",
        "/marketplace-api/v1/user-offers/closed",
        params,
      );
      const rawTrades = Array.isArray(data?.Trades)
        ? data.Trades
        : Array.isArray(data?.trades)
          ? data.trades
          : [];
      console.log(
        `[DMarket IPC] Loaded ${rawTrades.length} closed sell offers.`,
      );

      const trades = rawTrades.map((t: any) => {
        const title = resolveDmarketTitle(t);
        const imageUrl = resolveDmarketImageUrl(t, title);

        const priceObj = t.Price || t.price;
        let priceFormatted = "—";
        let rawAmount: any = undefined;

        if (priceObj && typeof priceObj === "object") {
          rawAmount =
            priceObj.Amount ??
            priceObj.amount ??
            priceObj.USD ??
            priceObj.usd ??
            priceObj.price;
        } else if (
          typeof priceObj === "number" ||
          typeof priceObj === "string"
        ) {
          rawAmount = priceObj;
        }

        if (rawAmount === undefined || rawAmount === null || rawAmount === "") {
          rawAmount =
            t.PriceCents ?? t.priceCents ?? t.PriceAmount ?? t.priceAmount;
        }

        if (rawAmount !== undefined && rawAmount !== null && rawAmount !== "") {
          const num =
            typeof rawAmount === "number"
              ? rawAmount
              : parseFloat(String(rawAmount));
          if (!isNaN(num)) {
            const str = String(rawAmount);
            if (str.includes(".")) {
              priceFormatted = num.toFixed(2);
            } else if (
              priceObj?.USD !== undefined ||
              priceObj?.usd !== undefined ||
              num >= 50
            ) {
              priceFormatted = (num / 100).toFixed(2);
            } else {
              priceFormatted = num.toFixed(2);
            }
          }
        }

        // Fee formatting
        let feeFormatted = "—";
        const feeObj = t.Fee || t.fee;
        if (feeObj?.Amount?.Amount !== undefined) {
          feeFormatted = `$${Number(feeObj.Amount.Amount).toFixed(2)}`;
        } else if (feeObj?.amount !== undefined) {
          feeFormatted = `$${(Number(feeObj.amount) / 100).toFixed(2)}`;
        }

        // Closed timestamp
        const rawClosedAt =
          t.OfferClosedAt ??
          t.offerClosedAt ??
          t.ClosedAt ??
          t.closedAt ??
          t.CreatedAt ??
          t.createdAt;
        let closedAtSec: number | null = null;
        if (rawClosedAt) {
          const parsedTs =
            typeof rawClosedAt === "number"
              ? rawClosedAt
              : parseInt(String(rawClosedAt), 10);
          if (!isNaN(parsedTs)) {
            closedAtSec =
              parsedTs > 1e11 ? Math.floor(parsedTs / 1000) : parsedTs;
          }
        }

        const offerId = t.OfferID || t.offerId || t.id || String(Math.random());
        const assetId = resolveDmarketAssetId(t);
        const status = (t.Status || t.status || "successful").toLowerCase();

        return {
          ...t,
          offerId,
          assetId,
          title,
          Title: title,
          priceUSD: priceFormatted,
          feeFormatted,
          closedAt: closedAtSec,
          ClosedAt: closedAtSec,
          status,
          Status: status,
          imageUrl,
        };
      });

      return {
        trades,
        total: data?.Total || data?.total || String(trades.length),
        cursor: data?.Cursor || data?.cursor || "",
      };
    },
  );

  // 15. Deposit Assets from Steam to DMarket
  // OpenAPI note: AssetID must be composite in-game asset IDs (instanceId:classId:assetId:appId)
  ipcMain.handle("dmarket:deposit-assets", async (_, assetIds: any[]) => {
    console.log(
      `[DMarket IPC] Initiating deposit for ${assetIds?.length || 0} asset(s)...`,
    );
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      throw new Error("No assets provided for deposit");
    }

    const formattedAssetIds = assetIds
      .map((item: any) => {
        if (!item) return "";
        if (typeof item === "string") return item.trim();
        return (
          item.inGameAssetId ||
          item.attributes?.inGameAssetId ||
          item.assetId ||
          item.id ||
          ""
        ).trim();
      })
      .filter(Boolean);

    if (formattedAssetIds.length === 0) {
      throw new Error("No valid asset IDs resolved for deposit");
    }

    const nonComposite = formattedAssetIds.filter((id) => !id.includes(":"));
    if (nonComposite.length > 0) {
      console.warn(
        `[DMarket IPC deposit-assets] ⚠️ Notice: DMarket requires composite inGameAssetId (instanceId:classId:assetId:appId). ${nonComposite.length} ID(s) do not contain colon delimiter:`,
        nonComposite,
      );
    }

    const body = {
      AssetID: formattedAssetIds,
    };

    const res = await dmarketRequest(
      "POST",
      "/marketplace-api/v1/deposit-assets",
      undefined,
      body,
    );
    console.log("[DMarket IPC] ✅ Deposit registered:", res);
    return res;
  });

  // 16. Get Deposit Status
  ipcMain.handle("dmarket:get-deposit-status", async (_, depositId: string) => {
    if (!depositId) throw new Error("Deposit ID is required");
    const res = await dmarketRequest(
      "GET",
      `/marketplace-api/v1/deposit-status/${encodeURIComponent(depositId)}`,
    );
    return res;
  });

  // 17. Sync User Inventory with Steam
  ipcMain.handle("dmarket:sync-user-inventory", async () => {
    console.log(
      "[DMarket IPC] Requesting Steam inventory sync from DMarket...",
    );
    const body = buildDmarketSyncPayload();
    try {
      const res = await dmarketRequest(
        "POST",
        "/marketplace-api/v1/user-inventory/sync",
        undefined,
        body,
      );
      console.log(
        "[DMarket IPC] ✅ Steam inventory sync requested successfully:",
        res,
      );
      return res;
    } catch (err: any) {
      console.error(
        "[DMarket IPC] ❌ Steam inventory sync request failed:",
        err.message || err,
      );
      throw err;
    }
  });

  // 18. Historical Market Sales (Aggregator)
  ipcMain.handle(
    "dmarket:get-last-sales",
    async (
      _,
      params: {
        title: string;
        gameId?: string;
        filters?: string;
        txOperationType?: "Offer" | "Target" | "";
        limit?: number;
        offset?: number;
      },
    ) => {
      console.log("[DMarket IPC] Fetching market sales history with params:", params);
      if (!params?.title) {
        throw new Error("Item title is required to fetch sales history");
      }

      const queryParams: Record<string, any> = {
        gameId: params.gameId || DMARKET_CS2_GAME_ID,
        title: params.title,
      };

      if (params.filters) queryParams.filters = params.filters;
      if (params.txOperationType) queryParams.txOperationType = params.txOperationType;
      if (params.limit !== undefined) {
        queryParams.limit = String(Math.min(Math.max(1, params.limit), 20));
      }
      if (params.offset !== undefined) {
        queryParams.offset = String(params.offset);
      }

      const res = await dmarketRequest(
        "GET",
        "/trade-aggregator/v1/last-sales",
        queryParams,
      );
      return {
        sales: Array.isArray(res?.sales) ? res.sales : [],
      };
    },
  );

  // 19. Aggregated Market Prices (Batch highest bid / lowest ask lookup)
  ipcMain.handle(
    "dmarket:get-aggregated-prices",
    async (
      _,
      request: {
        titles: string[];
        game?: string;
        limit?: string | number;
        cursor?: string;
      },
    ) => {
      console.log(
        `[DMarket IPC] Fetching aggregated prices for ${request?.titles?.length || 0} titles...`,
      );
      if (!Array.isArray(request?.titles) || request.titles.length === 0) {
        throw new Error("Titles array is required to fetch aggregated prices");
      }

      const body: Record<string, any> = {
        filter: {
          game: request.game || DMARKET_CS2_GAME_ID,
          titles: request.titles,
        },
      };

      if (request.limit !== undefined) body.limit = String(request.limit);
      if (request.cursor) body.cursor = request.cursor;

      const res = await dmarketRequest(
        "POST",
        "/marketplace-api/v1/aggregated-prices",
        undefined,
        body,
      );
      return {
        aggregatedPrices: Array.isArray(res?.aggregatedPrices)
          ? res.aggregatedPrices
          : [],
        nextCursor: res?.nextCursor || "",
      };
    },
  );

  // 20. Browse Public Marketplace Offers (Market search)
  ipcMain.handle(
    "dmarket:get-marketplace-offers",
    async (
      _,
      params?: {
        gameId?: string;
        title?: string;
        treeFilters?: string;
        priceFrom?: number;
        priceTo?: number;
        orderBy?: string;
        orderDir?: string;
        limit?: number;
        cursor?: string;
      },
    ) => {
      console.log("[DMarket IPC] Browsing marketplace offers with params:", params);
      const queryParams: Record<string, any> = {
        gameId: params?.gameId || DMARKET_CS2_GAME_ID,
        limit: Math.min(Math.max(1, params?.limit || 100), 100),
      };

      if (params?.title) queryParams.title = params.title;
      if (params?.treeFilters) queryParams.treeFilters = params.treeFilters;
      if (params?.priceFrom !== undefined) queryParams.priceFrom = params.priceFrom;
      if (params?.priceTo !== undefined) queryParams.priceTo = params.priceTo;
      if (params?.orderBy) queryParams.orderBy = params.orderBy;
      if (params?.orderDir) queryParams.orderDir = params.orderDir;
      if (params?.cursor) queryParams.cursor = params.cursor;

      const res = await dmarketRequest(
        "GET",
        "/marketplace-api/v2/offers",
        queryParams,
      );
      return {
        items: Array.isArray(res?.items) ? res.items : [],
        total: res?.total || String(res?.items?.length || 0),
        cursor: res?.cursor || "",
      };
    },
  );

  // 21. Buy Offers with Direct Balance Execution
  ipcMain.handle(
    "dmarket:buy-offers",
    async (
      _,
      request: {
        offers: Array<{
          offerId: string;
          price: {
            amount: string;
            currency: string;
          };
          type: "dmarket" | "p2p";
        }>;
      },
    ) => {
      console.log(
        `[DMarket IPC] Purchasing ${request?.offers?.length || 0} offer(s)...`,
      );
      if (!Array.isArray(request?.offers) || request.offers.length === 0) {
        throw new Error("Offers array is required for purchasing offers");
      }

      const body = {
        offers: request.offers.map((o) => ({
          offerId: o.offerId,
          price: {
            amount: String(o.price?.amount || "0"),
            currency: o.price?.currency || "USD",
          },
          type: o.type || "dmarket",
        })),
      };

      const res = await dmarketRequest(
        "PATCH",
        "/exchange/v1/offers-buy",
        undefined,
        body,
      );
      console.log("[DMarket IPC] ✅ Buy offers response:", res);
      return res;
    },
  );

  // 22. Withdraw Assets to Steam
  ipcMain.handle(
    "dmarket:withdraw-assets",
    async (
      _,
      request: {
        assets: Array<{ id: string; gameId?: string; classId?: string }>;
        requestId?: string;
      },
    ) => {
      console.log(
        `[DMarket IPC] Withdrawing ${request?.assets?.length || 0} asset(s) to Steam...`,
      );
      if (!Array.isArray(request?.assets) || request.assets.length === 0) {
        throw new Error("Assets array is required for withdrawal");
      }

      const body = {
        assets: request.assets.map((a) => ({
          id: a.id,
          gameId: a.gameId || DMARKET_CS2_GAME_ID,
          classId: a.classId || "",
        })),
        requestId: request.requestId || `withdraw-${Date.now()}`,
      };

      const res = await dmarketRequest(
        "POST",
        "/exchange/v1/withdraw-assets",
        undefined,
        body,
      );
      console.log("[DMarket IPC] ✅ Withdraw assets response:", res);
      return res;
    },
  );

  // 23. List Low-Fee / Customized Items
  ipcMain.handle(
    "dmarket:get-customized-fees",
    async (
      _,
      gameId: string = DMARKET_CS2_GAME_ID,
      offerType: "dmarket" | "p2p" = "dmarket",
      limit: number = 20,
      offset: number = 0,
    ) => {
      console.log("[DMarket IPC] Fetching customized fees...");
      const queryParams: Record<string, any> = {
        gameId,
        offerType,
        limit,
        offset,
      };

      const res = await dmarketRequest(
        "GET",
        "/exchange/v1/customized-fees",
        queryParams,
      );
      return res;
    },
  );

  // 24. Deposit Blocked Titles
  ipcMain.handle(
    "dmarket:get-deposit-blocked-titles",
    async (
      _,
      gameId: string = DMARKET_CS2_GAME_ID,
      limit: number = 100,
      cursor?: string,
    ) => {
      console.log("[DMarket IPC] Fetching deposit blocked titles...");
      const queryParams: Record<string, any> = {
        gameId,
        limit,
      };
      if (cursor) queryParams.cursor = cursor;

      const res = await dmarketRequest(
        "GET",
        "/marketplace-api/v2/deposit-blocked-titles",
        queryParams,
      );
      return res;
    },
  );
}
