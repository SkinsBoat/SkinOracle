import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, ExternalLink, Square, X, Zap } from "lucide-react";
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
import {
  useSkinportDealAlerts,
  isAlertEligible,
  type SkinportDealAlert,
} from "../hooks/useSkinportDealAlerts";
import { itemPriceCents } from "../utils/skinportUtils";
import { SkinportMarketCard } from "../components/SkinportMarketCard";
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
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [lookupItem, setLookupItem] = useState<SkinportLookupItem | null>(null);

  useEffect(() => {
    persistFilters(filters);
  }, [filters]);

  const ceilings = useMemo(
    () => buildCeilingMap(acceptedPriceMap),
    [acceptedPriceMap],
  );

  const { items, loading, hasScanned, scan } = useSkinportItems({
    onScanned: (count) => {
      setSelected({});
      onScanned?.(count);
    },
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

  const dealAlerts = useMemo<SkinportDealAlert[]>(
    () =>
      visible
        .map((i) => {
          const ceiling = ceilings[i.market_hash_name]?.cents;
          const price = itemPriceCents(i);
          if (ceiling === undefined || price === null) return null;
          if (!isAlertEligible(price, ceiling)) {
            return null;
          }
          return {
            key: i.market_hash_name,
            name: i.market_hash_name,
            priceUsd: price / 100,
            ceilingUsd: ceiling / 100,
          };
        })
        .filter((x): x is SkinportDealAlert => x !== null),
    [visible, ceilings],
  );

  useSkinportDealAlerts(dealAlerts);

  const openOnSkinport = (name: string) => {
    const url = handleSkinportReferenceLink(name);
    if (url && window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    }
  };

  const selectedItems = visible.filter((i) => selected[i.market_hash_name]);
  const selectedCount = selectedItems.length;

  const handleOpenSelected = () =>
    selectedItems.forEach((i) => openOnSkinport(i.market_hash_name));

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

      {selectedCount > 0 && (
        <div style={styles.selectionBar}>
          <span style={styles.selectedText}>
            <CheckSquare size={14} /> {selectedCount} Selected
          </span>
          <button
            onClick={() =>
              setSelected((prev) => {
                const next = { ...prev };
                visible.forEach((i) => {
                  next[i.market_hash_name] = true;
                });
                return next;
              })
            }
            className="btn btn-outline btn-sm"
          >
            <CheckSquare size={12} /> Select Visible ({visible.length})
          </button>
          <button
            onClick={() => setSelected({})}
            className="btn btn-outline btn-sm"
          >
            <Square size={12} /> Clear
          </button>
          <button
            onClick={handleOpenSelected}
            className="btn btn-primary btn-sm"
            style={styles.openSelectedBtn}
          >
            <ExternalLink size={13} /> Open on Skinport ({selectedCount})
          </button>
          <button
            onClick={() => setSelected({})}
            className="btn btn-sm"
            style={styles.clearCircleBtn}
          >
            <X size={14} />
          </button>
        </div>
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
                  : "No items match these filters"}
            </div>
            <div style={styles.emptySubtitle}>
              Click "Run Scan" to pull the Skinport market (cached 5 min), then
              Load Oracle to match listings against your Buy Ceilings.
            </div>
          </div>
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
                isSelected={!!selected[item.market_hash_name]}
                onToggleSelect={() =>
                  setSelected((prev) => ({
                    ...prev,
                    [item.market_hash_name]: !prev[item.market_hash_name],
                  }))
                }
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

      <SkinportLookupModal
        item={lookupItem}
        onClose={() => setLookupItem(null)}
        onOpenMarket={openOnSkinport}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "10px",
    minHeight: 0,
  },
  selectionBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-primary)",
    borderRadius: "var(--so-radius-md)",
    padding: "8px 14px",
    flexShrink: 0,
  },
  selectedText: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 800,
    fontSize: "12px",
    color: "var(--so-text-primary)",
  },
  openSelectedBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontWeight: 800,
    marginLeft: "auto",
  },
  clearCircleBtn: {
    padding: "6px",
    borderRadius: "50%",
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
