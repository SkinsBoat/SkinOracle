import { describe, it, expect } from 'vitest';
import { AuctionItem } from '../../../../shared/types/auction.types';
import {
  filterAuctions,
  countAuctionsWithinCeiling,
  isAuctionWithinCeiling,
  getAuctionEffectivePrice,
  isAnyFilterActive,
  DEFAULT_AUCTION_FILTERS,
  AuctionFloorFilters,
} from '../utils/dealFilterUtils';

const mockAuctions: AuctionItem[] = [
  {
    id: 'auc-1',
    sellerId: 'user-1',
    marketHashName: 'AK-47 | Redline (Field-Tested)',
    marketplace: 'csfloat',
    startingPrice: 20.0,
    highestBid: 22.0,
    highestBidderId: 'bidder-1',
    highestBidderTag: 'TraderA',
    bidsCount: 2,
    sellerFeeCents: 40,
    status: 'ACTIVE',
    timerEndsAt: new Date(Date.now() + 600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'auc-2',
    sellerId: 'user-2',
    marketHashName: 'AWP | Asiimov (Field-Tested)',
    marketplace: 'dmarket',
    startingPrice: 90.0,
    highestBid: null, // No bids yet, effective price = startingPrice = 90.0
    highestBidderId: null,
    highestBidderTag: null,
    bidsCount: 0,
    sellerFeeCents: 40,
    status: 'ACTIVE',
    timerEndsAt: new Date(Date.now() + 600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'auc-3',
    sellerId: 'user-3',
    marketHashName: 'M4A4 | The Emperor (Minimal Wear)',
    marketplace: 'csfloat',
    startingPrice: 45.0,
    highestBid: 55.0,
    highestBidderId: 'bidder-2',
    highestBidderTag: 'TraderB',
    bidsCount: 3,
    sellerFeeCents: 40,
    status: 'ACTIVE',
    timerEndsAt: new Date(Date.now() + 600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'auc-4',
    sellerId: 'user-4',
    marketHashName: 'Desert Eagle | Printstream (Factory New)',
    marketplace: 'dmarket',
    startingPrice: 120.0,
    highestBid: 130.0,
    highestBidderId: 'bidder-3',
    highestBidderTag: 'TraderC',
    bidsCount: 1,
    sellerFeeCents: 40,
    status: 'ACTIVE',
    timerEndsAt: new Date(Date.now() + 600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockCeilings: Record<string, number> = {
  'AK-47 | Redline (Field-Tested)': 25.0, // currentPrice = 22.0 <= 25.0 (WITHIN CEILING)
  'AWP | Asiimov (Field-Tested)': 90.0, // currentPrice = 90.0 <= 90.0 (EXACT MATCH CEILING)
  'M4A4 | The Emperor (Minimal Wear)': 50.0, // currentPrice = 55.0 > 50.0 (OVER CEILING)
  // 'Desert Eagle | Printstream (Factory New)' is NOT in ceilings (NO CEILING)
};

describe('auctionFilterUtils', () => {
  describe('getAuctionEffectivePrice', () => {
    it('returns highestBid when present', () => {
      expect(getAuctionEffectivePrice(mockAuctions[0])).toBe(22.0);
    });

    it('returns startingPrice when highestBid is null', () => {
      expect(getAuctionEffectivePrice(mockAuctions[1])).toBe(90.0);
    });
  });

  describe('isAuctionWithinCeiling', () => {
    it('returns true when current price is below calculated ceiling', () => {
      expect(isAuctionWithinCeiling(mockAuctions[0], mockCeilings)).toBe(true);
    });

    it('returns true when current price exactly matches calculated ceiling', () => {
      expect(isAuctionWithinCeiling(mockAuctions[1], mockCeilings)).toBe(true);
    });

    it('returns false when current price exceeds calculated ceiling', () => {
      expect(isAuctionWithinCeiling(mockAuctions[2], mockCeilings)).toBe(false);
    });

    it('returns false when skin has no calculated ceiling in oracle cache', () => {
      expect(isAuctionWithinCeiling(mockAuctions[3], mockCeilings)).toBe(false);
    });
  });

  describe('countAuctionsWithinCeiling', () => {
    it('counts only items at or below ceiling', () => {
      const count = countAuctionsWithinCeiling(mockAuctions, mockCeilings);
      expect(count).toBe(2); // auc-1 (22 <= 25) and auc-2 (90 <= 90)
    });
  });

  describe('isAnyFilterActive', () => {
    it('returns false for default filters', () => {
      expect(isAnyFilterActive(DEFAULT_AUCTION_FILTERS)).toBe(false);
    });

    it('returns true when onlyBelowCeiling is true', () => {
      expect(
        isAnyFilterActive({ ...DEFAULT_AUCTION_FILTERS, onlyBelowCeiling: true }),
      ).toBe(true);
    });

    it('returns true when marketFilter is not all', () => {
      expect(
        isAnyFilterActive({ ...DEFAULT_AUCTION_FILTERS, marketFilter: 'csfloat' }),
      ).toBe(true);
    });

    it('returns true when price range or search is set', () => {
      expect(
        isAnyFilterActive({ ...DEFAULT_AUCTION_FILTERS, minPrice: '10' }),
      ).toBe(true);
      expect(
        isAnyFilterActive({ ...DEFAULT_AUCTION_FILTERS, maxPrice: '100' }),
      ).toBe(true);
      expect(
        isAnyFilterActive({ ...DEFAULT_AUCTION_FILTERS, searchQuery: 'ak' }),
      ).toBe(true);
    });
  });

  describe('filterAuctions', () => {
    it('returns all auctions when default filters are active', () => {
      const result = filterAuctions(mockAuctions, mockCeilings, DEFAULT_AUCTION_FILTERS);
      expect(result).toHaveLength(4);
    });

    it('filters by <= Buy Ceiling only', () => {
      const filters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        onlyBelowCeiling: true,
      };
      const result = filterAuctions(mockAuctions, mockCeilings, filters);
      expect(result.map((a) => a.id)).toEqual(['auc-1', 'auc-2']);
    });

    it('filters by marketplace', () => {
      const csfloatFilters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        marketFilter: 'csfloat',
      };
      const csfloatResults = filterAuctions(mockAuctions, mockCeilings, csfloatFilters);
      expect(csfloatResults.map((a) => a.id)).toEqual(['auc-1', 'auc-3']);

      const dmarketFilters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        marketFilter: 'dmarket',
      };
      const dmarketResults = filterAuctions(mockAuctions, mockCeilings, dmarketFilters);
      expect(dmarketResults.map((a) => a.id)).toEqual(['auc-2', 'auc-4']);
    });

    it('scalably matches canonical marketplace aliases (e.g. csgofloat -> csfloat, d_market -> dmarket)', () => {
      const aliasedAuctions: AuctionItem[] = [
        {
          ...mockAuctions[0],
          id: 'auc-alias-1',
          marketplace: 'csgofloat', // Raw Skinsnipe alias for CSFloat
        },
        {
          ...mockAuctions[1],
          id: 'auc-alias-2',
          marketplace: 'd_market', // Raw alias for DMarket
        },
      ];

      // Filter by canonical 'csfloat'
      const csfloatRes = filterAuctions(aliasedAuctions, mockCeilings, {
        ...DEFAULT_AUCTION_FILTERS,
        marketFilter: 'csfloat',
      });
      expect(csfloatRes.map((a) => a.id)).toEqual(['auc-alias-1']);

      // Filter by canonical 'dmarket'
      const dmarketRes = filterAuctions(aliasedAuctions, mockCeilings, {
        ...DEFAULT_AUCTION_FILTERS,
        marketFilter: 'dmarket',
      });
      expect(dmarketRes.map((a) => a.id)).toEqual(['auc-alias-2']);
    });

    it('filters by Buy Ceiling range (min and max)', () => {
      // Min ceiling filter (auc-4 has no ceiling and is excluded)
      const minFilters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        minPrice: '50',
      };
      const minResults = filterAuctions(mockAuctions, mockCeilings, minFilters);
      expect(minResults.map((a) => a.id)).toEqual(['auc-2', 'auc-3']);

      // Max ceiling filter
      const maxFilters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        maxPrice: '80',
      };
      const maxResults = filterAuctions(mockAuctions, mockCeilings, maxFilters);
      expect(maxResults.map((a) => a.id)).toEqual(['auc-1', 'auc-3']);

      // Range filter: $50 - $100 of Buy Ceiling
      const rangeFilters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        minPrice: '50',
        maxPrice: '100',
      };
      const rangeResults = filterAuctions(mockAuctions, mockCeilings, rangeFilters);
      expect(rangeResults.map((a) => a.id)).toEqual(['auc-2', 'auc-3']);
    });

    it('excludes deals without a calculated Buy Ceiling when a range is active', () => {
      // auc-4 has no ceiling entry and a high starting price; it must not leak in.
      const filters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        minPrice: '100',
        maxPrice: '200',
      };
      const results = filterAuctions(mockAuctions, mockCeilings, filters);
      expect(results.map((a) => a.id)).not.toContain('auc-4');
      expect(results).toHaveLength(0);
    });

    it('filters by the ceiling, not the deal offer price', () => {
      // auc-2 offer is 90.0 but its ceiling is 90.0; a range of 85-95 matches
      // on the ceiling while auc-4 (offer 120, no ceiling) is excluded.
      const filters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        minPrice: '85',
        maxPrice: '95',
      };
      const results = filterAuctions(mockAuctions, mockCeilings, filters);
      expect(results.map((a) => a.id)).toEqual(['auc-2']);
    });

    it('filters by search query', () => {
      const searchFilters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        searchQuery: 'asiimov',
      };
      const searchResults = filterAuctions(mockAuctions, mockCeilings, searchFilters);
      expect(searchResults.map((a) => a.id)).toEqual(['auc-2']);
    });

    it('combines <= Buy Ceiling, marketplace, and price range filters simultaneously', () => {
      const combinedFilters: AuctionFloorFilters = {
        onlyBelowCeiling: true,
        marketFilter: 'csfloat',
        minPrice: '10',
        maxPrice: '30',
        searchQuery: '',
      };
      const result = filterAuctions(mockAuctions, mockCeilings, combinedFilters);
      // auc-1 is csfloat, price 22 (between 10 and 30), and 22 <= 25 (below ceiling)
      expect(result.map((a) => a.id)).toEqual(['auc-1']);
    });

    it('returns empty array when no auctions match criteria', () => {
      const impossibleFilters: AuctionFloorFilters = {
        ...DEFAULT_AUCTION_FILTERS,
        minPrice: '500',
      };
      const result = filterAuctions(mockAuctions, mockCeilings, impossibleFilters);
      expect(result).toHaveLength(0);
    });
  });
});
