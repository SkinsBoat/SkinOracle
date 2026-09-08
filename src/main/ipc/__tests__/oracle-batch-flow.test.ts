import { describe, it, expect, vi } from "vitest";

export interface BatchSessionResult {
  batchId: string;
  totalItems: number;
  totalCostCents: number;
  freeCoveredCents: number;
  billableCents: number;
}

export interface BatchFinishResult {
  batchId: string;
  totalItems: number;
  completedItems: number;
  unusedItems: number;
  refundedCents: number;
}

export async function executeBatchEvaluationWorkflow(params: {
  itemNames: string[];
  chunkSize: number;
  startBatchFn: (total: number) => Promise<BatchSessionResult>;
  evaluateChunkFn: (
    chunk: string[],
    batchId: string,
  ) => Promise<{ results: Array<{ name: string; price: number }> }>;
  finishBatchFn: (
    batchId: string,
    completed: number,
  ) => Promise<BatchFinishResult>;
  storePricesFn: (map: Record<string, number>) => Promise<{ stored: number }>;
}): Promise<{ total: number; prices: Record<string, number>; refund: number }> {
  const {
    itemNames,
    chunkSize,
    startBatchFn,
    evaluateChunkFn,
    finishBatchFn,
    storePricesFn,
  } = params;

  let activeBatchId: string | null = null;
  let total = 0;
  const priceMap: Record<string, number> = {};
  let refundedCents = 0;

  try {
    const session = await startBatchFn(itemNames.length);
    activeBatchId = session.batchId;

    for (let i = 0; i < itemNames.length; i += chunkSize) {
      const chunk = itemNames.slice(i, i + chunkSize);
      const res = await evaluateChunkFn(chunk, activeBatchId);
      if (res?.results) {
        res.results.forEach((r) => {
          priceMap[r.name] = r.price;
          total++;
        });
      }
    }
  } finally {
    if (activeBatchId) {
      const finish = await finishBatchFn(activeBatchId, total);
      refundedCents = finish.refundedCents;
    }
    if (Object.keys(priceMap).length > 0) {
      await storePricesFn(priceMap);
    }
  }

  return { total, prices: priceMap, refund: refundedCents };
}

describe("Oracle Batch Session Workflow (1-Ledger Deduction & Auto-Refund)", () => {
  it("should start batch with 1 deduction, evaluate all chunks without extra charges, and complete with 0 refund", async () => {
    const items = Array.from({ length: 4500 }, (_, i) => `Skin Item ${i}`);

    const startBatchMock = vi.fn().mockResolvedValue({
      batchId: "batch_test_123",
      totalItems: 4500,
      totalCostCents: 5,
      freeCoveredCents: 0,
      billableCents: 5,
    });

    const evaluateChunkMock = vi
      .fn()
      .mockImplementation(async (chunk: string[], batchId: string) => {
        expect(batchId).toBe("batch_test_123");
        return {
          results: chunk.map((name) => ({ name, price: 10.5 })),
        };
      });

    const finishBatchMock = vi.fn().mockResolvedValue({
      batchId: "batch_test_123",
      totalItems: 4500,
      completedItems: 4500,
      unusedItems: 0,
      refundedCents: 0,
    });

    const storePricesMock = vi.fn().mockResolvedValue({ stored: 4500 });

    const result = await executeBatchEvaluationWorkflow({
      itemNames: items,
      chunkSize: 1500,
      startBatchFn: startBatchMock,
      evaluateChunkFn: evaluateChunkMock,
      finishBatchFn: finishBatchMock,
      storePricesFn: storePricesMock,
    });

    expect(startBatchMock).toHaveBeenCalledTimes(1);
    expect(startBatchMock).toHaveBeenCalledWith(4500);

    // 4,500 items / 1,500 = exactly 3 chunk evaluations
    expect(evaluateChunkMock).toHaveBeenCalledTimes(3);

    expect(finishBatchMock).toHaveBeenCalledWith("batch_test_123", 4500);
    expect(storePricesMock).toHaveBeenCalledTimes(1);

    expect(result.total).toBe(4500);
    expect(result.refund).toBe(0);
    expect(Object.keys(result.prices)).toHaveLength(4500);
  });

  it("should auto-refund unused balance and save partial items when interrupted", async () => {
    const items = Array.from({ length: 4500 }, (_, i) => `Skin Item ${i}`);

    const startBatchMock = vi.fn().mockResolvedValue({
      batchId: "batch_interrupted_456",
      totalItems: 4500,
      totalCostCents: 5,
      freeCoveredCents: 0,
      billableCents: 5,
    });

    let callCount = 0;
    const evaluateChunkMock = vi
      .fn()
      .mockImplementation(async (chunk: string[], batchId: string) => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Simulated network failure on chunk 2");
        }
        return {
          results: chunk.map((name) => ({ name, price: 12.0 })),
        };
      });

    const finishBatchMock = vi.fn().mockResolvedValue({
      batchId: "batch_interrupted_456",
      totalItems: 4500,
      completedItems: 1500,
      unusedItems: 3000,
      refundedCents: 3, // 3 cents refunded for 3,000 unused items
    });

    const storePricesMock = vi.fn().mockResolvedValue({ stored: 1500 });

    await expect(
      executeBatchEvaluationWorkflow({
        itemNames: items,
        chunkSize: 1500,
        startBatchFn: startBatchMock,
        evaluateChunkFn: evaluateChunkMock,
        finishBatchFn: finishBatchMock,
        storePricesFn: storePricesMock,
      }),
    ).rejects.toThrow("Simulated network failure on chunk 2");

    // Guarantee 1: finishBatch was still called in finally with the 1,500 completed items
    expect(finishBatchMock).toHaveBeenCalledWith("batch_interrupted_456", 1500);

    // Guarantee 2: storePrices was still called with the 1,500 items that were paid for
    expect(storePricesMock).toHaveBeenCalledWith(
      expect.objectContaining({ "Skin Item 0": 12.0 }),
    );
  });
});
