import type { MarketGapResultItem } from "../../../shared/types";

export interface MarketGapCardProps {
  item: MarketGapResultItem;
  isSelected: boolean;
  onToggleSelect: () => void;
  isProcessing: boolean;
  onCreateOrder: (item: MarketGapResultItem, targetPrice?: number) => void;
  onOpenTargetMarket: (name: string) => void;
  onOpenLookup: (
    name: string,
    acceptedPrice?: number,
    currentMarketPrice?: number,
    iconUrl?: string,
  ) => void;
  wearShortcut: string;
  targetMarketName: string;
  createOrderLabel: string;
  orderPlacedLabel: string;
  targetPriceLabel: string;
  targetPrice?: number;
  onTargetPriceChange?: (price: number) => void;
}
