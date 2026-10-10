import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Radio, Square, Trash2, Zap } from "lucide-react";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";
import type { SkinportSale } from "../../../../shared/types/skinport.types";
import { handleSkinportReferenceLink } from "../../../utils/marketUrls";
import { type SkinportFilterState, type WearKey } from "../constants";
import {
  loadPersistedEventFilters,
  persistEventFilters,
} from "../utils/skinportFilterStorage";
import {
  buildCeilingMap,
  selectVisibleSales,
} from "../utils/skinportFilters";
import { useSkinportEventStream } from "../hooks/useSkinportEventStream";
import {
  useSkinportDealAlerts,
  isAlertEligible,
  type SkinportDealAlert,
} from "../hooks/useSkinportDealAlerts";
import { SkinportSaleCard } from "../components/SkinportSaleCard";
import {
  SkinportLookupModal,
  type SkinportLookupItem,
} from "../components/SkinportLookupModal";
import { SkinportFilterBar } from "../components/SkinportFilterBar";

interface EventFeedTabProps {
  onStreamStats?: (stats: { streaming: boolean; events: number }) => void;
  acceptedPriceMap: Record<string, AcceptedPriceEntry>;
}

export const EventFeedTab: React.FC<EventFeedTabProps> = ({
  onStreamStats,
  acceptedPriceMap,
}) => {
  const [filters, setFilters] = useState<SkinportFilterState>(() =>
    loadPersistedEventFilters(),
  );
  const [lookupItem, setLookupItem] = useState<SkinportLookupItem | null>(null);

  const { entries, status, start, stop, clear } = useSkinportEventStream();

  const streaming = status.connected || status.connecting;

  useEffect(() => {
    persistEventFilters(filters);
  }, [filters]);

  useEffect(() => {
    onStreamStats?.({ streaming, events: entries.length });
  }, [streaming, entries.length, onStreamStats]);

  const ceilings = useMemo(
    () => buildCeilingMap(acceptedPriceMap),
    [acceptedPriceMap],
  );

  const matchedCount = useMemo(
    () => entries.filter((e) => ceilings[e.sale.marketHashName]).length,
    [entries, ceilings],
  );

  const visible = useMemo(
    () => selectVisibleSales(entries, ceilings, filters),
    [entries, ceilings, filters],
  );

  const dealAlerts = useMemo<SkinportDealAlert[]>(
    () =>
      visible
        .map((e) => {
          const ceiling = ceilings[e.sale.marketHashName]?.cents;
          if (ceiling === undefined) return null;
          if (!isAlertEligible(e.sale.salePrice, ceiling)) {
            return null;
          }
          return {
            key: e.identity,
            name: e.sale.marketHashName,
            priceUsd: e.sale.salePrice / 100,
            ceilingUsd: ceiling / 100,
          };
        })
        .filter((x): x is SkinportDealAlert => x !== null),
    [visible, ceilings],
  );

  useSkinportDealAlerts(dealAlerts);

  const handleChange = (patch: Partial<SkinportFilterState>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const handleToggleWear = (key: WearKey) =>
    setFilters((prev) => ({
      ...prev,
      allowedWears: { ...prev.allowedWears, [key]: !prev.allowedWears[key] },
    }));

  const openOnSkinport = (name: string) => {
    const url = handleSkinportReferenceLink(name);
    if (url && window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    }
  };

  const toLookup = (sale: SkinportSale): SkinportLookupItem => ({
    name: sale.marketHashName,
    iconUrl: sale.image,
    marketPrice: sale.salePrice / 100,
    suggestedPrice: sale.suggestedPrice ? sale.suggestedPrice / 100 : undefined,
    acceptedPrice: ceilings[sale.marketHashName]
      ? ceilings[sale.marketHashName].cents / 100
      : undefined,
    market: "skinport",
  });

  return (
    <div style={styles.container}>
      <SkinportFilterBar
        filters={filters}
        onChange={handleChange}
        onToggleWear={handleToggleWear}
        loading={false}
        showFeedType
        primaryAction={
          streaming
            ? {
                label: "Stop Stream",
                icon: <Square size={13} />,
                onClick: stop,
                busy: status.connecting,
              }
            : {
                label: "Start Stream",
                icon: <Radio size={13} />,
                onClick: start,
                busy: status.connecting,
              }
        }
        extraActions={
          entries.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="btn btn-outline btn-sm"
              style={styles.clearButton}
              title="Clear the current event feed"
            >
              <Trash2 size={13} /> Clear
            </button>
          ) : undefined
        }
      />

      <div style={styles.statusStrip}>
        <span style={getConnectionStyle(status.connected, status.connecting)}>
          {status.connecting ? (
            <Loader2 size={11} className="spin" />
          ) : (
            <span style={getDotStyle(status.connected)} />
          )}
          {status.connecting
            ? "Connecting…"
            : status.connected
              ? "LIVE"
              : status.error
                ? `Offline — ${status.error}`
                : "Offline"}
        </span>

        <span style={styles.statItem}>
          Events: <strong>{entries.length}</strong>
        </span>
        <span style={styles.statItem}>
          Matched to ceilings: <strong>{matchedCount}</strong>
        </span>
        <span style={styles.statFiltered}>
          <Zap size={11} /> Within {filters.maxCloseness.toFixed(2)}× ·{" "}
          {visible.length} item(s)
        </span>
      </div>

      <div style={styles.scrollView}>
        {visible.length === 0 ? (
          <div className="card" style={styles.emptyCard}>
            <Radio size={32} style={styles.emptyIcon} />
            <div style={styles.emptyTitle}>
              {streaming
                ? "Streaming — no matched events yet"
                : "Stream not running"}
            </div>
            <div style={styles.emptySubtitle}>
              {streaming
                ? "Live Skinport listings and sales that land within Max Distance of a Buy Ceiling appear here."
                : 'Click "Start Stream" to receive the live Skinport sale feed (listed & sold).'}
            </div>
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {visible.map((entry) => (
              <SkinportSaleCard
                key={entry.identity}
                sale={entry.sale}
                eventType={entry.eventType}
                occurrenceCount={entry.count}
                buyCeilingCents={
                  ceilings[entry.sale.marketHashName]?.cents ?? null
                }
                supplyStabilityScore={
                  ceilings[entry.sale.marketHashName]?.sss ?? null
                }
                maxCloseness={filters.maxCloseness}
                onOpenMarket={openOnSkinport}
                onOpenLookup={(s) => setLookupItem(toLookup(s))}
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

const getDotStyle = (connected: boolean): React.CSSProperties => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: connected ? "var(--so-success)" : "var(--so-text-muted)",
  display: "inline-block",
});

const getConnectionStyle = (
  connected: boolean,
  connecting: boolean,
): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "5px",
  fontWeight: 800,
  color: connecting
    ? "var(--so-accent-cyan)"
    : connected
      ? "var(--so-success-text)"
      : "var(--so-text-muted)",
});

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: "10px",
    minHeight: 0,
  },
  clearButton: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
  },
  statusStrip: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    fontSize: "11.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    padding: "0 4px",
    flexShrink: 0,
    flexWrap: "wrap",
  },
  statItem: {
    color: "var(--so-text-muted)",
  },
  statFiltered: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    color: "var(--so-accent-cyan)",
    marginLeft: "auto",
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
    color: "var(--so-accent-cyan)",
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
