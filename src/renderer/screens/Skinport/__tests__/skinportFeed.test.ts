import { describe, it, expect } from "vitest";
import {
  flushFrozenEvents,
  reduceSkinportFeedEvent,
} from "../hooks/useSkinportEventStream";
import type {
  SkinportSale,
  SkinportStreamEvent,
} from "../../../../shared/types/skinport.types";

const sale = (overrides: Partial<SkinportSale> = {}): SkinportSale =>
  ({
    id: 1,
    saleId: null,
    productId: 5544725,
    assetId: 55034907,
    itemId: 61019,
    appid: 730,
    steamid: "76561198837215063",
    url: "driver-gloves-rezan-the-red-well-worn",
    family: "Rezan the Red",
    name: "Rezan the Red",
    title: "Driver Gloves",
    text: "Well-Worn ★ Extraordinary Gloves",
    marketName: "★ Driver Gloves | Rezan the Red (Well-Worn)",
    marketHashName: "★ Driver Gloves | Rezan the Red (Well-Worn)",
    color: "#8650AC",
    image: "HASH",
    classid: "4142171394",
    assetid: "24958657824",
    lock: null,
    version: "default",
    versionType: "default",
    stackAble: false,
    suggestedPrice: 10004,
    salePrice: 7903,
    currency: "USD",
    saleStatus: "listed",
    saleType: "public",
    category: "Gloves",
    subCategory: "Driver Gloves",
    pattern: 990,
    finish: 10069,
    customName: null,
    wear: 0.3809,
    link: "steam://run",
    type: "★ Extraordinary Gloves",
    exterior: "Well-Worn",
    quality: "★",
    rarity: "Extraordinary",
    rarityColor: "#eb4b4b",
    collection: null,
    stickers: [],
    souvenir: false,
    stattrak: false,
    tags: [],
    ownItem: false,
    ...overrides,
  }) as SkinportSale;

const event = (
  eventType: SkinportStreamEvent["eventType"],
  sales: SkinportSale[],
  receivedAt = 1000,
): SkinportStreamEvent => ({ eventType, receivedAt, sales });

describe("reduceSkinportFeedEvent", () => {
  it("keeps one entry per item+float and counts repeats", () => {
    let state = reduceSkinportFeedEvent({}, event("listed", [sale()]));
    state = reduceSkinportFeedEvent(
      state,
      event("listed", [sale({ id: 2 })], 2000),
    );
    const keys = Object.keys(state);
    expect(keys).toHaveLength(1);
    const entry = state[keys[0]];
    expect(entry.count).toBe(2);
    expect(entry.receivedAt).toBe(2000);
    expect(entry.sale.id).toBe(2);
  });

  it("separates different floats and ignores malformed sales", () => {
    const state = reduceSkinportFeedEvent(
      {},
      event("listed", [sale({ wear: 0.1 }), sale({ wear: 0.2 }), {} as any]),
    );
    expect(Object.keys(state)).toHaveLength(2);
  });

  it("lets a sold event supersede a prior listed state for the same item", () => {
    let state = reduceSkinportFeedEvent({}, event("listed", [sale()]));
    state = reduceSkinportFeedEvent(
      state,
      event("sold", [sale({ saleStatus: "sold" })], 5000),
    );
    const entry = state[Object.keys(state)[0]];
    expect(entry.eventType).toBe("sold");
    expect(entry.sale.saleStatus).toBe("sold");
  });
});

describe("flushFrozenEvents", () => {
  it("merges buffered events using the same dedup semantics", () => {
    const entries = reduceSkinportFeedEvent({}, event("listed", [sale()]));
    const buffered = [
      event("listed", [sale({ id: 2 })], 2000),
      event("listed", [sale({ id: 3 })], 3000),
    ];

    const merged = flushFrozenEvents(entries, buffered);

    const keys = Object.keys(merged);
    expect(keys).toHaveLength(1);
    expect(merged[keys[0]].count).toBe(3);
    expect(merged[keys[0]].receivedAt).toBe(3000);
  });

  it("is a no-op for an empty buffer", () => {
    const entries = reduceSkinportFeedEvent({}, event("listed", [sale()]));
    expect(flushFrozenEvents(entries, [])).toEqual(entries);
  });

  it("adds newly seen identities on flush", () => {
    const entries = reduceSkinportFeedEvent({}, event("listed", [sale()]));
    const merged = flushFrozenEvents(entries, [
      event("listed", [sale({ id: 9, wear: 0.5 })], 4000),
    ]);
    expect(Object.keys(merged)).toHaveLength(2);
  });
});
