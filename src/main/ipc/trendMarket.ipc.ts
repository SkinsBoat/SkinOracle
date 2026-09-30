import { ipcMain } from 'electron';
import axios from 'axios';
import { saasAxios } from '../services/saasAxios';
import { trendStore } from '../services/trendStore';
import {
  isRequestHeldError,
  isStorageUnavailableError,
  REQUEST_HOLD_MESSAGE,
  STORAGE_UNAVAILABLE_MESSAGE,
} from '../../shared/utils/apiErrors';
import {
  clampInt,
  isTrendPackId,
  sanitizeListingParams,
  sanitizeSkinName,
  sanitizeTitle,
  TREND_EXPORT_MAX_DAYS,
} from '../../shared/utils/trendMarketParams';
import {
  TREND_MARKET_LISTINGS,
  TREND_MARKET_PREVIEW,
  TREND_MARKET_PURCHASE,
  TREND_MARKET_UPLOAD_URL,
  TREND_MARKET_CONFIRM_UPLOAD,
  TREND_MARKET_MY_LISTING,
  TREND_MARKET_DELETE_LISTING,
} from '../constants/apiUrls';

export interface TrendMarketHeldResult {
  success: false;
  code: string;
  message: string;
}

/**
 * Converts expected "marketplace is paused" backend conditions (storage outage,
 * maintenance window, engine restart hold) into a soft result object instead of
 * an IPC rejection. This keeps the renderer UI clean and prevents Electron from
 * dumping raw server errors into the main-process console.
 *
 * Returns null for genuine errors, which are still re-thrown.
 */
function toHeldResult(err: any): TrendMarketHeldResult | null {
  if (isStorageUnavailableError(err)) {
    return {
      success: false,
      code: 'STORAGE_UNAVAILABLE',
      message: STORAGE_UNAVAILABLE_MESSAGE,
    };
  }
  if (isRequestHeldError(err)) {
    return {
      success: false,
      code: err?.code || 'ENGINE_RESTART_HOLD',
      message: REQUEST_HOLD_MESSAGE,
    };
  }
  return null;
}

async function guarded<T>(fn: () => Promise<T>): Promise<T | TrendMarketHeldResult> {
  try {
    return await fn();
  } catch (err: any) {
    const held = toHeldResult(err);
    if (held) {
      console.warn(
        `[TrendMarket] Request held (${held.code}): ${err?.message || err}`,
      );
      return held;
    }
    throw err;
  }
}

export function setupTrendMarketIPC() {
  // 1. Get paginated marketplace listings
  ipcMain.handle(
    'trend-market:get-listings',
    async (_, params?: { page?: number; limit?: number; sort?: string; search?: string }) => {
      const res = await saasAxios.get(TREND_MARKET_LISTINGS, {
        params: sanitizeListingParams(params),
      });
      return res.data;
    },
  );

  // 2. Query preview chart data for a specific skin
  ipcMain.handle(
    'trend-market:preview-skin',
    async (_, packId: string, skinName?: string) => {
      if (!isTrendPackId(packId)) {
        throw new Error('Invalid trend pack id.');
      }
      const safeSkinName = sanitizeSkinName(skinName);
      const res = await saasAxios.get(TREND_MARKET_PREVIEW(packId), {
        params: { skinName: safeSkinName },
      });
      return res.data;
    },
  );

  // 3. Purchase pack & full-replace local SQLite trend history
  ipcMain.handle('trend-market:purchase-pack', (_, packId: string) =>
    guarded(async () => {
      // Step A: Authoritative purchase & debit via saas-api
      const res = await saasAxios.post(TREND_MARKET_PURCHASE(packId));
      const downloadUrl = res.data?.downloadUrl;

      if (!downloadUrl) {
        throw new Error('Purchase succeeded but no download URL was returned from SaaS backend.');
      }

      // Step B: Direct in-memory stream download from Cloudflare R2 and full
      // replace of the local price_snapshots table with the purchased pack.
      const replaceResult =
        await trendStore.replaceWithTrendPackFromUrl(downloadUrl);

      return {
        ...res.data,
        success: true as const,
        replaceResult,
      };
    }),
  );

  // 4. Export local SQLite trend history and upload to Cloudflare R2
  ipcMain.handle(
    'trend-market:upload-pack',
    (_, options: { title: string; days?: number }) =>
      guarded(async () => {
        const title = sanitizeTitle(options?.title);
        const days = clampInt(options?.days, 1, TREND_EXPORT_MAX_DAYS, 30);

        // Step A: Package local SQLite snapshots into compressed payload
        const exportResult = await trendStore.exportTrendPackPayload(days);

        // Step B: Request 60-second HMAC presigned PUT URL from saas-api.
        // The backend writes NOTHING to the database here and charges no fee.
        const uploadUrlRes = await saasAxios.post(TREND_MARKET_UPLOAD_URL, {
          title,
        });

        const { uploadUrl, uploadId, isFreeUpdate, feeChargedCents } =
          uploadUrlRes.data;

        if (!uploadUrl || !uploadId) {
          throw new Error('SaaS backend did not return a Cloudflare R2 upload URL.');
        }

        // Step C: Direct PUT of the gzipped buffer to the real Cloudflare R2 presigned URL
        await axios.put(uploadUrl, exportResult.payloadBuffer, {
          headers: {
            'Content-Type': 'application/gzip',
          },
          maxContentLength: 100 * 1024 * 1024,
          maxBodyLength: 100 * 1024 * 1024,
        });

        // Step D: Confirm upload. The backend validates the R2 object and only
        // then creates/updates the listing (and charges any listing fee).
        const confirmRes = await saasAxios.post(TREND_MARKET_CONFIRM_UPLOAD, {
          uploadId,
          title,
        });

        return {
          success: true as const,
          pack: confirmRes.data,
          isFreeUpdate,
          feeChargedCents,
          exportedStats: {
            daysCount: exportResult.daysCount,
            totalSnapshots: exportResult.totalSnapshots,
            itemCoverage: exportResult.itemCoverage,
          },
        };
      }),
  );

  // 5. Get seller's active listing + earnings summary
  ipcMain.handle('trend-market:get-my-listing', async () => {
    const res = await saasAxios.get(TREND_MARKET_MY_LISTING);
    return res.data;
  });

  // 6. Delete seller's active listing
  ipcMain.handle('trend-market:delete-listing', () =>
    guarded(async () => {
      const res = await saasAxios.delete(TREND_MARKET_DELETE_LISTING);
      return { ...res.data, success: true as const };
    }),
  );

  // 7. Preview local export stats without uploading
  ipcMain.handle('trend-market:get-export-preview', async (_, days?: number) => {
    return trendStore.exportTrendPackPayload(
      clampInt(days, 1, TREND_EXPORT_MAX_DAYS, 30),
    );
  });
}
