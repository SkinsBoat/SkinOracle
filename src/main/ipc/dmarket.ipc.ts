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
    const title =
      t.Title ||
      t.title ||
      t.marketHashName ||
      t.MarketHashName ||
      t.name ||
      t.Name ||
      t.assetTitle ||
      t.AssetTitle ||
      'CS2 Item';

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
      const id = item.id || item.offerId || item.offer_id;
      const assetId = item.assetId || item.asset_id;
      const title = item.title || item.name || 'CS2 Item';
      let priceCents = 0;
      if (item.priceCents !== undefined && item.priceCents !== null) {
        priceCents = Number(item.priceCents);
      } else if (item.price_cents !== undefined && item.price_cents !== null) {
        priceCents = Number(item.price_cents);
      } else if (item.price?.amount !== undefined) {
        priceCents = Math.round(Number(item.price.amount) * 100);
      }
      const priceUsd = (priceCents / 100).toFixed(2);
      const imageUrl =
        item.imageUrl ||
        item.image ||
        (item.attributes?.image ? item.attributes.image : `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`);

      return {
        ...item,
        id,
        assetId,
        title,
        priceCents,
        priceUsd,
        status: item.status || 'active',
        imageUrl,
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
      const assetId = item.assetId || item.asset_id || item.id;
      const title = item.title || item.name || 'CS2 Item';
      let priceCents = 0;
      if (item.priceCents !== undefined && item.priceCents !== null) {
        priceCents = Number(item.priceCents);
      } else if (item.price_cents !== undefined && item.price_cents !== null) {
        priceCents = Number(item.price_cents);
      } else if (item.price?.amount !== undefined) {
        priceCents = Math.round(Number(item.price.amount) * 100);
      }
      const priceUsd = (priceCents / 100).toFixed(2);
      const imageUrl =
        item.imageUrl ||
        item.image ||
        (item.attributes?.image ? item.attributes.image : `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`);

      return {
        ...item,
        assetId,
        title,
        priceCents,
        priceUsd,
        tradable: item.tradable !== false,
        inMarket: !!item.inMarket,
        imageUrl,
      };
    };

    if (!params?.fetchAll) {
      if (params?.cursor) baseParams.cursor = params.cursor;
      const data = await dmarketRequest('GET', '/marketplace-api/v2/user/inventory', baseParams);
      const rawItems = Array.isArray(data?.items) ? data.items : [];
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

    console.log(`[DMarket IPC] ✅ Fetched total ${allItems.length} inventory items across ${page} page(s).`);
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
    requests: Array<{ assetId: string; priceCents?: number | string; priceUsd?: number | string }>,
  ) => {
    console.log(`[DMarket IPC] Batch creating ${requests?.length || 0} offers...`);
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error('No items provided for listing creation');
    }

    const formattedRequests = requests.map(r => {
      let cents = 0;
      if (r.priceCents !== undefined && r.priceCents !== null) {
        cents = Math.round(Number(r.priceCents));
      } else if (r.priceUsd !== undefined && r.priceUsd !== null) {
        cents = Math.round(Number(r.priceUsd) * 100);
      }
      if (cents <= 0) {
        throw new Error(`Invalid price for asset ${r.assetId}: price must be greater than 0`);
      }
      return {
        asset_id: r.assetId,
        price_cents: cents,
      };
    });

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

    const formattedRequests = requests.map(r => ({
      offer_id: r.id,
      ...(r.assetId ? { asset_id: r.assetId } : {}),
    }));

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
    const title =
      t.Title ||
      t.title ||
      t.marketHashName ||
      t.MarketHashName ||
      t.name ||
      t.Name ||
      'CS2 Item';

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
    const assetId = t.AssetID || t.assetId || '';
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
      imageUrl: `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`,
    };
  });

  return {
    trades,
    total: data?.Total || data?.total || String(trades.length),
    cursor: data?.Cursor || data?.cursor || '',
  };
});
}

