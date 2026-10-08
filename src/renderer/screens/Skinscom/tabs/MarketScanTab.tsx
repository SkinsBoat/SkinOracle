import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCw, Zap } from "lucide-react";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";
import { useLayoutStore } from "../../../store/useLayoutStore";
import { handleSkinsComReferenceLink } from "../../../utils/marketUrls";
import {
  buildMarketplaceParams,
  type SkinscomFilterState,
  type WearKey,
} from "../constants";
import {
  loadPersistedFilters,
  persistFilters,
} from "../utils/skinscomFilterStorage";
import {
  buildCeilingMap,
  countInCategory,
  countMatchedCeilings,
  selectVisibleListings,
} from "../utils/marketplaceFilters";
import { useMarketplaceScan } from "../hooks/useMarketplaceScan";
import { SkinscomMarketCard } from "../components/SkinscomMarketCard";
import {
  SkinscomLookupModal,
  type SkinscomLookupItem,
} from "../components/SkinscomLookupModal";
import { MarketplaceFilterBar } from "../components/MarketplaceFilterBar";
import { MarketplaceStatsStrip } from "../components/MarketplaceStatsStrip";
import { MarketplaceSelectionToolbar } from "../components/MarketplaceSelectionToolbar";

interface SkinscomMarketScanTabProps {
  hasKey: boolean;
  /** Trader's Skins.com wallet balance in USD dollars (for Set Max). */
  balance?: number;
  onScanned?: (count: number) => void;
  /** Oracle Buy Ceilings (accepted prices), lifted to the workstation. */
  acceptedPriceMap: Record<string, AcceptedPriceEntry>;
}

/**
 * Skins.com Market Scan tab (read-only).
 *
 * Scans the public `GET /trading/items` feed and renders only listings whose
 * price is within Max Distance of an Oracle Buy Ceiling (accepted price).
 * Unlike the CSFloat/DMarket So Close tabs, this performs no buy/order
 * execution — it matches listings and opens the item on Skins.com. Category
 * and wear badges filter client-side (the API has no category param); a wear
 * float envelope is sent server-side for weapon-only scans.
 */
export const SkinscomMarketScanTab: React.FC<SkinscomMarketScanTabProps> = ({
  hasKey,
  balance = 0,
  onScanned,
  acceptedPriceMap,
}) => {
  const [filters, setFilters] = useState<SkinscomFilterState>(() =>
    loadPersistedFilters(),
  );
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [lookupItem, setLookupItem] = useState<SkinscomLookupItem | null>(null);
  const isSidebarExpanded = useLayoutStore((s) => s.isSidebarExpanded);

  // Remember the trader's filter choices across app restarts.
  useEffect(() => {
    persistFilters(filters);
  }, [filters]);

  const ceilings = useMemo(
    () => buildCeilingMap(acceptedPriceMap),
    [acceptedPriceMap],
  );

  const {
    items,
    loading,
    loadingMore,
    page,
    lastPage,
    hasScanned,
    scan,
    loadMore,
  } = useMarketplaceScan({
    hasKey,
    buildParams: (targetPage, autoFetchAll) =>
      buildMarketplaceParams(filters, targetPage, autoFetchAll),
    onScanned,
  });

  const handleScan = () => {
    setSelected({});
    scan();
  };

  const handleChange = (patch: Partial<SkinscomFilterState>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const handleToggleWear = (key: WearKey) =>
    setFilters((prev) => ({
      ...prev,
      allowedWears: { ...prev.allowedWears, [key]: !prev.allowedWears[key] },
    }));

  const matchedCeilingCount = useMemo(
    () => countMatchedCeilings(items, ceilings),
    [items, ceilings],
  );
  const categoryCount = useMemo(
    () => countInCategory(items, filters.category),
    [items, filters.category],
  );
  const visible = useMemo(
    () => selectVisibleListings(items, ceilings, filters),
    [items, ceilings, filters],
  );

  const openOnSkinscom = (name: string) => {
    const url = handleSkinsComReferenceLink(name);
    if (url && window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    }
  };

  const selectedListings = visible.filter((l) => selected[l.id]);
  const selectedCount = selectedListings.length;

  const handleSelectAllVisible = () => {
    const next: Record<number, boolean> = { ...selected };
    visible.forEach((l) => {
      next[l.id] = true;
    });
    setSelected(next);
  };

  const handleOpenSelected = () =>
    selectedListings.forEach((l) => openOnSkinscom(l.market_name));

  return (
    <div style={styles.container}>
      <MarketplaceFilterBar
        filters={filters}
        onChange={handleChange}
        onToggleWear={handleToggleWear}
        balance={balance}
        loading={loading}
        hasKey={hasKey}
        onScan={handleScan}
      />

      <MarketplaceStatsStrip
        itemsCount={items.length}
        matchedCount={matchedCeilingCount}
        category={filters.category}
        categoryCount={categoryCount}
        maxCloseness={filters.maxCloseness}
        visibleCount={visible.length}
      />

      {selectedCount > 0 && (
        <MarketplaceSelectionToolbar
          selectedCount={selectedCount}
          visibleCount={visible.length}
          isSidebarExpanded={isSidebarExpanded}
          onSelectAll={handleSelectAllVisible}
          onClear={() => setSelected({})}
          onOpenSelected={handleOpenSelected}
        />
      )}

      <div style={styles.scrollView}>
        {visible.length === 0 ? (
          <div className="card" style={styles.emptyCard}>
            <Zap size={32} style={styles.emptyIcon} />
            <div style={styles.emptyTitle}>
              {loading
                ? "Scanning market..."
                : !hasScanned
                  ? "No scan yet"
                  : "No listings match these filters"}
            </div>
            <div style={styles.emptySubtitle}>
              {hasKey
                ? 'Click "Run Scan" to stream listings, then Load Oracle to match them against your Buy Ceilings.'
                : "Add your Skins.com API key in Settings to scan the market."}
            </div>
          </div>
        ) : (
          <div style={getCardsGridStyle(selectedCount > 0)}>
            {visible.map((listing) => (
              <SkinscomMarketCard
                key={listing.id}
                listing={listing}
                buyCeilingCents={ceilings[listing.market_name]?.cents ?? null}
                supplyStabilityScore={
                  ceilings[listing.market_name]?.sss ?? null
                }
                maxCloseness={filters.maxCloseness}
                isSelected={!!selected[listing.id]}
                onToggleSelect={() =>
                  setSelected((prev) => ({
                    ...prev,
                    [listing.id]: !prev[listing.id],
                  }))
                }
                onOpenMarket={openOnSkinscom}
                onOpenLookup={(l) =>
                  setLookupItem({
                    name: l.market_name,
                    iconUrl: l.icon_url,
                    marketPrice: l.market_value / 100,
                    suggestedPrice: l.suggested_price
                      ? l.suggested_price / 100
                      : undefined,
                    acceptedPrice: ceilings[l.market_name]
                      ? ceilings[l.market_name].cents / 100
                      : undefined,
                  })
                }
              />
            ))}
          </div>
        )}

        {hasScanned && page < lastPage && visible.length > 0 && (
          <div style={styles.loadMoreWrapper}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="btn btn-outline btn-sm"
            >
              {loadingMore ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <RotateCw size={13} />
              )}{" "}
              Load More (page {page} of {lastPage})
            </button>
          </div>
        )}
      </div>

      <SkinscomLookupModal
        item={lookupItem}
        onClose={() => setLookupItem(null)}
        onOpenMarket={openOnSkinscom}
      />
    </div>
  );
};

// ── DYNAMIC STYLE HELPERS ────────────────────────────────────────────

const getCardsGridStyle = (hasSelection: boolean): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "10px",
  paddingBottom: hasSelection ? "75px" : "12px",
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "10px",
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
  },
  loadMoreWrapper: {
    display: "flex",
    justifyContent: "center",
    padding: "10px 0 20px",
  },
  emptyCard: {
    textAlign: "center",
    padding: "50px 20px",
    color: "var(--so-text-muted)",
  },
  emptyIcon: {
    marginBottom: "10px",
    opacity: 0.5,
  },
  emptyTitle: {
    fontWeight: 700,
    fontSize: "15px",
    color: "var(--so-text-primary)",
    marginBottom: "4px",
  },
  emptySubtitle: {
    fontSize: "12px",
  },
};
