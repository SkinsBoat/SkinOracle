export interface DealExportItem {
  marketHashName: string;
  exterior?: string;
  floatValue?: number;
  listingPrice: number;
  proposedPrice: number;
  counterPrice?: number;
  selected: boolean;
  status: 'pending' | 'accepted' | 'rejected';
}

/**
 * Public, signed-deal snapshot for PDF export.
 * Deliberately excludes any internal ceiling/spread/profit fields.
 */
export interface DealExportPayload {
  roomId: string;
  marketplace: string;
  sellerHandle: string;
  items: DealExportItem[];
  globalDiscountPct: number;
  traderReady: boolean;
  sellerReady: boolean;
  dealLocked: boolean;
  exportedAt: string;
}
