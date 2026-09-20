import { create } from 'zustand';
import {
  DealMakerItem,
  CreateDealPayload,
  DEALMAKER_CONSTANTS,
} from '../../shared/types/dealmaker.types';
import toast from 'react-hot-toast';

export type DealMakerFilter = 'all' | 'my-bids' | 'my-auctions' | 'config';

export interface DealMakerStoreState {
  activeAuctions: DealMakerItem[]; // Live deals
  myAuctions: DealMakerItem[]; // My broadcasted deals
  wonAuctions: DealMakerItem[]; // Matched deals
  activeBidAuctions: DealMakerItem[]; // Deals with active offers
  selectedAuction: DealMakerItem | null;
  isLoading: boolean;
  isCreating: boolean;
  isBidding: boolean;
  activeFilter: DealMakerFilter;
  isCreateModalOpen: boolean;
  initialCreateData: Partial<CreateDealPayload> | null;

  setActiveFilter: (filter: DealMakerFilter) => void;
  setSelectedAuction: (deal: DealMakerItem | null) => void;
  openCreateModal: (initialData?: Partial<CreateDealPayload>) => void;
  closeCreateModal: () => void;

  fetchActiveAuctions: () => Promise<void>;
  fetchMyAuctions: () => Promise<void>;
  fetchMyBids: () => Promise<void>;
  fetchPresence: () => Promise<void>;
  refreshAll: () => Promise<void>;
  activeTradersCount: number;

  createAuction: (payload: CreateDealPayload) => Promise<boolean>;
  placeBid: (dealId: string, bidAmount: number, bidderTag?: string) => Promise<boolean>;
  submitListingLink: (dealId: string, listingUrl: string) => Promise<boolean>;
  submitMarketLink: (dealId: string, marketLink: string) => Promise<boolean>;
  submitDealLinks: (
    dealId: string,
    payload: { listingUrl?: string; marketLink?: string },
    loadingMessage: string,
  ) => Promise<boolean>;
}

const getDealMakerAPI = () => {
  if (typeof window !== 'undefined') {
    if (window.electronAPI?.dealmaker) return window.electronAPI.dealmaker;
    if (window.electronAPI?.auction) return window.electronAPI.auction;
  }
  return (
    (globalThis as any)?.window?.electronAPI?.dealmaker ||
    (globalThis as any)?.window?.electronAPI?.auction ||
    null
  );
};

export const useDealMakerStore = create<DealMakerStoreState>((set, get) => ({
  activeAuctions: [],
  myAuctions: [],
  wonAuctions: [],
  activeBidAuctions: [],
  selectedAuction: null,
  isLoading: false,
  isCreating: false,
  isBidding: false,
  activeFilter: 'all',
  activeTradersCount: 1,
  isCreateModalOpen: false,
  initialCreateData: null,

  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setSelectedAuction: (deal) => set({ selectedAuction: deal }),
  openCreateModal: (initialData) =>
    set({
      isCreateModalOpen: true,
      initialCreateData: initialData || null,
    }),
  closeCreateModal: () =>
    set({
      isCreateModalOpen: false,
      initialCreateData: null,
    }),

  fetchActiveAuctions: async () => {
    const api = getDealMakerAPI();
    if (!api) return;
    try {
      const items = await api.getActive();
      set({ activeAuctions: items || [] });
    } catch (err: any) {
      console.error('[DealMakerStore] fetchActiveDeals error:', err);
    }
  },

  fetchMyAuctions: async () => {
    const api = getDealMakerAPI();
    if (!api) return;
    try {
      const fn = api.getMyDeals || api.getMyAuctions;
      const items = await fn();
      set({ myAuctions: items || [] });
    } catch (err: any) {
      console.error('[DealMakerStore] fetchMyDeals error:', err);
    }
  },

  fetchMyBids: async () => {
    const api = getDealMakerAPI();
    if (!api) return;
    try {
      const fn = api.getMyOffers || api.getMyBids;
      const res = await fn();
      set({
        wonAuctions: res?.wonAuctions || [],
        activeBidAuctions: res?.activeBidAuctions || [],
      });
    } catch (err: any) {
      console.error('[DealMakerStore] fetchMyOffers error:', err);
    }
  },

  fetchPresence: async () => {
    const api = getDealMakerAPI();
    if (!api?.getPresence) return;
    try {
      const res = await api.getPresence();
      if (typeof res?.activeTradersCount === 'number') {
        set({ activeTradersCount: Math.max(res.activeTradersCount, 1) });
      }
    } catch (err: any) {
      console.error('[DealMakerStore] fetchPresence error:', err);
    }
  },

  refreshAll: async () => {
    set({ isLoading: true });
    try {
      await Promise.allSettled([
        get().fetchActiveAuctions(),
        get().fetchMyAuctions(),
        get().fetchMyBids(),
        get().fetchPresence(),
      ]);
    } finally {
      set({ isLoading: false });
    }
  },

  createAuction: async (payload: CreateDealPayload) => {
    const api = getDealMakerAPI();
    if (!api) {
      toast.error('DealMaker service is not available');
      return false;
    }
    set({ isCreating: true });
    const sellerFee = (DEALMAKER_CONSTANTS.SELLER_BROADCAST_FEE_CENTS / 100).toFixed(2);
    const toastId = toast.loading(`Broadcasting ${DEALMAKER_CONSTANTS.DURATION_MINUTES}-minute flash deal ($${sellerFee} fee)...`);

    try {
      await api.create(payload);
      toast.success(`Deal broadcasted! ${DEALMAKER_CONSTANTS.DURATION_MINUTES}-minute matchmaking window started.`, { id: toastId });
      await get().refreshAll();
      return true;
    } catch (err: any) {
      console.error('[DealMakerStore] createDeal error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to broadcast deal';
      toast.error(`Broadcast failed: ${msg}`, { id: toastId });
      return false;
    } finally {
      set({ isCreating: false });
    }
  },

  placeBid: async (dealId: string, bidAmount: number, bidderTag?: string) => {
    const api = getDealMakerAPI();
    if (!api) {
      toast.error('DealMaker service is not available');
      return false;
    }
    set({ isBidding: true });
    const offerFee = (DEALMAKER_CONSTANTS.OFFER_FEE_CENTS / 100).toFixed(2);
    const toastId = toast.loading(`Submitting offer of $${bidAmount.toFixed(2)} ($${offerFee} fee)...`);

    try {
      const fn = api.placeOffer || api.placeBid;
      await fn(dealId, { bidAmount, bidderTag });
      toast.success(`Offer submitted at $${bidAmount.toFixed(2)}!`, { id: toastId });
      await get().refreshAll();
      return true;
    } catch (err: any) {
      console.error('[DealMakerStore] placeOffer error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit offer';
      toast.error(`Offer failed: ${msg}`, { id: toastId });
      return false;
    } finally {
      set({ isBidding: false });
    }
  },

  submitListingLink: async (dealId: string, listingUrl: string) => {
    return get().submitDealLinks(dealId, { listingUrl }, 'Attaching marketplace listing link...');
  },

  submitMarketLink: async (dealId: string, marketLink: string) => {
    return get().submitDealLinks(dealId, { marketLink }, 'Sharing your marketplace store link...');
  },

  submitDealLinks: async (
    dealId: string,
    payload: { listingUrl?: string; marketLink?: string },
    loadingMessage: string,
  ) => {
    const api = getDealMakerAPI();
    if (!api) {
      toast.error('DealMaker service is not available');
      return false;
    }

    // Disallow sharing listing links if 0 offers were placed on the deal
    const targetDeal =
      get().myAuctions.find((a) => a.id === dealId) ||
      get().activeAuctions.find((a) => a.id === dealId);
    if (targetDeal && Number(targetDeal.bidsCount || 0) === 0) {
      toast.error('Cannot share link: No offers were placed on this deal');
      return false;
    }

    const toastId = toast.loading(loadingMessage);

    try {
      const apiAny = api as any;
      if (typeof apiAny.submitDealLink === 'function') {
        await apiAny.submitDealLink(dealId, payload);
      } else if (typeof apiAny.submitListingLink === 'function') {
        // Backward-compatibility with preloads that predate market links.
        await apiAny.submitListingLink(
          dealId,
          payload.listingUrl || payload.marketLink || '',
        );
      } else {
        throw new Error('Link submission is not available');
      }
      toast.success('Link posted! Matched buyer has been notified.', { id: toastId });
      await get().refreshAll();
      return true;
    } catch (err: any) {
      console.error('[DealMakerStore] submitDealLinks error:', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit link';
      toast.error(`Link update failed: ${msg}`, { id: toastId });
      return false;
    }
  },
}));

// Backward-compatibility export
export const useAuctionStore = useDealMakerStore;
