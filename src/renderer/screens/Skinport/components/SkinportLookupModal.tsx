import React from "react";
import { ItemPreviewModal } from "../../../components/ItemPreviewModal";
import type { ItemPreviewData } from "../../../components/ItemPreviewModal";

export type SkinportLookupItem = ItemPreviewData;

interface SkinportLookupModalProps {
  item: SkinportLookupItem | null;
  onClose: () => void;
  onOpenMarket: (name: string) => void;
  getHumanMarketName?: (marketId: string) => string;
}

/**
 * Skinport sale/item preview. Delegates to the shared ItemPreviewModal so
 * every workstation renders the same Step 4-style inspection surface.
 */
export const SkinportLookupModal: React.FC<SkinportLookupModalProps> = ({
  item,
  onClose,
  onOpenMarket,
  getHumanMarketName,
}) => (
  <ItemPreviewModal
    item={item}
    onClose={onClose}
    onOpenMarket={onOpenMarket}
    getHumanMarketName={getHumanMarketName}
    defaultMarket="skinport"
  />
);
