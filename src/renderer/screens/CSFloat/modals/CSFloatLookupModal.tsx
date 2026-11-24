import React from "react";
import { ItemPreviewModal } from "../../../components/ItemPreviewModal";
import type { ItemPreviewData } from "../../../components/ItemPreviewModal";

export type LookupModalItemData = ItemPreviewData;

interface CSFloatLookupModalProps {
  item: LookupModalItemData | null;
  onClose: () => void;
  onOpenMarket: (name: string) => void;
  getHumanMarketName?: (marketId: string) => string;
}

/**
 * CSFloat single-item preview. Delegates to the shared ItemPreviewModal so
 * every workstation renders the same Step 4-style inspection surface.
 */
export const CSFloatLookupModal: React.FC<CSFloatLookupModalProps> = ({
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
    defaultMarket="csfloat"
  />
);
