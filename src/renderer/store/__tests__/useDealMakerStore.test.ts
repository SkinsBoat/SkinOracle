import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDealMakerStore, useAuctionStore } from '../useDealMakerStore';

describe('useDealMakerStore Modal & State Management', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuctionStore.setState({
      activeAuctions: [],
      myAuctions: [],
      wonAuctions: [],
      activeBidAuctions: [],
      selectedAuction: null,
      isLoading: false,
      isCreating: false,
      isBidding: false,
      activeFilter: 'all',
      isCreateModalOpen: false,
      initialCreateData: null,
    });
  });

  it('starts with isCreateModalOpen as false by default (not rendering overlay)', () => {
    const state = useAuctionStore.getState();
    expect(state.isCreateModalOpen).toBe(false);
    expect(state.initialCreateData).toBeNull();
  });

  it('opens create modal with optional initial data', () => {
    useAuctionStore.getState().openCreateModal({
      marketHashName: 'AK-47 | Redline (Field-Tested)',
      wear: 'FT',
      marketplace: 'csfloat',
      startingPrice: 25.5,
    });

    const state = useAuctionStore.getState();
    expect(state.isCreateModalOpen).toBe(true);
    expect(state.initialCreateData).toEqual({
      marketHashName: 'AK-47 | Redline (Field-Tested)',
      wear: 'FT',
      marketplace: 'csfloat',
      startingPrice: 25.5,
    });
  });

  it('closes create modal and clears initial data', () => {
    useAuctionStore.getState().openCreateModal({
      marketHashName: 'AWP | Asiimov (Field-Tested)',
    });
    expect(useAuctionStore.getState().isCreateModalOpen).toBe(true);

    useAuctionStore.getState().closeCreateModal();
    const state = useAuctionStore.getState();
    expect(state.isCreateModalOpen).toBe(false);
    expect(state.initialCreateData).toBeNull();
  });

  it('blocks submitListingLink when auction has 0 bids', async () => {
    const mockSubmit = vi.fn();
    (globalThis as any).window = {
      electronAPI: {
        auction: {
          submitListingLink: mockSubmit,
        },
      },
    };

    useAuctionStore.setState({
      myAuctions: [
        {
          id: 'auction-no-bids',
          sellerId: 'user-1',
          sellerTag: 'Seller',
          marketHashName: 'AK-47 | Redline (Field-Tested)',
          marketplace: 'csfloat',
          startingPrice: 20,
          bidsCount: 0,
          highestBid: null,
          highestBidderId: null,
          highestBidderTag: null,
          sellerFeeCents: 40,
          status: 'PENDING_LINK' as any,
          timerEndsAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const result = await useAuctionStore
      .getState()
      .submitListingLink('auction-no-bids', 'https://csfloat.com/stall/12345');

    expect(result).toBe(false);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('allows submitListingLink when auction has bids placed', async () => {
    const mockSubmit = vi.fn().mockResolvedValue({ id: 'auction-with-bids' });
    (globalThis as any).window = {
      electronAPI: {
        auction: {
          submitListingLink: mockSubmit,
          getActive: vi.fn().mockResolvedValue([]),
          getMyAuctions: vi.fn().mockResolvedValue([]),
          getMyBids: vi.fn().mockResolvedValue([]),
        },
      },
    };

    useAuctionStore.setState({
      myAuctions: [
        {
          id: 'auction-with-bids',
          sellerId: 'user-1',
          sellerTag: 'Seller',
          marketHashName: 'AK-47 | Redline (Field-Tested)',
          marketplace: 'csfloat',
          startingPrice: 20,
          bidsCount: 2,
          highestBid: 25,
          highestBidderId: 'bidder-1',
          highestBidderTag: 'WinningTrader',
          sellerFeeCents: 40,
          status: 'PENDING_LINK' as any,
          timerEndsAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const result = await useAuctionStore
      .getState()
      .submitListingLink('auction-with-bids', 'https://csfloat.com/stall/12345');

    expect(result).toBe(true);
    expect(mockSubmit).toHaveBeenCalledWith(
      'auction-with-bids',
      'https://csfloat.com/stall/12345',
    );
  });

  it('submits a marketplace store link through submitDealLink', async () => {
    const mockSubmitDealLink = vi.fn().mockResolvedValue({ id: 'deal-m' });
    (globalThis as any).window = {
      electronAPI: {
        dealmaker: {
          submitDealLink: mockSubmitDealLink,
          getActive: vi.fn().mockResolvedValue([]),
          getMyDeals: vi.fn().mockResolvedValue([]),
          getMyOffers: vi
            .fn()
            .mockResolvedValue({ wonAuctions: [], activeBidAuctions: [] }),
          getPresence: vi.fn().mockResolvedValue({ activeTradersCount: 1 }),
        },
      },
    };

    useAuctionStore.setState({
      myAuctions: [{ id: 'deal-m', bidsCount: 3 } as any],
      activeAuctions: [],
    });

    const ok = await useAuctionStore
      .getState()
      .submitMarketLink('deal-m', 'https://csfloat.com/stall/123');

    expect(ok).toBe(true);
    expect(mockSubmitDealLink).toHaveBeenCalledWith('deal-m', {
      marketLink: 'https://csfloat.com/stall/123',
    });
  });
});
