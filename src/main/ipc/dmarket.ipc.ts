import { ipcMain } from 'electron';
import axios from 'axios';
import nacl from 'tweetnacl';
import { secureGet, STORAGE_KEYS } from '../../storage/secure-store';
import {
  DMARKET_API,
  DMARKET_CS2_GAME_ID,
  DMARKET_USER_PROFILE,
  DMARKET_USER_BALANCE,
  DMARKET_USER_TARGETS,
  DMARKET_CREATE_TARGETS,
  DMARKET_DELETE_TARGETS,
  DMARKET_CLOSED_TARGETS,
} from '../constants/apiUrls';

// ─────────────────────────────────────────────────────────────────
// DMarket Ed25519 Signature Utilities
// ─────────────────────────────────────────────────────────────────

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/i, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length: must have an even number of characters');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
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
      `Invalid DMarket secret key length: expected 32 or 64 bytes (64 or 128 hex chars), got ${bytes.length} bytes (${secretKeyHex.length} hex chars)`
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
  const stringToSign = `${method.toUpperCase()}${pathAndQuery}${bodyString || ''}${timestamp}`;
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
  const signature = generateDmarketSignature(method, pathAndQuery, bodyString, timestamp, secretKey);
  return {
    'X-Api-Key': publicKey.trim().toLowerCase(),
    'X-Sign-Date': String(timestamp),
    'X-Request-Sign': `dmar ed25519 ${signature}`,
    'Content-Type': 'application/json',
  };
}

// ─────────────────────────────────────────────────────────────────
// DMarket Authenticated HTTP Client
// ─────────────────────────────────────────────────────────────────

function getStoredDmarketKeys(): { publicKey: string; secretKey: string } {
  const publicKey = secureGet(STORAGE_KEYS.DMARKET_PUBLIC);
  const secretKey = secureGet(STORAGE_KEYS.DMARKET_SECRET);
  if (!publicKey || !secretKey) {
    throw new Error('DMarket API keys not configured. Please set your Public and Secret keys in Settings.');
  }
  return { publicKey, secretKey };
}

async function dmarketRequest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpointPath: string,
  queryParams?: Record<string, any>,
  body?: any,
  decodedPathForSigning?: string,
): Promise<any> {
  const { publicKey, secretKey } = getStoredDmarketKeys();

  // Construct URL query string if params are provided
  let queryString = '';
  if (queryParams && Object.keys(queryParams).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) queryString = `?${qs}`;
  }

  const pathAndQueryForUrl = `${endpointPath}${queryString}`;
  const pathAndQueryForSigning = `${decodedPathForSigning || endpointPath}${queryString}`;
  const bodyString = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';

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
    console.error(`[DMarket IPC] ❌ Request failed (${status || 'Network'}):`, errorData || err.message);

    let errorMsg = 'DMarket API request failed';
    if (errorData) {
      if (typeof errorData === 'string') {
        errorMsg = errorData;
      } else if (errorData.message) {
        errorMsg = errorData.message;
      } else if (errorData.error) {
        errorMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
      } else if (Array.isArray(errorData.Result) && errorData.Result[0]?.Error?.Message) {
        errorMsg = errorData.Result[0].Error.Message;
      }
    } else if (err.message) {
      errorMsg = err.message;
    }

    throw new Error(errorMsg);
  }
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
  if (!item) return 'CS2 Item';

  let rawTitle =
    item.title ||
    item.Title ||
    item.marketHashName ||
    item.MarketHashName ||
    item.market_hash_name ||
    item.name ||
    item.Name ||
    item.assetTitle ||
    item.AssetTitle ||
    item.description ||
    item.extra?.name ||
    item.extra?.title ||
    item.attributes?.title ||
    item.attributes?.Title ||
    item.attributes?.marketHashName ||
    item.attributes?.MarketHashName ||
    item.attributes?.market_hash_name ||
    item.attributes?.name ||
    item.attributes?.Name ||
    item.attributes?.assetTitle ||
    item.attributes?.AssetTitle ||
    '';

  rawTitle = String(rawTitle).trim();
  if (!rawTitle || rawTitle.toLowerCase() === 'cs2 item') {
    return 'CS2 Item';
  }

  // If the title does not yet end with wear condition in parentheses (e.g. "(Field-Tested)")
  // check if exterior is defined in attributes/extra and append it.
  if (!rawTitle.match(/\([^)]+\)$/)) {
    const rawExt =
      item.attributes?.exterior ||
      item.attributes?.cs2?.exterior ||
      item.extra?.exterior ||
      item.exterior ||
      item.attributes?.Exterior ||
      '';
    const extStr = String(rawExt).toLowerCase().trim();
    let wearSuffix = '';
    if (extStr.includes('factory new') || extStr.includes('exterior_factory_new') || extStr === 'fn') {
      wearSuffix = '(Factory New)';
    } else if (extStr.includes('minimal wear') || extStr.includes('exterior_minimal_wear') || extStr === 'mw') {
      wearSuffix = '(Minimal Wear)';
    } else if (extStr.includes('field-tested') || extStr.includes('field tested') || extStr.includes('exterior_field_tested') || extStr === 'ft') {
      wearSuffix = '(Field-Tested)';
    } else if (extStr.includes('well-worn') || extStr.includes('well worn') || extStr.includes('exterior_well_worn') || extStr === 'ww') {
      wearSuffix = '(Well-Worn)';
    } else if (extStr.includes('battle-scarred') || extStr.includes('battle scarred') || extStr.includes('exterior_battle_scarred') || extStr === 'bs') {
      wearSuffix = '(Battle-Scarred)';
    }

    if (wearSuffix) {
      rawTitle = `${rawTitle} ${wearSuffix}`;
    }
  }

  // StatTrak prefix reconstruction if marked in attributes but omitted in title
  const isStatTrak =
    item.attributes?.cs2?.category === 'CATEGORY_STATTRACK' ||
    item.attributes?.category === 'CATEGORY_STATTRACK' ||
    item.attributes?.isStatTrak ||
    item.attributes?.isStattrak ||
    item.extra?.isStatTrak ||
    item.extra?.isStattrak ||
    item.isStatTrak;

  if (isStatTrak && !rawTitle.includes('StatTrak™')) {
    rawTitle = `StatTrak™ ${rawTitle}`;
  }

  return rawTitle;
}

/**
 * Resolves the primary image URL for a DMarket item or offer.
 * Properly prefixes relative Steam CDN economy image hashes and falls back
 * to the Steam API image endpoint using the resolved market hash name.
 */
export function resolveDmarketImageUrl(item: any, resolvedTitle?: string): string {
  const rawImage =
    item?.imageUrl ||
    item?.ImageUrl ||
    item?.image_url ||
    item?.ImageURL ||
    item?.image ||
    item?.Image ||
    item?.icon_url ||
    item?.iconUrl ||
    item?.icon ||
    item?.Icon ||
    item?.attributes?.image ||
    item?.attributes?.Image ||
    item?.attributes?.imageUrl ||
    item?.attributes?.image_url ||
    item?.attributes?.icon_url ||
    item?.attributes?.iconUrl ||
    item?.extra?.image ||
    item?.extra?.imageUrl ||
    item?.extra?.image_url ||
    item?.extra?.icon_url ||
    '';

  if (rawImage && typeof rawImage === 'string') {
    const trimmed = rawImage.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Steam image hash without URL prefix
    return `https://community.cloudflare.steamstatic.com/economy/image/${trimmed}`;
  }

  const titleForImg = resolvedTitle || (item ? resolveDmarketTitle(item) : '');
  if (titleForImg && titleForImg !== 'CS2 Item') {
    return `https://api.steamapis.com/image/item/730/${encodeURIComponent(titleForImg)}`;
  }

  return '';
}

/**
 * Validates and formats a string into standard RFC 4122 UUID format (8-4-4-4-12 hex).
 * Supports both standard hyphenated UUIDs and 32-hex character strings.
 * Returns null if the value is not a valid UUID format.
 */
export function formatAsUuid(val?: any): string | null {
  if (typeof val !== 'string') return null;
  const s = val.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  if (/^[0-9a-f]{32}$/i.test(s)) {
    return s.replace(/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/i, '$1-$2-$3-$4-$5').toLowerCase();
  }
  return null;
}

/**
 * Searches an item for a valid DMarket asset UUID.
 * CRITICAL RULE: NEVER pick user/account IDs like owner, depositor, botId, userId!
 */
export function findDmarketUuid(item: any): string | null {
  if (!item || typeof item !== 'object') return null;

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
  if (!item) return '';

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
    if (raw && typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed && trimmed !== ownerUuid && trimmed !== depositorUuid) {
        return trimmed;
      }
    }
  }

  return '';
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

// ─────────────────────────────────────────────────────────────────
// IPC Handlers
// ─────────────────────────────────────────────────────────────────

if (ipcMain?.handle) {
  // 1. User Profile
  ipcMain.handle('dmarket:get-profile', async () => {
  console.log('[DMarket IPC] Fetching user profile...');
  const data = await dmarketRequest('GET', '/account/v1/user');
  console.log('[DMarket IPC] ✅ Profile fetched:', data?.username || 'User');
  return data;
});

// 2. User Balance
ipcMain.handle('dmarket:get-balance', async () => {
  console.log('[DMarket IPC] Fetching account balance...');
  const data = await dmarketRequest('GET', '/account/v1/balance');
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
  'dmarket:get-targets',
  async (
    _,
    params?: {
      fetchAll?: boolean;
      cursor?: string;
      limit?: number;
      title?: string;
      priceFrom?: number;
      priceTo?: number;
      orderBy?: string;
      orderDir?: string;
    },
  ) => {
    console.log('[DMarket IPC] Fetching user targets with params:', params);

    const baseParams: Record<string, any> = {
      gameId: DMARKET_CS2_GAME_ID,
      limit: Math.min(params?.limit || 100, 100),
    };

    if (params?.title) baseParams.title = params.title;
    if (params?.priceFrom !== undefined) baseParams.priceFrom = params.priceFrom;
    if (params?.priceTo !== undefined) baseParams.priceTo = params.priceTo;
    if (params?.orderBy) baseParams.orderBy = params.orderBy;
    if (params?.orderDir) baseParams.orderDir = params.orderDir;

    // Single page fetch when fetchAll is not requested
    if (!params?.fetchAll) {
      if (params?.cursor) baseParams.cursor = params.cursor;
      const data = await dmarketRequest('GET', '/marketplace-api/v2/user/targets', baseParams);
      return {
        items: Array.isArray(data?.items) ? data.items : [],
        total: data?.total || '0',
        cursor: data?.cursor || '',
      };
    }

    // Multi-page fetch: walk all cursors to get full portfolio of active targets
    let allItems: any[] = [];
    let currentCursor = '';
    let hasNext = true;
    let page = 1;
    const maxPages = 50; // Safety guard against runaway loops

    while (hasNext && page <= maxPages) {
      const pageParams = { ...baseParams };
      if (currentCursor) pageParams.cursor = currentCursor;

      const pageData = await dmarketRequest('GET', '/marketplace-api/v2/user/targets', pageParams);
      const items = Array.isArray(pageData?.items) ? pageData.items : [];
      if (items.length > 0) {
        allItems = allItems.concat(items);
      }

      currentCursor = pageData?.cursor || '';
      if (!currentCursor || items.length < baseParams.limit) {
        hasNext = false;
      } else {
        page++;
        // Polite delay between pagination requests
        await new Promise(r => setTimeout(r, 150));
      }
    }

    console.log(`[DMarket IPC] ✅ Fetched total ${allItems.length} active targets across ${page} page(s).`);
    return {
      items: allItems,
      total: String(allItems.length),
      cursor: '',
    };
  },
);

// 4. Create Target
ipcMain.handle(
  'dmarket:create-target',
  async (
    _,
    title: string,
    priceInUsd: number,
    amount: number = 1,
    attrs?: { floatPartValue?: string; phase?: string; paintSeed?: number },
  ) => {
    console.log('[DMarket IPC] Creating target:', { title, priceInUsd, amount, attrs });

    if (!title || typeof title !== 'string') {
      throw new Error('Valid item title is required to create a target');
    }
    const numPrice = typeof priceInUsd === 'number' ? priceInUsd : parseFloat(priceInUsd);
    if (isNaN(numPrice) || numPrice <= 0) {
      throw new Error('Valid target price in USD is required');
    }

    const targetPayload: any = {
      Amount: String(Math.max(1, Math.floor(amount || 1))),
      Price: {
        Currency: 'USD',
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

    const res = await dmarketRequest('POST', '/marketplace-api/v1/user-targets/create', undefined, body);
    const resultItem = res?.Result?.[0];
    if (resultItem && !resultItem.Successful) {
      const errDetail = resultItem.Error?.Message || 'Target creation rejected by DMarket';
      throw new Error(errDetail);
    }

    console.log('[DMarket IPC] ✅ Target created successfully:', resultItem?.TargetID);
    return res;
  },
);

// 5. Delete Target
ipcMain.handle('dmarket:delete-target', async (_, targetId: string) => {
  console.log('[DMarket IPC] Deleting target:', targetId);
  if (!targetId || typeof targetId !== 'string') {
    throw new Error('TargetID string is required to delete a target');
  }

  const body = {
    Targets: [{ TargetID: targetId }],
  };

  const res = await dmarketRequest('POST', '/marketplace-api/v1/user-targets/delete', undefined, body);
  const resultItem = res?.Result?.[0];
  if (resultItem && !resultItem.Successful) {
    const errDetail = resultItem.Error?.Message || 'Failed to delete target';
    throw new Error(errDetail);
  }

  console.log('[DMarket IPC] ✅ Target deleted successfully:', targetId);
  return { success: true, result: res };
});

// 6. Update Target Price (Update = Delete old target + Create new target, matching DmarketActiveTargetsManager)
ipcMain.handle(
  'dmarket:update-target',
  async (
    _,
    oldTargetId: string,
    title: string,
    newPriceInUsd: number,
    amount: number = 1,
    attrs?: any,
  ) => {
    console.log('[DMarket IPC] Updating target (Delete + Create):', {
      oldTargetId,
      title,
      newPriceInUsd,
      amount,
    });

    // 1. Delete old target first to avoid creating duplicate active targets on DMarket
    if (oldTargetId) {
      try {
        console.log(`[DMarket IPC] 1/2 Deleting old target ${oldTargetId}...`);
        await dmarketRequest(
          'POST',
          '/marketplace-api/v1/user-targets/delete',
          undefined,
          { Targets: [{ TargetID: oldTargetId }] },
        );
        console.log(`[DMarket IPC] ✅ Deleted old target ${oldTargetId}`);
      } catch (delErr: any) {
        console.warn(`[DMarket IPC] ⚠️ Delete old target notice:`, delErr.message);
      }

      // 500ms pause matching DmarketActiveTargetsManager to let DMarket release the orderbook slot
      await new Promise(r => setTimeout(r, 500));
    }

    // 2. Create the target with new price
    const targetPayload: any = {
      Amount: String(Math.max(1, Math.floor(amount || 1))),
      Price: {
        Currency: 'USD',
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

    console.log(`[DMarket IPC] 2/2 Creating updated target for "${title}" at $${Number(newPriceInUsd).toFixed(2)}...`);
    const createRes = await dmarketRequest(
      'POST',
      '/marketplace-api/v1/user-targets/create',
      undefined,
      createBody,
    );
    const resultItem = createRes?.Result?.[0];
    if (resultItem && !resultItem.Successful) {
      let errDetail = resultItem.Error?.Message || 'Failed to create updated target';
      if (errDetail.toLowerCase().includes('too fast')) {
        errDetail = `DMarket Rate Limit: You are creating/updating target for "${title}" too fast. Please wait a moment and try again.`;
      } else if (errDetail.toLowerCase().includes('balance') || errDetail.toLowerCase().includes('funds')) {
        errDetail = `Insufficient DMarket balance to update target for "${title}" to $${Number(newPriceInUsd).toFixed(2)}.`;
      }
      throw new Error(errDetail);
    }

    const newTargetId = resultItem?.TargetID || oldTargetId;
    console.log(`[DMarket IPC] ✅ Target updated successfully for "${title}" (TargetID: ${newTargetId})`);

    return {
      success: true,
      newTargetId,
      oldTargetId,
      result: createRes,
    };
  },
);

// 7. Closed Targets (Trade History)
ipcMain.handle('dmarket:get-closed-targets', async (_, limit: number = 50, cursor?: string) => {
  console.log('[DMarket IPC] Fetching closed targets history...');
  const params: Record<string, any> = {
    Limit: limit,
    OrderDir: 'desc',
  };
  if (cursor) params.Cursor = cursor;

  const data = await dmarketRequest('GET', '/marketplace-api/v1/user-targets/closed', params);
  const rawTrades = Array.isArray(data?.Trades) ? data.Trades : Array.isArray(data?.trades) ? data.trades : [];
  console.log(`[DMarket IPC] Loaded ${rawTrades.length} closed targets. Sample item:`, rawTrades[0] ? JSON.stringify(rawTrades[0]) : 'None');

  const trades = rawTrades.map((t: any) => {
    // 1. Resolve Title
    const title = resolveDmarketTitle(t);

    // 2. Resolve Price in USD
    const priceObj = t.Price || t.price;
    let priceFormatted = '—';
    let rawAmount: any = undefined;

    if (priceObj && typeof priceObj === 'object') {
      rawAmount =
        priceObj.Amount ??
        priceObj.amount ??
        priceObj.USD ??
        priceObj.usd ??
        priceObj.price ??
        priceObj.Price;
    } else if (typeof priceObj === 'number' || typeof priceObj === 'string') {
      rawAmount = priceObj;
    }

    if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
      rawAmount =
        t.PriceCents ??
        t.priceCents ??
        t.PriceAmount ??
        t.priceAmount ??
        t.AmountCents ??
        t.amountCents;
    }

    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      const num = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount));
      if (!isNaN(num)) {
        const str = String(rawAmount);
        if (str.includes('.')) {
          priceFormatted = num.toFixed(2);
        } else if (priceObj?.USD !== undefined || priceObj?.usd !== undefined || num >= 50) {
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
      const parsedTs = typeof rawClosedAt === 'number' ? rawClosedAt : parseInt(String(rawClosedAt), 10);
      if (!isNaN(parsedTs)) {
        closedAtSec = parsedTs > 1e11 ? Math.floor(parsedTs / 1000) : parsedTs;
      }
    }

    // 4. Resolve Amount / Quantity
    const amount = String(t.Amount || t.amount || '1');

    // 5. Resolve Status
    const rawStatus = t.Status || t.status || 'FULFILLED';
    const status = String(rawStatus).replace(/^TargetClosedStatus/, '').toUpperCase();

    return {
      ...t,
      tradeId: t.OfferID || t.offerId || t.TargetID || t.targetId || t.AssetID || t.assetId || String(Math.random()),
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
    cursor: data?.Cursor || data?.cursor || '',
  };
});

// 8. Market Demand Targets by Title
ipcMain.handle('dmarket:get-targets-by-title', async (_, title: string) => {
  console.log('[DMarket IPC] Fetching targets by title:', title);
  if (!title) throw new Error('Item title is required');

  const endpointPath = `/marketplace-api/v1/targets-by-title/${DMARKET_CS2_GAME_ID}/${encodeURIComponent(title)}`;
  const decodedPathForSigning = `/marketplace-api/v1/targets-by-title/${DMARKET_CS2_GAME_ID}/${title}`;

  const data = await dmarketRequest('GET', endpointPath, undefined, undefined, decodedPathForSigning);
  return Array.isArray(data?.orders) ? data.orders : [];
});

// 9. Active User Sell Offers (Listings)
ipcMain.handle(
  'dmarket:get-offers',
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
    console.log('[DMarket IPC] Fetching user sell offers with params:', params);

    const baseParams: Record<string, any> = {
      gameId: DMARKET_CS2_GAME_ID,
      limit: Math.min(params?.limit || 100, 100),
    };

    if (params?.title) baseParams.title = params.title;
    if (params?.treeFilters) baseParams.treeFilters = params.treeFilters;

    const normalizeOffer = (item: any) => {
      const id = item.id || item.offerId || item.offer_id || item.OfferID || '';
      const assetId = resolveDmarketAssetId(item);
      const title = resolveDmarketTitle(item);
      const priceCents = resolveDmarketPriceCents(item);
      const priceUsd = (priceCents / 100).toFixed(2);
      const imageUrl = resolveDmarketImageUrl(item, title);
      const attributes = {
        ...(item.extra || item.Extra || {}),
        ...(item.attributes || item.Attributes || {}),
      };

      return {
        ...item,
        id,
        assetId,
        title,
        Title: title,
        marketHashName: title,
        priceCents,
        priceUsd,
        status: item.status || item.Status || 'active',
        imageUrl,
        attributes,
      };
    };

    if (!params?.fetchAll) {
      if (params?.cursor) baseParams.cursor = params.cursor;
      const data = await dmarketRequest('GET', '/marketplace-api/v2/user/offers', baseParams);
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      return {
        items: rawItems.map(normalizeOffer),
        total: data?.total || String(rawItems.length),
        cursor: data?.cursor || '',
      };
    }

    // Multi-page fetch: walk all cursors
    let allItems: any[] = [];
    let currentCursor = '';
    let hasNext = true;
    let page = 1;
    const maxPages = 50;

    while (hasNext && page <= maxPages) {
      const pageParams = { ...baseParams };
      if (currentCursor) pageParams.cursor = currentCursor;

      const pageData = await dmarketRequest('GET', '/marketplace-api/v2/user/offers', pageParams);
      const items = Array.isArray(pageData?.items) ? pageData.items : [];
      if (items.length > 0) {
        allItems = allItems.concat(items);
      }

      currentCursor = pageData?.cursor || '';
      if (!currentCursor || items.length < baseParams.limit) {
        hasNext = false;
      } else {
        page++;
        await new Promise(r => setTimeout(r, 150));
      }
    }

    console.log(`[DMarket IPC] ✅ Fetched total ${allItems.length} active sell offers across ${page} page(s).`);
    return {
      items: allItems.map(normalizeOffer),
      total: String(allItems.length),
      cursor: '',
    };
  },
);

// 10. User Inventory (Available to be listed)
ipcMain.handle(
  'dmarket:get-inventory',
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
    console.log('[DMarket IPC] Fetching user inventory with params:', params);

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
      const inMarket = Boolean(item.inMarket ?? item.InMarket ?? item.in_market ?? false);
      const tradable = item.tradable ?? item.Tradable ?? item.extra?.tradable ?? item.attributes?.tradable ?? true;
      const attributes = {
        ...(item.extra || item.Extra || {}),
        ...(item.attributes || item.Attributes || {}),
      };

      const inGameAssetId = String(
        attributes?.inGameAssetId ||
        attributes?.inGameAssetID ||
        item?.inGameAssetId ||
        (assetId.includes(':') ? assetId : '') ||
        ''
      ).trim();

      const steamAssetId = String(
        attributes?.steamAssetId ||
        item?.steamAssetId ||
        attributes?.inGameAssetID ||
        item?.extra?.inGameAssetID ||
        ''
      ).trim();

      return {
        ...item,
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
      };
    };

    if (!params?.fetchAll) {
      if (params?.cursor) baseParams.cursor = params.cursor;
      const data = await dmarketRequest('GET', '/marketplace-api/v2/user/inventory', baseParams);
      const rawItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.objects)
        ? data.objects
        : Array.isArray(data?.Items)
        ? data.Items
        : [];
      console.log(`[DMarket IPC] Loaded ${rawItems.length} inventory items (single page). Sample item:`, rawItems[0] ? JSON.stringify(rawItems[0]) : 'None');
      return {
        items: rawItems.map(normalizeInvItem),
        total: data?.total || String(rawItems.length),
        cursor: data?.cursor || '',
      };
    }

    // Multi-page fetch: walk all cursors
    let allItems: any[] = [];
    let currentCursor = '';
    let hasNext = true;
    let page = 1;
    const maxPages = 50;

    while (hasNext && page <= maxPages) {
      const pageParams = { ...baseParams };
      if (currentCursor) pageParams.cursor = currentCursor;

      const pageData = await dmarketRequest('GET', '/marketplace-api/v2/user/inventory', pageParams);
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

      currentCursor = pageData?.cursor || '';
      if (!currentCursor || items.length < baseParams.limit) {
        hasNext = false;
      } else {
        page++;
        await new Promise(r => setTimeout(r, 150));
      }
    }

    console.log(`[DMarket IPC] ✅ Fetched total ${allItems.length} inventory items across ${page} page(s). Sample item:`, allItems[0] ? JSON.stringify(allItems[0]) : 'None');
    return {
      items: allItems.map(normalizeInvItem),
      total: String(allItems.length),
      cursor: '',
    };
  },
);

// 11. Batch Create Offers (List Inventory Items)
ipcMain.handle(
  'dmarket:create-offers',
  async (
    _,
    requests: Array<{ assetId?: string; itemId?: string; id?: string; priceCents?: number | string; priceUsd?: number | string }>,
  ) => {
    console.log(`[DMarket IPC] Batch creating ${requests?.length || 0} offers...`);
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error('No items provided for listing creation');
    }

    const formattedRequests = requests.map((r, idx) => {
      let cents = 0;
      if (r.priceCents !== undefined && r.priceCents !== null) {
        cents = Math.round(Number(r.priceCents));
      } else if (r.priceUsd !== undefined && r.priceUsd !== null) {
        cents = Math.round(Number(r.priceUsd) * 100);
      }
      const rawId = r.assetId || r.itemId || r.id || '';
      if (cents <= 0) {
        throw new Error(`Invalid price for asset ${rawId}: price must be greater than 0`);
      }

      const resolvedUuid = formatAsUuid(rawId);
      if (!resolvedUuid) {
        console.error(`[DMarket IPC] ❌ Error: Asset ID "${rawId}" is not a valid DMarket UUID (inMarket: false).`);
        throw new Error(
          `Item is currently in your Steam inventory (not deposited to DMarket). Please deposit the item to DMarket first before creating sell listings.`
        );
      }

      return {
        assetId: resolvedUuid,
        asset_id: resolvedUuid,
        priceCents: String(cents),
        price_cents: cents,
      };
    });

    console.log(
      `[DMarket IPC] Formatted ${formattedRequests.length} offer(s) for creation. Sample payload:`,
      formattedRequests[0] ? JSON.stringify(formattedRequests[0]) : 'None',
    );

    // Chunk into batches of 100 (DMarket limit per request)
    const chunkSize = 100;
    const allCreated: any[] = [];
    const allFailed: any[] = [];

    for (let i = 0; i < formattedRequests.length; i += chunkSize) {
      const chunk = formattedRequests.slice(i, i + chunkSize);
      const body = { requests: chunk };
      const res = await dmarketRequest('POST', '/marketplace-api/v2/offers:batchCreate', undefined, body);

      if (Array.isArray(res?.offers)) allCreated.push(...res.offers);
      if (Array.isArray(res?.failed)) allFailed.push(...res.failed);

      if (i + chunkSize < formattedRequests.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`[DMarket IPC] ✅ Batch create completed: ${allCreated.length} created, ${allFailed.length} failed`);
    return {
      offers: allCreated,
      failed: allFailed,
      success: allFailed.length === 0,
    };
  },
);

// 12. Batch Update Offers (Update Listing Prices)
ipcMain.handle(
  'dmarket:update-offers',
  async (
    _,
    requests: Array<{ id: string; priceCents?: number | string; priceUsd?: number | string }>,
  ) => {
    console.log(`[DMarket IPC] Batch updating ${requests?.length || 0} offers...`);
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error('No offers provided for price update');
    }

    const formattedRequests = requests.map(r => {
      let cents = 0;
      if (r.priceCents !== undefined && r.priceCents !== null) {
        cents = Math.round(Number(r.priceCents));
      } else if (r.priceUsd !== undefined && r.priceUsd !== null) {
        cents = Math.round(Number(r.priceUsd) * 100);
      }
      if (cents <= 0) {
        throw new Error(`Invalid price for offer ${r.id}: price must be greater than 0`);
      }
      return {
        offer_id: r.id,
        price_cents: cents,
      };
    });

    const chunkSize = 100;
    const allUpdated: any[] = [];
    const allFailed: any[] = [];

    for (let i = 0; i < formattedRequests.length; i += chunkSize) {
      const chunk = formattedRequests.slice(i, i + chunkSize);
      const body = { requests: chunk };
      const res = await dmarketRequest('POST', '/marketplace-api/v2/offers:batchUpdate', undefined, body);

      if (Array.isArray(res?.offers)) allUpdated.push(...res.offers);
      if (Array.isArray(res?.failed)) allFailed.push(...res.failed);

      if (i + chunkSize < formattedRequests.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`[DMarket IPC] ✅ Batch update completed: ${allUpdated.length} updated, ${allFailed.length} failed`);
    return {
      offers: allUpdated,
      failed: allFailed,
      success: allFailed.length === 0,
    };
  },
);

// 13. Batch Delete Offers (Delist / Remove from Sale)
ipcMain.handle(
  'dmarket:delete-offers',
  async (
    _,
    requests: Array<{ id: string; assetId?: string }>,
  ) => {
    console.log(`[DMarket IPC] Batch deleting ${requests?.length || 0} offers...`);
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error('No offers provided for delisting');
    }

    const formattedRequests = requests.map(r => {
      const uuid = formatAsUuid(r.assetId);
      return {
        offer_id: r.id,
        ...(uuid ? { asset_id: uuid } : {}),
      };
    });

    const chunkSize = 100;
    const allDeleted: any[] = [];
    const allFailed: any[] = [];

    for (let i = 0; i < formattedRequests.length; i += chunkSize) {
      const chunk = formattedRequests.slice(i, i + chunkSize);
      const body = { requests: chunk };
      const res = await dmarketRequest('POST', '/marketplace-api/v2/offers:batchDelete', undefined, body);

      if (Array.isArray(res?.offers)) allDeleted.push(...res.offers);
      if (Array.isArray(res?.failed)) allFailed.push(...res.failed);

      if (i + chunkSize < formattedRequests.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    console.log(`[DMarket IPC] ✅ Batch delete completed: ${allDeleted.length} delisted, ${allFailed.length} failed`);
    return {
      offers: allDeleted,
      failed: allFailed,
      success: allFailed.length === 0,
    };
  },
);

// 14. Closed Offers (Sales History)
ipcMain.handle('dmarket:get-closed-offers', async (_, limit: number = 50, cursor?: string) => {
  console.log('[DMarket IPC] Fetching closed offers sales history...');
  const params: Record<string, any> = {
    limit,
    orderDir: 'desc',
  };
  if (cursor) params.cursor = cursor;

  const data = await dmarketRequest('GET', '/marketplace-api/v1/user-offers/closed', params);
  const rawTrades = Array.isArray(data?.Trades) ? data.Trades : Array.isArray(data?.trades) ? data.trades : [];
  console.log(`[DMarket IPC] Loaded ${rawTrades.length} closed sell offers.`);

  const trades = rawTrades.map((t: any) => {
    const title = resolveDmarketTitle(t);
    const imageUrl = resolveDmarketImageUrl(t, title);

    const priceObj = t.Price || t.price;
    let priceFormatted = '—';
    let rawAmount: any = undefined;

    if (priceObj && typeof priceObj === 'object') {
      rawAmount = priceObj.Amount ?? priceObj.amount ?? priceObj.USD ?? priceObj.usd ?? priceObj.price;
    } else if (typeof priceObj === 'number' || typeof priceObj === 'string') {
      rawAmount = priceObj;
    }

    if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
      rawAmount = t.PriceCents ?? t.priceCents ?? t.PriceAmount ?? t.priceAmount;
    }

    if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
      const num = typeof rawAmount === 'number' ? rawAmount : parseFloat(String(rawAmount));
      if (!isNaN(num)) {
        const str = String(rawAmount);
        if (str.includes('.')) {
          priceFormatted = num.toFixed(2);
        } else if (priceObj?.USD !== undefined || priceObj?.usd !== undefined || num >= 50) {
          priceFormatted = (num / 100).toFixed(2);
        } else {
          priceFormatted = num.toFixed(2);
        }
      }
    }

    // Fee formatting
    let feeFormatted = '—';
    const feeObj = t.Fee || t.fee;
    if (feeObj?.Amount?.Amount !== undefined) {
      feeFormatted = `$${Number(feeObj.Amount.Amount).toFixed(2)}`;
    } else if (feeObj?.amount !== undefined) {
      feeFormatted = `$${(Number(feeObj.amount) / 100).toFixed(2)}`;
    }

    // Closed timestamp
    const rawClosedAt = t.OfferClosedAt ?? t.offerClosedAt ?? t.ClosedAt ?? t.closedAt ?? t.CreatedAt ?? t.createdAt;
    let closedAtSec: number | null = null;
    if (rawClosedAt) {
      const parsedTs = typeof rawClosedAt === 'number' ? rawClosedAt : parseInt(String(rawClosedAt), 10);
      if (!isNaN(parsedTs)) {
        closedAtSec = parsedTs > 1e11 ? Math.floor(parsedTs / 1000) : parsedTs;
      }
    }

    const offerId = t.OfferID || t.offerId || t.id || String(Math.random());
    const assetId = resolveDmarketAssetId(t);
    const status = (t.Status || t.status || 'successful').toLowerCase();

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
    cursor: data?.Cursor || data?.cursor || '',
  };
});

// 15. Deposit Assets from Steam to DMarket
ipcMain.handle('dmarket:deposit-assets', async (_, assetIds: string[]) => {
  console.log(`[DMarket IPC] Initiating deposit for ${assetIds?.length || 0} asset(s)...`);
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw new Error('No assets provided for deposit');
  }

  const formattedAssetIds = assetIds.map(id => String(id).trim()).filter(Boolean);
  const body = {
    AssetID: formattedAssetIds,
  };

  const res = await dmarketRequest('POST', '/marketplace-api/v1/deposit-assets', undefined, body);
  console.log('[DMarket IPC] ✅ Deposit registered:', res);
  return res;
});

// 16. Get Deposit Status
ipcMain.handle('dmarket:get-deposit-status', async (_, depositId: string) => {
  if (!depositId) throw new Error('Deposit ID is required');
  const res = await dmarketRequest('GET', `/marketplace-api/v1/deposit-status/${encodeURIComponent(depositId)}`);
  return res;
});

// 17. Sync User Inventory with Steam
ipcMain.handle('dmarket:sync-user-inventory', async () => {
  console.log('[DMarket IPC] Syncing inventory with Steam...');
  const body = { Type: 'Inventory', GameID: 'CSGO' };
  const res = await dmarketRequest('POST', '/marketplace-api/v1/user-inventory/sync', undefined, body);
  return res;
});
}

