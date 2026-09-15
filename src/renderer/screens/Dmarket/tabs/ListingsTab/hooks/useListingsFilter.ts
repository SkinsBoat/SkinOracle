import { useState, useMemo } from "react";
import {
  DmarketOfferItem,
  DmarketInventoryItem,
  ListingAnalysis,
} from "../../../../../../shared/types";
import { isDmarketP2POffer } from "../../../dmarket-utils";

export interface UseListingsFilterProps {
  offers: DmarketOfferItem[];
  inventory: DmarketInventoryItem[];
  listingAnalysis: Record<string, ListingAnalysis>;
}

export function useListingsFilter({
  offers,
  inventory,
  listingAnalysis,
}: UseListingsFilterProps) {
  const [listingSubTab, setListingSubTab] = useState<
    "active" | "inventory" | "history"
  >("active");
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilterAction, setListingFilterAction] = useState<
    "all" | "action_required" | "overpriced" | "underpriced" | "safe"
  >("all");
  const [listingModeFilter, setListingModeFilter] = useState<
    "all" | "p2p" | "bot"
  >("all");
  const [inventoryMarketFilter, setInventoryMarketFilter] = useState<
    "all" | "dmarket" | "steam"
  >("all");

  // Listings stats
  const {
    matchedListingCount,
    actionReqListingCount,
    overpricedListingCount,
    underpricedListingCount,
    safeListingCount,
  } = useMemo(() => {
    let matched = 0;
    let actionReq = 0;
    let overpriced = 0;
    let underpriced = 0;
    let safe = 0;

    offers.forEach((offer) => {
      const a = listingAnalysis[offer.id];
      if (a) {
        matched++;
        if (a.isOverpriced) overpriced++;
        if (a.isUnderpriced) underpriced++;
        if (a.isActionRequired) actionReq++;
        if (!a.isActionRequired) safe++;
      }
    });

    return {
      matchedListingCount: matched,
      actionReqListingCount: actionReq,
      overpricedListingCount: overpriced,
      underpricedListingCount: underpriced,
      safeListingCount: safe,
    };
  }, [offers, listingAnalysis]);

  // P2P vs Bot mode counts
  const { p2pCount, botCount } = useMemo(() => {
    let p2p = 0;
    let bot = 0;
    offers.forEach((o) => {
      if (isDmarketP2POffer(o)) p2p++;
      else bot++;
    });
    return { p2pCount: p2p, botCount: bot };
  }, [offers]);

  // Filtered active offers
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      if (listingSearch) {
        const q = listingSearch.toLowerCase().trim();
        if (!offer.title.toLowerCase().includes(q)) return false;
      }
      if (listingModeFilter === "p2p" && !isDmarketP2POffer(offer)) return false;
      if (listingModeFilter === "bot" && isDmarketP2POffer(offer)) return false;

      if (listingFilterAction === "all") return true;
      const a = listingAnalysis[offer.id];
      if (!a) return listingFilterAction === "action_required";
      if (listingFilterAction === "action_required") return a.isActionRequired;
      if (listingFilterAction === "overpriced") return a.isOverpriced;
      if (listingFilterAction === "underpriced") return a.isUnderpriced;
      if (listingFilterAction === "safe") return !a.isActionRequired;
      return true;
    });
  }, [offers, listingSearch, listingFilterAction, listingModeFilter, listingAnalysis]);

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (inventoryMarketFilter === "dmarket" && !item.inMarket) return false;
      if (inventoryMarketFilter === "steam" && item.inMarket) return false;
      if (listingSearch) {
        const q = listingSearch.toLowerCase().trim();
        if (!item.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [inventory, inventoryMarketFilter, listingSearch]);

  return {
    listingSubTab,
    setListingSubTab,
    listingSearch,
    setListingSearch,
    listingFilterAction,
    setListingFilterAction,
    listingModeFilter,
    setListingModeFilter,
    inventoryMarketFilter,
    setInventoryMarketFilter,
    matchedListingCount,
    actionReqListingCount,
    overpricedListingCount,
    underpricedListingCount,
    safeListingCount,
    p2pCount,
    botCount,
    filteredOffers,
    filteredInventory,
  };
}
