import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Radio, Square, Trash2, Zap } from "lucide-react";
import type { AcceptedPriceEntry } from "../../../hooks/useAcceptedPrices";
import type {
  SkinscomListing,
  SkinscomStreamEventType,
} from "../../../../shared/types/skinscom.types";
import { handleSkinsComReferenceLink } from "../../../utils/marketUrls";
import {
  buildStreamFilters,
  type SkinscomFilterState,
  type WearKey,
} from "../constants";
import {
  loadPersistedEventFilters,
  persistEventFilters,
} from "../utils/skinscomFilterStorage";
import {
  buildCeilingMap,
  isListingVisible,
} from "../utils/marketplaceFilters";
import { computeCloseness } from "../utils/skinscomUtils";
import { useSkinscomEventStream } from "../hooks/useSkinscomEventStream";
import { SkinscomMarketCard } from "../components/SkinscomMarketCard";
import {
  SkinscomLookupModal,
  type SkinscomLookupItem,
} from "../components/SkinscomLookupModal";
import { MarketplaceFilterBar } from "../components/MarketplaceFilterBar";

interface SkinscomEventStreamTabProps {
  hasKey: boolean;
  /** Trader's Skins.com wallet balance in USD dollars (for Set Max). */
  balance?: number;
  /** Reported to the workstation header. */
  onStreamStats?: (stats: { streaming: boolean; events: number }) => void;
  /** Oracle Buy Ceilings (accepted prices), lifted to the workstation. */
  acceptedPriceMap: Record<string, AcceptedPriceEntry>;
}

/** Event-type filter badges. `deleted_item` never renders as a card. */
const EVENT_TYPE_BADGES: { key: SkinscomStreamEventType; label: string }[] = [
  { key: "new_item", label: "New" },
  { key: "updated_item", label: "Updated" },
  { key: "auction_update", label: "Auction Bid" },
];

/**
 * Skins.com Events tab (live, read-only).
 *
 * Streams the public item feed over the Skins.com websocket (main process) and
 * renders only items whose price is within Max Distance of an Oracle Buy
 * Ceiling. Auctions, newly listed items and price updates all appear here, each
 * tagged with its event origin. No buy/sell/cancel — the feed is other
 * depositors' listings.
 */
export const SkinscomEventStreamTab: React.FC<SkinscomEventStreamTabProps> = ({
  hasKey,
  balance = 0,
  onStreamStats,
  acceptedPriceMap,
}) => {
  const [filters, setFilters] = useState<SkinscomFilterState>(() =>
    loadPersistedEventFilters(),
  );
  const [enabledTypes, setEnabledTypes] = useState<
    Record<SkinscomStreamEventType, boolean>
  >({
    new_item: true,
    updated_item: true,
    auction_update: true,
    deleted_item: false,
  });
  const [lookupItem, setLookupItem] = useState<SkinscomLookupItem | null>(null);

  const { entries, status, start, stop, clear } = useSkinscomEventStream();

  const streaming = status.connected || status.connecting;

  useEffect(() => {
    persistEventFilters(filters);
  }, [filters]);

  // Re-arm the server-side price/auction narrowing when those filters change.
  useEffect(() => {
    if (status.connected) start(buildStreamFilters(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.priceMin, filters.priceMax, filters.auctionFilter]);

  useEffect(() => {
    onStreamStats?.({ streaming, events: entries.length });
  }, [streaming, entries.length, onStreamStats]);

  const ceilings = useMemo(
    () => buildCeilingMap(acceptedPriceMap),
    [acceptedPriceMap],
  );

  const matchedCount = useMemo(
    () => entries.filter((e) => ceilings[e.listing.market_name]).length,
    [entries, ceilings],
  );

  const visible = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            enabledTypes[e.eventType] &&
            isListingVisible(e.listing, ceilings, filters),
        )
        .sort((a, b) => {
          const ca =
            computeCloseness(
              a.listing.market_value,
              ceilings[a.listing.market_name]?.cents,
            ) ?? Infinity;
          const cb =
            computeCloseness(
              b.listing.market_value,
              ceilings[b.listing.market_name]?.cents,
            ) ?? Infinity;
          if (ca !== cb) return ca - cb;
          return b.receivedAt - a.receivedAt;
        }),
    [entries, ceilings, filters, enabledTypes],
  );

  const handleChange = (patch: Partial<SkinscomFilterState>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const handleToggleWear = (key: WearKey) =>
    setFilters((prev) => ({
      ...prev,
      allowedWears: { ...prev.allowedWears, [key]: !prev.allowedWears[key] },
    }));

  const handleToggleType = (key: SkinscomStreamEventType) =>
    setEnabledTypes((prev) => ({ ...prev, [key]: !prev[key] }));

  const openOnSkinscom = (name: string) => {
    const url = handleSkinsComReferenceLink(name);
    if (url && window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    }
  };

  return (
    <div style={styles.container}>
      <MarketplaceFilterBar
        filters={filters}
        onChange={handleChange}
        onToggleWear={handleToggleWear}
        balance={balance}
        loading={false}
        hasKey={hasKey}
        primaryAction={
          streaming
            ? {
                label: "Stop Stream",
                icon: <Square size={13} />,
                onClick: stop,
                busy: status.connecting,
                disabled: !hasKey,
              }
            : {
                label: "Start Stream",
                icon: <Radio size={13} />,
                onClick: () => start(buildStreamFilters(filters)),
                busy: status.connecting,
                disabled: !hasKey,
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

      {/* Stream status + event-type filters */}
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
              ? status.authenticated
                ? "LIVE"
                : "LIVE (identifying…)"
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

        <div style={styles.typeFilters}>
          {EVENT_TYPE_BADGES.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => handleToggleType(b.key)}
              style={getTypeBadgeStyle(enabledTypes[b.key])}
            >
              {b.label}
            </button>
          ))}
        </div>
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
              {hasKey
                ? streaming
                  ? "Live items that land within Max Distance of a Buy Ceiling appear here as they are listed, repriced, or bid on."
                  : 'Click "Start Stream" to receive live new items, price updates, and auction bids.'
                : "Add your Skins.com API key in Settings to stream the market."}
            </div>
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {visible.map((entry) => (
              <SkinscomMarketCard
                key={entry.identity}
                listing={entry.listing}
                buyCeilingCents={
                  ceilings[entry.listing.market_name]?.cents ?? null
                }
                supplyStabilityScore={
                  ceilings[entry.listing.market_name]?.sss ?? null
                }
                maxCloseness={filters.maxCloseness}
                isSelected={false}
                hideSelection
                eventType={entry.eventType}
                duplicateCount={entry.ids.length}
                onToggleSelect={() =>
                  setLookupItem(toLookupItem(entry.listing, ceilings))
                }
                onOpenMarket={openOnSkinscom}
                onOpenLookup={(l) => setLookupItem(toLookupItem(l, ceilings))}
              />
            ))}
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

function toLookupItem(
  listing: SkinscomListing,
  ceilings: ReturnType<typeof buildCeilingMap>,
): SkinscomLookupItem {
  return {
    name: listing.market_name,
    iconUrl: listing.icon_url,
    marketPrice: listing.market_value / 100,
    suggestedPrice: listing.suggested_price
      ? listing.suggested_price / 100
      : undefined,
    acceptedPrice: ceilings[listing.market_name]
      ? ceilings[listing.market_name].cents / 100
      : undefined,
  };
}

// ── DYNAMIC STYLE HELPERS ────────────────────────────────────────────

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

const getTypeBadgeStyle = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "2px 8px",
  fontSize: "9.5px",
  fontWeight: 800,
  borderRadius: "3px",
  cursor: "pointer",
  backgroundColor: active ? "var(--so-primary)" : "var(--so-surface-panel)",
  color: active ? "#ffffff" : "var(--so-text-muted)",
  border: active ? "none" : "1px solid var(--so-border-subtle)",
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
  },
  typeFilters: {
    display: "flex",
    alignItems: "center",
    gap: "3px",
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
