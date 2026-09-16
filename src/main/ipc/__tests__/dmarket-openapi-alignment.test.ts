import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock tweetnacl and secure store
vi.mock("tweetnacl", () => ({
  default: {
    sign: {
      detached: vi.fn().mockReturnValue(new Uint8Array(64)),
      keyPair: {
        fromSeed: vi.fn().mockReturnValue({
          secretKey: new Uint8Array(64),
          publicKey: new Uint8Array(32),
        }),
      },
    },
  },
}));

vi.mock("../../../storage/secure-store", () => ({
  secureGet: (key: string) => {
    if (key && key.includes("public")) return "0123456789abcdef0123456789abcdef";
    if (key && key.includes("secret")) return "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    return null;
  },
  STORAGE_KEYS: {
    DMARKET_PUBLIC: "dmarket_public_key",
    DMARKET_SECRET: "dmarket_secret_key",
  },
}));

// Mock axios
vi.mock("axios", () => ({
  default: vi.fn().mockImplementation((config: any) => {
    return Promise.resolve({
      status: 200,
      data: { success: true, configUrl: config.url, configMethod: config.method, configData: config.data },
    });
  }),
}));

// Mock electron
const handlers: Record<string, Function> = {};
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn().mockReturnValue("/tmp"),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(false),
    encryptString: vi.fn((str: string) => Buffer.from(str)),
    decryptString: vi.fn((buf: Buffer) => buf.toString()),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      handlers[channel] = handler;
    }),
  },
}));

describe("DMarket OpenAPI Alignment Unit Tests", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import module to trigger handler registration
    await import("../dmarket.ipc");
  });

  it("should have registered all OpenAPI-aligned handlers in ipcMain", () => {
    const expectedChannels = [
      "dmarket:get-profile",
      "dmarket:get-balance",
      "dmarket:get-targets",
      "dmarket:create-target",
      "dmarket:batch-create-targets",
      "dmarket:delete-target",
      "dmarket:batch-delete-targets",
      "dmarket:update-target",
      "dmarket:get-closed-targets",
      "dmarket:get-targets-by-title",
      "dmarket:get-offers",
      "dmarket:get-inventory",
      "dmarket:create-offers",
      "dmarket:update-offers",
      "dmarket:delete-offers",
      "dmarket:get-closed-offers",
      "dmarket:deposit-assets",
      "dmarket:get-deposit-status",
      "dmarket:sync-user-inventory",
      "dmarket:get-last-sales",
      "dmarket:get-aggregated-prices",
      "dmarket:get-marketplace-offers",
      "dmarket:buy-offers",
      "dmarket:withdraw-assets",
      "dmarket:get-customized-fees",
      "dmarket:get-deposit-blocked-titles",
    ];

    for (const ch of expectedChannels) {
      expect(handlers[ch], `Expected handler for ${ch} to be registered`).toBeDefined();
    }
  });

  describe("dmarket:get-closed-offers parameter casing (OpenAPI v1 specification)", () => {
    it("should pass PascalCase Limit, OrderDir, and Cursor to match OpenAPI v1 spec", async () => {
      const axios = (await import("axios")).default as any;
      axios.mockResolvedValueOnce({
        data: {
          Trades: [
            {
              OfferID: "offer-1",
              Price: { Amount: 25.5, Currency: "USD" },
              Title: "AK-47 | Redline (Field-Tested)",
              Status: "Successful",
              OfferClosedAt: 1600000000,
            },
          ],
          Total: "1",
          Cursor: "next-cur",
        },
      });

      const handler = handlers["dmarket:get-closed-offers"];
      const result = await handler(null, 25, "test-cursor");

      expect(axios).toHaveBeenCalled();
      const callArgs = axios.mock.calls[0][0];
      expect(callArgs.url).toContain("/marketplace-api/v1/user-offers/closed");
      // Check query parameters passed in URL are PascalCase
      expect(callArgs.url).toContain("Limit=25");
      expect(callArgs.url).toContain("OrderDir=desc");
      expect(callArgs.url).toContain("Cursor=test-cursor");

      expect(result.trades).toHaveLength(1);
      expect(result.total).toBe("1");
      expect(result.cursor).toBe("next-cur");
    });
  });

  describe("dmarket:deposit-assets composite inGameAssetId handling", () => {
    it("should extract composite inGameAssetId from inventory objects and strings", async () => {
      const axios = (await import("axios")).default as any;
      axios.mockResolvedValueOnce({
        data: { DepositID: "dep-123" },
      });

      const handler = handlers["dmarket:deposit-assets"];
      const input = [
        "0:1234:5678:730", // composite string
        { inGameAssetId: "0:9999:8888:730" }, // object with inGameAssetId
        { attributes: { inGameAssetId: "0:1111:2222:730" } }, // object with attributes
      ];

      const res = await handler(null, input);
      expect(res.DepositID).toBe("dep-123");

      const callArgs = axios.mock.calls[0][0];
      const parsedBody = JSON.parse(callArgs.data);
      expect(parsedBody.AssetID).toEqual([
        "0:1234:5678:730",
        "0:9999:8888:730",
        "0:1111:2222:730",
      ]);
    });

    it("should throw error if empty array or invalid items passed", async () => {
      const handler = handlers["dmarket:deposit-assets"];
      await expect(handler(null, [])).rejects.toThrow("No assets provided for deposit");
      await expect(handler(null, ["", null])).rejects.toThrow("No valid asset IDs resolved for deposit");
    });
  });

  describe("dmarket:get-last-sales (OpenAPI Trade Aggregator)", () => {
    it("should pass title and query filters to /trade-aggregator/v1/last-sales", async () => {
      const axios = (await import("axios")).default as any;
      axios.mockResolvedValueOnce({
        data: {
          sales: [
            {
              price: "1550.00",
              date: 1600000000,
              txOperationType: "Offer",
              offerAttributes: { floatValue: 0.18, paintSeed: 42 },
            },
          ],
        },
      });

      const handler = handlers["dmarket:get-last-sales"];
      const res = await handler(null, {
        title: "AK-47 | Redline (Field-Tested)",
        limit: 10,
        txOperationType: "Offer",
      });

      expect(res.sales).toHaveLength(1);
      expect(res.sales[0].price).toBe("1550.00");
      const callArgs = axios.mock.calls[0][0];
      expect(callArgs.url).toContain("/trade-aggregator/v1/last-sales");
      expect(callArgs.url).toContain("limit=10");
      expect(callArgs.url).toContain("txOperationType=Offer");
    });

    it("should reject if title is missing", async () => {
      const handler = handlers["dmarket:get-last-sales"];
      await expect(handler(null, {} as any)).rejects.toThrow("Item title is required");
    });
  });

  describe("dmarket:get-aggregated-prices", () => {
    it("should POST body to /marketplace-api/v1/aggregated-prices", async () => {
      const axios = (await import("axios")).default as any;
      axios.mockResolvedValueOnce({
        data: {
          aggregatedPrices: [
            {
              title: "AK-47 | Redline (Field-Tested)",
              orderBestPrice: { amount: "1200", currency: "USD" },
              orderCount: "5",
              offerBestPrice: { amount: "1500", currency: "USD" },
              offerCount: "12",
            },
          ],
          nextCursor: "cur-xyz",
        },
      });

      const handler = handlers["dmarket:get-aggregated-prices"];
      const res = await handler(null, {
        titles: ["AK-47 | Redline (Field-Tested)"],
      });

      expect(res.aggregatedPrices).toHaveLength(1);
      expect(res.nextCursor).toBe("cur-xyz");
      const callArgs = axios.mock.calls[0][0];
      expect(callArgs.url).toContain("/marketplace-api/v1/aggregated-prices");
      const body = JSON.parse(callArgs.data);
      expect(body.filter.titles).toEqual(["AK-47 | Redline (Field-Tested)"]);
      expect(body.filter.game).toBe("a8db");
    });
  });

  describe("dmarket:buy-offers", () => {
    it("should PATCH /exchange/v1/offers-buy with correct body", async () => {
      const axios = (await import("axios")).default as any;
      axios.mockResolvedValueOnce({
        data: {
          orderId: "ord-1",
          txId: "tx-1",
          status: "TxSuccess",
        },
      });

      const handler = handlers["dmarket:buy-offers"];
      const res = await handler(null, {
        offers: [
          {
            offerId: "off-123",
            price: { amount: "4999", currency: "USD" },
            type: "dmarket",
          },
        ],
      });

      expect(res.status).toBe("TxSuccess");
      const callArgs = axios.mock.calls[0][0];
      expect(callArgs.method).toBe("PATCH");
      expect(callArgs.url).toContain("/exchange/v1/offers-buy");
      const body = JSON.parse(callArgs.data);
      expect(body.offers[0].offerId).toBe("off-123");
      expect(body.offers[0].price.amount).toBe("4999");
    });
  });

  describe("dmarket:withdraw-assets", () => {
    it("should POST /exchange/v1/withdraw-assets with correct body", async () => {
      const axios = (await import("axios")).default as any;
      axios.mockResolvedValueOnce({
        data: { transferId: "trans-abc" },
      });

      const handler = handlers["dmarket:withdraw-assets"];
      const res = await handler(null, {
        assets: [{ id: "asset-uuid-1", classId: "class-1" }],
      });

      expect(res.transferId).toBe("trans-abc");
      const callArgs = axios.mock.calls[0][0];
      expect(callArgs.method).toBe("POST");
      expect(callArgs.url).toContain("/exchange/v1/withdraw-assets");
      const body = JSON.parse(callArgs.data);
      expect(body.assets[0].id).toBe("asset-uuid-1");
      expect(body.assets[0].gameId).toBe("a8db");
    });
  });

  describe("dmarket:batch-create-targets and batch-delete-targets", () => {
    it("should batch create targets correctly", async () => {
      const axios = (await import("axios")).default as any;
      axios.mockResolvedValueOnce({
        data: {
          Result: [
            { Successful: true, TargetID: "t-1" },
            { Successful: true, TargetID: "t-2" },
          ],
        },
      });

      const handler = handlers["dmarket:batch-create-targets"];
      const res = await handler(null, [
        { Title: "Skin 1", Amount: 1, Price: { Currency: "USD", Amount: 10.5 } },
        { Title: "Skin 2", Amount: 2, Price: { Currency: "USD", Amount: 20.0 } },
      ]);

      expect(res.Result).toHaveLength(2);
      const callArgs = axios.mock.calls[0][0];
      expect(callArgs.url).toContain("/marketplace-api/v1/user-targets/create");
      const body = JSON.parse(callArgs.data);
      expect(body.GameID).toBe("a8db");
      expect(body.Targets).toHaveLength(2);
    });

    it("should batch delete targets correctly", async () => {
      const axios = (await import("axios")).default as any;
      axios.mockResolvedValueOnce({
        data: {
          Result: [
            { TargetID: "t-1", Successful: true },
            { TargetID: "t-2", Successful: true },
          ],
        },
      });

      const handler = handlers["dmarket:batch-delete-targets"];
      const res = await handler(null, ["t-1", "t-2"]);

      expect(res.Result).toHaveLength(2);
      const callArgs = axios.mock.calls[0][0];
      expect(callArgs.url).toContain("/marketplace-api/v1/user-targets/delete");
      const body = JSON.parse(callArgs.data);
      expect(body.Targets).toEqual([{ TargetID: "t-1" }, { TargetID: "t-2" }]);
    });
  });
});
