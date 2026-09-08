import { describe, it, expect, vi, beforeEach } from "vitest";

export interface DemoCacheHandlerParams {
  localCachePath: string;
  options?: { forceRefresh?: boolean };
  fileExistsFn: (p: string) => boolean;
  readFileFn: (p: string) => string;
  writeFileFn: (p: string, data: string) => void;
  fetchCloudCacheFn: () => Promise<{ data: any }>;
  setPriceCacheFn: (cache: any) => void;
}

export async function executeLoadDemoCache(params: DemoCacheHandlerParams) {
  const {
    localCachePath,
    options,
    fileExistsFn,
    readFileFn,
    writeFileFn,
    fetchCloudCacheFn,
    setPriceCacheFn,
  } = params;
  let cacheData: any = null;
  let source: "local_cache" | "cloud_download" | "cloud_refreshed" =
    "local_cache";

  // 1. Check if local userData cache already exists and forceRefresh is not requested
  if (!options?.forceRefresh && fileExistsFn(localCachePath)) {
    try {
      const jsonContent = readFileFn(localCachePath);
      const parsed = JSON.parse(jsonContent);
      cacheData = parsed.data?.priceCache || parsed.priceCache || parsed;
    } catch {
      cacheData = null;
    }
  }

  // 2. If no local cache found or forceRefresh requested, download from SaaS API
  if (!cacheData) {
    try {
      const res = await fetchCloudCacheFn();
      const parsed = res.data;
      cacheData = parsed?.data?.priceCache || parsed?.priceCache || parsed;
      source = options?.forceRefresh ? "cloud_refreshed" : "cloud_download";

      try {
        writeFileFn(localCachePath, JSON.stringify(cacheData));
      } catch {
        // ignore write error
      }
    } catch (networkErr: any) {
      if (fileExistsFn(localCachePath)) {
        const jsonContent = readFileFn(localCachePath);
        const parsed = JSON.parse(jsonContent);
        cacheData = parsed.data?.priceCache || parsed.priceCache || parsed;
        source = "local_cache";
      } else {
        throw new Error(
          `Failed to download demo price cache from server: ${networkErr.message}. Check your internet connection or use "Load Cache JSON File" to upload an offline JSON dataset.`,
        );
      }
    }
  }

  if (cacheData && typeof cacheData === "object" && !Array.isArray(cacheData)) {
    const cleanCache: Record<string, any> = {};
    for (const [key, val] of Object.entries(cacheData)) {
      if (
        val &&
        typeof val === "object" &&
        ("l" in (val as any) || "n" in (val as any))
      ) {
        cleanCache[key] = val as any;
      }
    }

    const finalCache =
      Object.keys(cleanCache).length > 0 ? cleanCache : cacheData;
    setPriceCacheFn(finalCache);

    return {
      success: true,
      itemCount: Object.keys(finalCache).length,
      fetchedAt: new Date().toISOString(),
      source,
    };
  } else {
    throw new Error("Invalid demo JSON cache format received");
  }
}

describe("Demo Cache Cloud Delivery & Local Disk Caching", () => {
  const dummyItem = {
    n: "AK-47 | Redline (Field-Tested)",
    l: [{ m: "csgofloat", p: 15.5 }],
  };
  const mockCachePayload = {
    "AK-47 | Redline (Field-Tested)": dummyItem,
  };

  it("should load instantly from local disk if local cache exists and forceRefresh is false", async () => {
    const fileExistsFn = vi.fn().mockReturnValue(true);
    const readFileFn = vi
      .fn()
      .mockReturnValue(JSON.stringify(mockCachePayload));
    const writeFileFn = vi.fn();
    const fetchCloudCacheFn = vi.fn();
    const setPriceCacheFn = vi.fn();

    const res = await executeLoadDemoCache({
      localCachePath: "/mock/userData/demo-prices-cache.json",
      options: { forceRefresh: false },
      fileExistsFn,
      readFileFn,
      writeFileFn,
      fetchCloudCacheFn,
      setPriceCacheFn,
    });

    expect(res.success).toBe(true);
    expect(res.itemCount).toBe(1);
    expect(res.source).toBe("local_cache");
    expect(fetchCloudCacheFn).not.toHaveBeenCalled();
    expect(setPriceCacheFn).toHaveBeenCalledTimes(1);
  });

  it("should fetch from SaaS API and persist locally if local cache is missing", async () => {
    const fileExistsFn = vi.fn().mockReturnValue(false);
    const readFileFn = vi.fn();
    const writeFileFn = vi.fn();
    const fetchCloudCacheFn = vi
      .fn()
      .mockResolvedValue({ data: mockCachePayload });
    const setPriceCacheFn = vi.fn();

    const res = await executeLoadDemoCache({
      localCachePath: "/mock/userData/demo-prices-cache.json",
      fileExistsFn,
      readFileFn,
      writeFileFn,
      fetchCloudCacheFn,
      setPriceCacheFn,
    });

    expect(res.success).toBe(true);
    expect(res.source).toBe("cloud_download");
    expect(fetchCloudCacheFn).toHaveBeenCalledTimes(1);
    expect(writeFileFn).toHaveBeenCalledWith(
      "/mock/userData/demo-prices-cache.json",
      JSON.stringify(mockCachePayload),
    );
    expect(setPriceCacheFn).toHaveBeenCalledTimes(1);
  });

  it("should re-download from cloud and update local cache when forceRefresh is true", async () => {
    const fileExistsFn = vi.fn().mockReturnValue(true);
    const readFileFn = vi.fn().mockReturnValue(JSON.stringify({ old: "data" }));
    const writeFileFn = vi.fn();
    const fetchCloudCacheFn = vi
      .fn()
      .mockResolvedValue({ data: mockCachePayload });
    const setPriceCacheFn = vi.fn();

    const res = await executeLoadDemoCache({
      localCachePath: "/mock/userData/demo-prices-cache.json",
      options: { forceRefresh: true },
      fileExistsFn,
      readFileFn,
      writeFileFn,
      fetchCloudCacheFn,
      setPriceCacheFn,
    });

    expect(res.success).toBe(true);
    expect(res.source).toBe("cloud_refreshed");
    expect(fetchCloudCacheFn).toHaveBeenCalledTimes(1);
    expect(writeFileFn).toHaveBeenCalledWith(
      "/mock/userData/demo-prices-cache.json",
      JSON.stringify(mockCachePayload),
    );
  });

  it("should fall back to local disk cache if cloud fetch fails and local cache exists", async () => {
    const fileExistsFn = vi.fn().mockReturnValue(true);
    const readFileFn = vi
      .fn()
      .mockReturnValue(JSON.stringify(mockCachePayload));
    const writeFileFn = vi.fn();
    const fetchCloudCacheFn = vi
      .fn()
      .mockRejectedValue(new Error("Network timeout"));
    const setPriceCacheFn = vi.fn();

    const res = await executeLoadDemoCache({
      localCachePath: "/mock/userData/demo-prices-cache.json",
      options: { forceRefresh: true }, // attempt refresh but network is down
      fileExistsFn,
      readFileFn,
      writeFileFn,
      fetchCloudCacheFn,
      setPriceCacheFn,
    });

    expect(res.success).toBe(true);
    expect(res.source).toBe("local_cache");
    expect(setPriceCacheFn).toHaveBeenCalledTimes(1);
  });

  it("should throw clear error if cloud fetch fails and no local cache exists", async () => {
    const fileExistsFn = vi.fn().mockReturnValue(false);
    const readFileFn = vi.fn();
    const writeFileFn = vi.fn();
    const fetchCloudCacheFn = vi
      .fn()
      .mockRejectedValue(new Error("Connection refused"));
    const setPriceCacheFn = vi.fn();

    await expect(
      executeLoadDemoCache({
        localCachePath: "/mock/userData/demo-prices-cache.json",
        fileExistsFn,
        readFileFn,
        writeFileFn,
        fetchCloudCacheFn,
        setPriceCacheFn,
      }),
    ).rejects.toThrow(/Failed to download demo price cache/);
  });
});
