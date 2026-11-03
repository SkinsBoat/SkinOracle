import React, { useEffect, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";
import { handleSkinportReferenceLink } from "../../../utils/marketUrls";
import {
  type SkinportFilterState,
  type WearKey,
} from "../constants";
import {
  loadPersistedFilters,
  persistFilters,
} from "../utils/skinportFilterStorage";
import {
  buildCeilingMap,
  countInCategory,
  countMatchedCeilings,
  selectVisibleItems,
} from "../utils/skinportFilters";
import { useSkinportItems } from "../hooks/useSkinportItems";
import { SkinportMarketCard } from "../components/SkinportMarketCard";
import { SkinportMarketTable } from "../components/SkinportMarketTable";
import {
  SkinportLookupModal,
  type SkinportLookupItem,
} from "../components/SkinportLookupModal";
import { SkinportFilterBar } from "../components/SkinportFilterBar";
import { SkinportStatsStrip } from "../components/SkinportStatsStrip";

interface MarketItemsTabProps {
  onScanned?: (count: number) => void;
  acceptedPriceMap: Record<string, AcceptedPriceEntry>;
}

export const MarketItemsTab: React.FC<MarketItemsTabProps> = ({
  onScanned,
  acceptedPriceMap,
}) => {
  const [filters, setFilters] = useState<SkinportFilterState>(() =>
    loadPersistedFilters(),
  );
  const [lookupItem, setLookupItem] = useState<SkinportLookupItem | null>(null);

  useEffect(() => {
    persistFilters(filters);
  }, [filters]);

  const ceilings = useMemo(
    () => buildCeilingMap(acceptedPriceMap),
    [acceptedPriceMap],
  );

  const { items, loading, hasScanned, scan } = useSkinportItems({
    onScanned,
    tradable: filters.tradable,
  });

  const handleChange = (patch: Partial<SkinportFilterState>) =>
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
    () => selectVisibleItems(items, ceilings, filters),
    [items, ceilings, filters],
  );

  const openOnSkinport = (name: string) => {
    const url = handleSkinportReferenceLink(name);
    if (url && window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    }
  };

  return (
    <div style={styles.container}>
      <SkinportFilterBar
        filters={filters}
        onChange={handleChange}
        onToggleWear={handleToggleWear}
        loading={loading}
        onScan={scan}
      />

      <SkinportStatsStrip
        stats={[
          { label: "Items", value: items.length.toLocaleString() },
          { label: "Matched to ceilings", value: matchedCeilingCount },
          { label: "In category", value: categoryCount },
        ]}
        maxCloseness={filters.maxCloseness}
        visibleCount={visible.length}
      />

      <div style={styles.scrollView}>
        {visible.length === 0 ? (
          <div className="card" style={styles.emptyCard}>
            <Zap size={32} style={styles.emptyIcon} />
            <div style={styles.emptyTitle}>
              {loading
                ? "Scanning market..."
                : !hasScanned
                  ? "No scan yet"
                  : "No items match these filters"}
            </div>
            <div style={styles.emptySubtitle}>
              Click "Run Scan" to pull the Skinport market (cached 5 min), then
              Load Oracle to match listings against your Buy Ceilings.
            </div>
          </div>
        ) : filters.viewMode === "tape" ? (
          <SkinportMarketTable
            items={visible}
            ceilings={ceilings}
            maxCloseness={filters.maxCloseness}
            selected={{}}
            onToggleSelect={() => {}}
            onToggleSelectAll={() => {}}
            onOpenMarket={openOnSkinport}
            onOpenLookup={(i) =>
              setLookupItem({
                name: i.market_hash_name,
                suggestedPrice: i.suggested_price ?? undefined,
                marketPrice: i.min_price ?? undefined,
                acceptedPrice: ceilings[i.market_hash_name]
                  ? ceilings[i.market_hash_name].cents / 100
                  : undefined,
                market: "skinport",
              })
            }
          />
        ) : (
          <div style={styles.cardsGrid}>
            {visible.map((item) => (
              <SkinportMarketCard
                key={item.market_hash_name}
                item={item}
                buyCeilingCents={
                  ceilings[item.market_hash_name]?.cents ?? null
                }
                supplyStabilityScore={
                  ceilings[item.market_hash_name]?.sss ?? null
                }
                maxCloseness={filters.maxCloseness}
                onOpenMarket={openOnSkinport}
                onOpenLookup={(i) =>
                  setLookupItem({
                    name: i.market_hash_name,
                    suggestedPrice: i.suggested_price ?? undefined,
                    marketPrice: i.min_price ?? undefined,
                    acceptedPrice: ceilings[i.market_hash_name]
                      ? ceilings[i.market_hash_name].cents / 100
                      : undefined,
                    market: "skinport",
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {lookupItem && (
        <SkinportLookupModal
          item={lookupItem}
          onClose={() => setLookupItem(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 130px)",
    gap: "10px",
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "10px",
    paddingBottom: "12px",
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
