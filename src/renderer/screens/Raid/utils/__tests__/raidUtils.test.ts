import { describe, it, expect } from 'vitest';
import {
  auditStock,
  buildRaidOfferPayload,
  filterRaidRows,
  normalizeCsFloatStall,
  normalizeDmarketStore,
  normalizeSkinportShop,
  normalizeSteamInventory,
  parseStorefrontUrl,
  sortRaidRows,
} from '../raidUtils';
import { DEFAULT_RAID_FILTERS } from '../../../../../shared/types/raid.types';
import type {
  SkinportShopApiItem,
  SkinportShopApiResponse,
} from '../../../../../shared/types/skinport.types';
import type { RaidStockItem } from '../../../../../shared/types/raid.types';
import type { SteamInventoryResponse } from '../../../../../shared/types/steam.types';

function makeSkinportItem(
  overrides: Partial<SkinportShopApiItem> = {},
): SkinportShopApiItem {
  return {
    saleId: 1,
    shortId: 'ABC',
    productId: 10,
    assetId: 20,
    itemId: 30,
    url: 'sten-mp9-ruby-poison-dart-factory-new',
    marketName: 'StatTrak™ MP9 | Ruby Poison Dart (Factory New)',
    marketHashName: 'StatTrak™ MP9 | Ruby Poison Dart (Factory New)',
    name: 'Ruby Poison Dart',
    title: 'StatTrak™ MP9',
    exterior: 'Factory New',
    quality: 'StatTrak™',
    rarity: 'Restricted',
    rarityColor: '#8847ff',
    collection: 'The Falchion Collection',
    wear: 0.067,
    souvenir: false,
    stattrak: true,
    suggestedPrice: 649,
    referencePrice: 773,
    salePrice: 691,
    currency: 'USD',
    image: 'img-hash',
    link: 'steam://run/730//+csgo_econ_action_preview%20',
    ...overrides,
  };
}

describe('raidUtils', () => {
  describe('parseStorefrontUrl', () => {
    it('parses a full Skinport shop URL', () => {
      const result = parseStorefrontUrl('https://skinport.com/shop/example-shop');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('skinport');
      expect(result.ref.handle).toBe('example-shop');
      expect(result.ref.scanSupported).toBe(true);
    });

    it('parses a scheme-less Skinport shop URL', () => {
      const result = parseStorefrontUrl('skinport.com/shop/example-shop');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.handle).toBe('example-shop');
    });

    it('accepts a bare Skinport shop slug', () => {
      const result = parseStorefrontUrl('example-shop');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('skinport');
      expect(result.ref.handle).toBe('example-shop');
    });

    it('rejects a Skinport profile page with an actionable error', () => {
      const result = parseStorefrontUrl(
        'https://skinport.com/user/76561190000000002',
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(/shop link/i);
    });

    it('parses a CSFloat stall URL to a live SteamID64 ref', () => {
      const result = parseStorefrontUrl(
        'https://csfloat.com/stall/76561190000000001',
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('csfloat');
      expect(result.ref.handle).toBe('76561190000000001');
      expect(result.ref.scanSupported).toBe(true);
    });

    it('accepts a bare SteamID64 as a Steam inventory', () => {
      const result = parseStorefrontUrl('76561190000000001');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('steam');
      expect(result.ref.handle).toBe('76561190000000001');
      expect(result.ref.scanSupported).toBe(true);
    });

    it('parses a Steam inventory URL to a live SteamID64 ref', () => {
      const result = parseStorefrontUrl(
        'https://steamcommunity.com/inventory/76561199097176449/730/2',
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('steam');
      expect(result.ref.handle).toBe('76561199097176449');
      expect(result.ref.scanSupported).toBe(true);
    });

    it('accepts an explicit steam: SteamID64 prefix', () => {
      const result = parseStorefrontUrl('steam:76561199097176449');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('steam');
      expect(result.ref.handle).toBe('76561199097176449');
    });

    it('parses a DMarket store link via its saga address', () => {      const addr = '0x1111111111111111111111111111111111111111';
      const result = parseStorefrontUrl(
        `https://dmarket.com/ingame-items/item-list/csgo-skins?user=${addr}`,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('dmarket');
      expect(result.ref.handle).toBe(addr);
      expect(result.ref.scanSupported).toBe(true);
    });

    it('accepts a bare DMarket saga address', () => {
      const addr = '0x1111111111111111111111111111111111111111';
      const result = parseStorefrontUrl(addr);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('dmarket');
      expect(result.ref.handle).toBe(addr);
    });

    it('recognizes CS.MONEY as not-yet-scannable', () => {
      const result = parseStorefrontUrl('https://cs.money/market/12345');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.ref.marketplace).toBe('csmoney');
      expect(result.ref.scanSupported).toBe(false);
    });

    it('rejects a DMarket link without a seller address', () => {
      const result = parseStorefrontUrl('https://dmarket.com/ingame-items/item-list/csgo-skins');
      expect(result.ok).toBe(false);
    });

    it('rejects unknown hosts and empty input', () => {
      expect(parseStorefrontUrl('https://example.com/shop/foo').ok).toBe(false);
      expect(parseStorefrontUrl('   ').ok).toBe(false);
    });
  });

  describe('normalizeSkinportShop', () => {
    it('converts USD cents to dollars and builds seller identity', () => {
      const res: SkinportShopApiResponse = {
        success: true,
        message: null,
        shopName: 'Test Shop',
        shopLink: 'example-shop',
        shopSteamId: '76561190000000002',
        filter: { total: 51 },
        items: [
          makeSkinportItem({ salePrice: 691, referencePrice: 773 }),
          makeSkinportItem({
            saleId: 2,
            marketHashName: 'SCAR-20 | Cardiac (Minimal Wear)',
            salePrice: 1096,
            referencePrice: 1121,
          }),
        ],
      };

      const { seller, items } = normalizeSkinportShop(res);
      expect(seller.name).toBe('Test Shop');
      expect(seller.id).toBe('example-shop');
      expect(seller.reportedTotal).toBe(51);
      expect(items).toHaveLength(2);
      expect(items[0].price).toBeCloseTo(6.91, 5);
      expect(items[0].referencePrice).toBeCloseTo(7.73, 5);
      // Item links are resolved by the shared market URL generator, not here.
      expect(items[0].listingUrl).toBeUndefined();
    });

    it('drops items missing a market hash name or price', () => {
      const res: SkinportShopApiResponse = {
        success: true,
        message: null,
        items: [
          makeSkinportItem({ salePrice: 0 }),
          makeSkinportItem({ saleId: 3, marketHashName: '' }),
          makeSkinportItem({ saleId: 4, salePrice: 500 }),
        ],
      };
      const { items } = normalizeSkinportShop(res);
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('4');
    });
  });

  describe('normalizeCsFloatStall', () => {
    it('keeps buy-now listings, drops auctions, and carries the offer price', () => {
      const { seller, items } = normalizeCsFloatStall({
        data: [
          {
            id: '1030180712780795232',
            price: 8256,
            type: 'buy_now',
            min_offer_price: 7596,
            reference: { base_price: 372483, predicted_price: 383129, quantity: 16 },
            seller: { steam_id: '76561190000000001', username: 'Test Seller' },
            item: {
              market_hash_name: '★ StatTrak™ Butterfly Knife | Doppler (Factory New)',
              icon_url: 'img-hash',
              float_value: 0.0083,
              wear_name: 'Factory New',
              rarity_name: 'Covert',
              is_stattrak: true,
              is_souvenir: false,
            },
          },
          {
            id: 'auction-1',
            price: 127500,
            type: 'auction',
            item: { market_hash_name: 'M4A4 | Howl (Field-Tested)' },
          },
          {
            id: 'skip-me',
            price: 0,
            type: 'buy_now',
            item: { market_hash_name: 'Cheap Item' },
          },
        ],
      });

      expect(seller.steamId).toBe('76561190000000001');
      expect(seller.name).toBe('Test Seller');
      expect(seller.url).toBe('https://csfloat.com/stall/76561190000000001');
      // Auction + zero-priced entries are excluded.
      expect(items).toHaveLength(1);
      expect(items[0].marketplace).toBe('csfloat');
      expect(items[0].price).toBeCloseTo(82.56, 5);
      expect(items[0].referencePrice).toBeCloseTo(3831.29, 5);
      expect(items[0].minOfferPrice).toBeCloseTo(75.96, 5);
      expect(items[0].imageUrl).toContain('/img-hash');
      expect(items[0].stattrak).toBe(true);
    });
  });

  describe('normalizeDmarketStore', () => {
    it('converts priceCents to dollars and derives item flags', () => {
      const addr = '0x1111111111111111111111111111111111111111';
      const { seller, items } = normalizeDmarketStore(
        {
          offers: [
            {
              offerId: 'o1',
              priceCents: 200,
              recommendedPrice: 83,
              title: 'Glock-18 | Winterized (Factory New)',
              image: 'https://cdn.example/img.png',
              cs2: { exterior: 'factory new', quality: 'mil-spec grade', floatValue: '0.0372' },
            },
            {
              offerId: 'o2',
              priceCents: 1500,
              title: 'StatTrak™ AK-47 | Redline (Field-Tested)',
            },
          ],
          total: { items: 2 },
        },
        addr,
      );

      expect(seller.id).toBe(addr);
      expect(seller.reportedTotal).toBe(2);
      expect(items).toHaveLength(2);
      expect(items[0].marketplace).toBe('dmarket');
      expect(items[0].price).toBeCloseTo(2, 5);
      expect(items[0].floatValue).toBeCloseTo(0.0372, 5);
      expect(items[1].stattrak).toBe(true);
      expect(items[1].price).toBeCloseTo(15, 5);
    });

    it('keeps duplicate DMarket listings with distinct fallback ids', () => {
      const { items } = normalizeDmarketStore(
        {
          offers: [
            {
              priceCents: 500,
              title: 'AK-47 | Redline (Field-Tested)',
            },
            {
              priceCents: 500,
              title: 'AK-47 | Redline (Field-Tested)',
            },
          ],
        },
        '0x2222222222222222222222222222222222222222',
      );

      expect(items).toHaveLength(2);
      expect(items[0].id).not.toBe(items[1].id);
      expect(items[0].marketHashName).toBe(items[1].marketHashName);
    });
  });

  describe('normalizeSteamInventory', () => {
    const steamId = '76561199097176449';
    const response: SteamInventoryResponse = {
      success: 1,
      total_inventory_count: 3,
      assets: [
        {
          appid: 730,
          contextid: '2',
          assetid: 'a1',
          classid: 'c1',
          instanceid: '0',
          amount: '1',
        },
        {
          appid: 730,
          contextid: '2',
          assetid: 'a2',
          classid: 'c2',
          instanceid: '0',
          amount: '1',
        },
        {
          appid: 730,
          contextid: '2',
          assetid: 'a3',
          classid: 'c1',
          instanceid: '0',
          amount: '1',
        },
      ],
      descriptions: [
        {
          appid: 730,
          classid: 'c1',
          instanceid: '0',
          icon_url: 'icon1',
          market_hash_name: 'AK-47 | Redline (Field-Tested)',
          type: 'Mil-Spec Grade Rifle',
          name_color: '4b69ff',
          tradable: 1,
          tags: [
            {
              category: 'Exterior',
              internal_name: 'WearCategory2',
              localized_category_name: 'Exterior',
              localized_tag_name: 'Field-Tested',
            },
            {
              category: 'Rarity',
              internal_name: 'Rarity_Rare_Weapon',
              localized_category_name: 'Quality',
              localized_tag_name: 'Mil-Spec Grade',
              color: '4b69ff',
            },
            {
              category: 'ItemSet',
              internal_name: 'set_community_32',
              localized_category_name: 'Collection',
              localized_tag_name: 'The Revolution Collection',
            },
          ],
          actions: [{ link: 'steam://inspect', name: 'Inspect in Game...' }],
        },
        {
          appid: 730,
          classid: 'c2',
          instanceid: '0',
          icon_url: 'icon2',
          market_hash_name: 'Non Tradable Item',
          tradable: 0,
        },
      ],
      asset_properties: [
        {
          appid: 730,
          contextid: '2',
          assetid: 'a1',
          asset_properties: [
            { propertyid: 2, float_value: '0.1234', name: 'Wear Rating' },
          ],
        },
      ],
    };

    it('joins assets to descriptions, filters non-tradables, and reads wear', () => {
      const { seller, items } = normalizeSteamInventory(response, steamId);

      expect(seller.marketplace).toBe('steam');
      expect(seller.id).toBe(steamId);
      expect(items).toHaveLength(2);
      expect(items.every((item) => item.marketplace === 'steam')).toBe(true);
      expect(items.every((item) => item.priceUnavailable === true)).toBe(true);
      expect(items.every((item) => item.price === 0)).toBe(true);
      expect(items[0].exterior).toBe('Field-Tested');
      expect(items[0].collection).toBe('The Revolution Collection');
      expect(items[0].rarity).toBe('Mil-Spec Grade');
      expect(items[0].floatValue).toBeCloseTo(0.1234, 6);
      expect(items[0].inspectUrl).toBe('steam://inspect');
      expect(items[0].imageUrl).toContain('/icon1');
    });
  });

  describe('auditStock', () => {
    const items: RaidStockItem[] = [
      {
        id: 'a',
        marketplace: 'skinport',
        marketHashName: 'Item A',
        price: 5,
      },
      {
        id: 'b',
        marketplace: 'skinport',
        marketHashName: 'Item B',
        price: 20,
      },
      {
        id: 'c',
        marketplace: 'skinport',
        marketHashName: 'Item C',
        price: 3,
      },
    ];
    const ceilings = { 'Item A': 10, 'Item B': 15 };

    it('classifies rows and computes the summary', () => {
      const { rows, summary } = auditStock(items, ceilings);

      const byId = Object.fromEntries(rows.map((r) => [r.item.id, r]));
      expect(byId.a.status).toBe('raid');
      expect(byId.a.spread).toBeCloseTo(5, 5);
      expect(byId.a.profitPercent).toBeCloseTo(50, 5);
      expect(byId.b.status).toBe('over-ceiling');
      expect(byId.b.spread).toBeCloseTo(-5, 5);
      expect(byId.c.status).toBe('no-ceiling');

      expect(summary.totalItems).toBe(3);
      expect(summary.valuedItems).toBe(2);
      expect(summary.raidCount).toBe(1);
      expect(summary.totalStockValue).toBeCloseTo(28, 5);
      expect(summary.raidValue).toBeCloseTo(5, 5);
      expect(summary.potentialProfit).toBeCloseTo(5, 5);
    });

    it('treats unpriced Steam inventory as an offer at the ceiling', () => {
      const inventory: RaidStockItem[] = [
        {
          id: 'steam:a1',
          marketplace: 'steam',
          marketHashName: 'Item A',
          price: 0,
          priceUnavailable: true,
        },
      ];
      const { rows, summary } = auditStock(inventory, { 'Item A': 10 });

      expect(rows[0].status).toBe('inventory');
      expect(rows[0].spread).toBe(0);
      expect(summary.inventoryCount).toBe(1);
      expect(summary.valuedItems).toBe(1);
      expect(summary.raidCount).toBe(0);

      const offer = buildRaidOfferPayload(
        {
          marketplace: 'steam',
          id: '76561199097176449',
          name: 'Steam Inventory',
          url: 'https://steamcommunity.com/profiles/76561199097176449/inventory',
        },
        rows,
      );
      expect(offer.rows[0].listingPrice).toBe(10);
      expect(offer.rows[0].difference).toBe(0);
    });

    it('flags offer-eligible rows and counts accepted offers ≤ ceiling', () => {
      const offerItems: RaidStockItem[] = [
        // Offer 9.00 <= ceiling 10 → eligible.
        { id: 'a', marketplace: 'csfloat', marketHashName: 'Item A', price: 12, minOfferPrice: 9 },
        // Offer 9.00 > ceiling 5 → not eligible.
        { id: 'b', marketplace: 'csfloat', marketHashName: 'Item B', price: 20, minOfferPrice: 9 },
        // No published offer.
        { id: 'c', marketplace: 'csfloat', marketHashName: 'Item C', price: 3 },
      ];
      const { rows, summary } = auditStock(offerItems, {
        'Item A': 10,
        'Item B': 5,
      });

      const byId = Object.fromEntries(rows.map((r) => [r.item.id, r]));
      expect(byId.a.offerEligible).toBe(true);
      expect(byId.b.offerEligible).toBe(false);
      expect(byId.c.offerEligible).toBe(false);
      // Only A accepts an offer at or below its ceiling.
      expect(summary.offerCount).toBe(1);
    });
  });

  describe('filterRaidRows', () => {
    const { rows } = auditStock(
      [
        { id: 'a', marketplace: 'skinport', marketHashName: 'Item A', price: 5 },
        {
          id: 'b',
          marketplace: 'skinport',
          marketHashName: 'Item B',
          price: 20,
        },
        { id: 'c', marketplace: 'skinport', marketHashName: 'Nova C', price: 3 },
      ],
      { 'Item A': 10, 'Item B': 15, 'Nova C': 3.5 },
    );

    it('shows the full stock under the default preset (raid zone off)', () => {
      const filtered = filterRaidRows(rows, {
        ...DEFAULT_RAID_FILTERS,
      });
      expect(filtered.map((r) => r.item.id).sort()).toEqual(['a', 'b', 'c']);
    });

    it('restricts to the raid zone when onlyRaids is on', () => {
      const filtered = filterRaidRows(rows, {
        ...DEFAULT_RAID_FILTERS,
        onlyRaids: true,
      });
      expect(filtered.map((r) => r.item.id).sort()).toEqual(['a', 'c']);
    });

    it('applies skin-name search', () => {
      const filtered = filterRaidRows(rows, {
        ...DEFAULT_RAID_FILTERS,
        searchQuery: 'item',
      });
      expect(filtered.map((r) => r.item.id)).toEqual(['a', 'b']);
    });

    it('drops unvalued stock under the default preset', () => {
      const { rows: stockRows } = auditStock(
        [
          { id: 'valued', marketplace: 'skinport', marketHashName: 'Valued', price: 5 },
          { id: 'unvalued', marketplace: 'skinport', marketHashName: 'Unvalued', price: 4 },
        ],
        { Valued: 10 },
      );
      const filtered = filterRaidRows(stockRows, DEFAULT_RAID_FILTERS);
      expect(filtered.map((r) => r.item.id)).toEqual(['valued']);
    });
  });

  describe('sortRaidRows', () => {
    it('sorts by spread descending and sinks unknown rows', () => {
      const { rows } = auditStock(
        [
          {
            id: 'small',
            marketplace: 'skinport',
            marketHashName: 'A',
            price: 8,
          },
          {
            id: 'big',
            marketplace: 'skinport',
            marketHashName: 'B',
            price: 2,
          },
          {
            id: 'none',
            marketplace: 'skinport',
            marketHashName: 'C',
            price: 9,
          },
        ],
        { A: 10, B: 10 },
      );
      const sorted = sortRaidRows(rows, 'spread');
      expect(sorted.map((r) => r.item.id)).toEqual(['big', 'small', 'none']);
    });

    it('is deterministic (returning to a sort yields the same order)', () => {
      const { rows } = auditStock(
        [
          { id: 'x', marketplace: 'skinport', marketHashName: 'Zeta', price: 5 },
          { id: 'y', marketplace: 'skinport', marketHashName: 'Alpha', price: 5 },
          { id: 'z', marketplace: 'skinport', marketHashName: 'Mid', price: 5 },
        ],
        { Zeta: 10, Alpha: 10, Mid: 10 },
      );

      const firstSpread = sortRaidRows(rows, 'spread').map((r) => r.item.id);
      // Round-trip through another sort and back.
      const backToSpread = sortRaidRows(
        sortRaidRows(rows, 'price'),
        'spread',
      ).map((r) => r.item.id);

      expect(backToSpread).toEqual(firstSpread);
      // Ties fall back to market hash name order.
      expect(firstSpread).toEqual(['y', 'z', 'x']);
    });
  });

  describe('buildRaidOfferPayload', () => {
    it('offers the buy ceiling for all matched items, including above-ceiling ones', () => {
      const { rows } = auditStock(
        [
          { id: 'a', marketplace: 'skinport', marketHashName: 'A', price: 5 },
          { id: 'b', marketplace: 'skinport', marketHashName: 'B', price: 20 },
          { id: 'c', marketplace: 'skinport', marketHashName: 'C', price: 8 },
          { id: 'd', marketplace: 'skinport', marketHashName: 'D', price: 3 },
        ],
        { A: 10, B: 15, C: 9 },
      );

      const offer = buildRaidOfferPayload(
        {
          marketplace: 'skinport',
          id: 'shop',
          name: 'Seller',
          url: 'https://skinport.com/shop/shop',
        },
        rows,
        new Date('2026-10-17T00:00:00Z'),
      );

      // D has no ceiling and is excluded. A/C are below, B is above — all
      // matched items are offerd, below-ceiling first.
      expect(offer.rows.map((r) => r.marketHashName)).toEqual(['A', 'C', 'B']);

      const b = offer.rows.find((r) => r.marketHashName === 'B')!;
      expect(b.listingPrice).toBeCloseTo(20, 5);
      expect(b.buyCeiling).toBeCloseTo(15, 5);
      expect(b.difference).toBeCloseTo(-5, 5);
      expect(b.belowCeiling).toBe(false);

      expect(offer.summary.itemCount).toBe(3);
      expect(offer.summary.ceilingTotal).toBeCloseTo(34, 5);
      expect(offer.summary.listingTotal).toBeCloseTo(33, 5);
      expect(offer.summary.belowCeilingCount).toBe(2);
      expect(offer.generatedAt).toBe('2026-10-17T00:00:00.000Z');
      expect(offer.seller.name).toBe('Seller');
    });

    it('returns an empty offer when nothing matched a ceiling', () => {
      const { rows } = auditStock(
        [{ id: 'b', marketplace: 'skinport', marketHashName: 'B', price: 20 }],
        {},
      );
      const offer = buildRaidOfferPayload(
        { marketplace: 'skinport', id: 's', name: 'S', url: 'u' },
        rows,
      );
      expect(offer.rows).toHaveLength(0);
      expect(offer.summary.itemCount).toBe(0);
      expect(offer.summary.ceilingTotal).toBe(0);
    });
  });
});
