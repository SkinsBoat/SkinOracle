import React, { useEffect, useMemo, useState } from "react";
import { Radio, Square, Trash2 } from "lucide-react";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";
import type { SkinportSale } from "../../../../shared/types/skinport.types";
import { handleSkinportReferenceLink } from "../../../utils/marketUrls";
import {
  type SkinportFilterState,
  type SkinportSortOption,
  type WearKey,
} from "../constants";
import {
  loadPersistedEventFilters,
  persistEventFilters,
} from "../utils/skinportFilterStorage";
import {
  buildCeilingMap,
  selectVisibleSales,
} from "../utils/skinportFilters";
import { calculateEventVelocity } from "../utils/skinportUtils";
import { useSkinportEventStream } from "../hooks/useSkinportEventStream";
import {
  useSkinportDealAlerts,
  isAlertEligible,
  type SkinportDealAlert,
} from "../hooks/useSkinportDealAlerts";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { SkinportSaleCard } from "../components/SkinportSaleCard";
import { SkinportStreamHUD } from "../components/SkinportStreamHUD";
import { SkinportStreamTape } from "../components/SkinportStreamTape";
import {
  SkinportLookupModal,
  type SkinportLookupItem,
} from "../components/SkinportLookupModal";
import { SkinportFilterBar } from "../components/SkinportFilterBar";

/** How long a freshly arrived row keeps its arrival flash. */
const ARRIVAL_FLASH_MS = 1500;

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
  const [now, setNow] = useState(() => Date.now());

  const notifyOnNewDeals = useNotificationStore((s) => s.notifyOnNewDeals);
  const setNotifyOnNewDeals = useNotificationStore(
    (s) => s.setNotifyOnNewDeals,
  );

  const {
    entries,
    status,
    pushTimestamps,
    isFrozen,
    frozenCount,
    toggleFreeze,
    start,
    stop,
    clear,
  } = useSkinportEventStream();

  const streaming = status.connected || status.connecting;

  useEffect(() => {
    persistEventFilters(filters);
  }, [filters]);

  useEffect(() => {
    onStreamStats?.({ streaming, events: entries.length });
  }, [streaming, entries.length, onStreamStats]);

  // Ticker drives arrival flashing, age labels and velocity windows.
  useEffect(() => {
    if (!streaming && entries.length === 0) return;
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, [streaming, entries.length]);

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

  const velocity = useMemo(
    () => calculateEventVelocity(pushTimestamps, 60000, now),
    [pushTimestamps, now],
  );

  const recentlyPushed = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (now - e.receivedAt <= ARRIVAL_FLASH_MS) set.add(e.identity);
    });
    return set;
  }, [entries, now]);

  const lastEventAt = pushTimestamps.length
    ? pushTimestamps[pushTimestamps.length - 1]
    : status.lastEventAt && status.lastEventAt > 1e12
      ? status.lastEventAt
      : status.lastEventAt
        ? status.lastEventAt * 1000
        : null;

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
                variant: "live" as const,
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

      <SkinportStreamHUD
        connected={status.connected}
        connecting={status.connecting}
        error={status.error}
        velocity={velocity}
        lastEventAt={lastEventAt}
        visibleCount={visible.length}
        totalCount={entries.length}
        sortMode={filters.sortMode}
        onSortChange={(mode: SkinportSortOption) =>
          handleChange({ sortMode: mode })
        }
        isFrozen={isFrozen}
        frozenCount={frozenCount}
        onToggleFreeze={toggleFreeze}
        alertsEnabled={notifyOnNewDeals}
        onToggleAlerts={() => setNotifyOnNewDeals(!notifyOnNewDeals)}
      />

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
        ) : filters.viewMode === "tape" ? (
          <SkinportStreamTape
            entries={visible}
            ceilings={ceilings}
            maxCloseness={filters.maxCloseness}
            recentlyPushed={recentlyPushed}
            onOpenMarket={openOnSkinport}
            onOpenLookup={(s) => setLookupItem(toLookup(s))}
          />
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
