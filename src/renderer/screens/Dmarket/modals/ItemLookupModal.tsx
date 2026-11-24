import React from "react";
import { ItemPreviewModal } from "../../../components/ItemPreviewModal";
import type { ItemPreviewData } from "../../../components/ItemPreviewModal";
import { getHumanMarketName } from "../dmarket-utils";

interface ItemLookupModalProps {
  item: ItemPreviewData | null;
  onClose: () => void;
  onOpenMarket: (title: string) => void;
}

/**
 * DMarket target preview. Delegates to the shared ItemPreviewModal so every
 * workstation renders the same Step 4-style inspection surface.
 */
export const ItemLookupModal: React.FC<ItemLookupModalProps> = ({
  item,
  onClose,
  onOpenMarket,
}) => (
  <ItemPreviewModal
    item={item}
    onClose={onClose}
    onOpenMarket={onOpenMarket}
    getHumanMarketName={getHumanMarketName}
    defaultMarket="dmarket"
  />
);
