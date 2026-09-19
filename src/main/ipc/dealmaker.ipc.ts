import { ipcMain, shell } from 'electron';
import { saasAxios } from '../services/saasAxios';
import {
  DEALMAKER_API,
  DEALMAKER_ACTIVE,
  DEALMAKER_BY_ID,
  DEALMAKER_OFFER,
  DEALMAKER_LISTING_LINK,
  DEALMAKER_MY_DEALS,
  DEALMAKER_MY_OFFERS,
  DEALMAKER_PRESENCE,
} from '../constants/apiUrls';
import { CreateDealPayload, PlaceOfferPayload } from '../../shared/types/dealmaker.types';

export function setupDealMakerIPC() {
  const handleCreate = async (_: any, payload: CreateDealPayload) => {
    if (!payload?.marketHashName?.trim()) {
      throw new Error('Market hash name is required');
    }
    const cleanPayload = {
      ...payload,
      marketHashName: payload.marketHashName.trim(),
      startingPrice:
        payload.startingPrice !== undefined ? Math.round(Number(payload.startingPrice) * 100) / 100 : 0,
    };
    const res = await saasAxios.post(DEALMAKER_API, cleanPayload);
    return res.data;
  };

  const handleGetActive = async () => {
    const res = await saasAxios.get(DEALMAKER_ACTIVE);
    return res.data;
  };

  const handleGetById = async (_: any, dealId: string) => {
    if (!dealId?.trim()) throw new Error('Deal ID is required');
    const res = await saasAxios.get(DEALMAKER_BY_ID(dealId.trim()));
    return res.data;
  };

  const handlePlaceOffer = async (_: any, dealId: string, payload: PlaceOfferPayload) => {
    if (!dealId?.trim()) throw new Error('Deal ID is required');
    const cleanAmount = Math.round(Number(payload?.bidAmount) * 100) / 100;
    if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
      throw new Error('Offer amount must be a positive number');
    }
    const res = await saasAxios.post(DEALMAKER_OFFER(dealId.trim()), {
      ...payload,
      bidAmount: cleanAmount,
    });
    return res.data;
  };

  const handleSubmitListingLink = async (_: any, dealId: string, listingUrl: string) => {
    if (!dealId?.trim()) throw new Error('Deal ID is required');
    const cleanUrl = listingUrl?.trim();
    if (!cleanUrl || !cleanUrl.startsWith('https://')) {
      throw new Error('Listing URL must be a valid secure HTTPS link');
    }
    const res = await saasAxios.post(DEALMAKER_LISTING_LINK(dealId.trim()), { listingUrl: cleanUrl });
    return res.data;
  };

  const handleGetMyDeals = async () => {
    const res = await saasAxios.get(DEALMAKER_MY_DEALS);
    return res.data;
  };

  const handleGetMyOffers = async () => {
    const res = await saasAxios.get(DEALMAKER_MY_OFFERS);
    return res.data;
  };

  const handleGetPresence = async () => {
    const res = await saasAxios.get(DEALMAKER_PRESENCE);
    return res.data;
  };

  const handleOpenExternal = async (_: any, url: string) => {
    if (
      typeof url === 'string' &&
      (url.startsWith('https://') || url.startsWith('steam://'))
    ) {
      await shell.openExternal(url);
      return { success: true };
    }
    throw new Error('Invalid or untrusted external URL');
  };

  // Register DealMaker channels
  ipcMain.handle('dealmaker:create', handleCreate);
  ipcMain.handle('dealmaker:get-active', handleGetActive);
  ipcMain.handle('dealmaker:get-by-id', handleGetById);
  ipcMain.handle('dealmaker:place-offer', handlePlaceOffer);
  ipcMain.handle('dealmaker:submit-listing-link', handleSubmitListingLink);
  ipcMain.handle('dealmaker:get-my-deals', handleGetMyDeals);
  ipcMain.handle('dealmaker:get-my-offers', handleGetMyOffers);
  ipcMain.handle('dealmaker:get-presence', handleGetPresence);
  ipcMain.handle('dealmaker:open-external-link', handleOpenExternal);

  // Backward-compatibility auction channels
  ipcMain.handle('auction:create', handleCreate);
  ipcMain.handle('auction:get-active', handleGetActive);
  ipcMain.handle('auction:get-by-id', handleGetById);
  ipcMain.handle('auction:place-bid', handlePlaceOffer);
  ipcMain.handle('auction:submit-listing-link', handleSubmitListingLink);
  ipcMain.handle('auction:get-my-auctions', handleGetMyDeals);
  ipcMain.handle('auction:get-my-bids', handleGetMyOffers);
  ipcMain.handle('auction:get-presence', handleGetPresence);
  ipcMain.handle('auction:open-external-link', handleOpenExternal);
}

// Backward-compatibility alias
export const setupAuctionIPC = setupDealMakerIPC;
