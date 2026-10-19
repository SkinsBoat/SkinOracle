import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Crosshair,
} from 'lucide-react';
import {
  DEFAULT_RAID_FILTERS,
  RaidAuditRow,
  RaidBookmark,
  RaidFilters,
  RaidSeller,
  RaidStockItem,
  RaidStorefrontRef,
} from '../../../shared/types/raid.types';
import { useDataFreshnessStore } from '../../store/useDataFreshnessStore';
import { useTrendStore } from '../../store/useTrendStore';
import { getFreshness } from '../../utils/dataFreshness';
import {
  auditStock,
  buildRaidOfferPayload,
  filterRaidRows,
  getRaidMarketplaceName,
  isAnyRaidFilterActive,
  normalizeCsFloatStall,
  normalizeDmarketStore,
  normalizeSkinportShop,
  parseStorefrontUrl,
  sortRaidRows,
  RaidSortKey,
} from './utils/raidUtils';
import {
  loadRaidBookmarks,
  removeRaidBookmark,
  upsertRaidBookmark,
} from './utils/raidBookmarks';
import { RaidStatCards } from './components/RaidStatCards';
import { RaidSellerHeader } from './components/RaidSellerHeader';
import { RaidFilterBar } from './components/RaidFilterBar';
import { RaidItemCard } from './components/RaidItemCard';
import { RaidBookmarks } from './components/RaidBookmarks';
import { RaidNegotiationModal } from './components/RaidNegotiationModal';
import { RaidScreenHeader } from './components/RaidScreenHeader';
import { RaidStorefrontSearch } from './components/RaidStorefrontSearch';
import { RaidOfferBar } from './components/RaidOfferBar';
import { RaidIntroState } from './components/RaidIntroState';

/**
 * RAID — Targeted Seller Auditor.
 *
 * Paste a single seller's storefront link, stream their listed stock, and audit
 * every listing against the trader's locally calculated Oracle Buy Ceilings to
 * surface the "Raid Zone" (items at or below the ceiling).
 */
export const RaidScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seller, setSeller] = useState<RaidSeller | null>(null);
  const [items, setItems] = useState<RaidStockItem[]>([]);
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const [isExportingOffer, setIsExportingOffer] = useState(false);
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false);
  const [sessionIdempotencyKey, setSessionIdempotencyKey] = useState<
    string | null
  >(null);
  const navigate = useNavigate();

  // Monotonic token: only the newest scan may write results to state.
  const scanSeq = useRef(0);

  const [filters, setFilters] =
    useState<RaidFilters>(DEFAULT_RAID_FILTERS);
  const [sortKey, setSortKey] = useState<RaidSortKey>('spread');

  const [bookmarks, setBookmarks] = useState<RaidBookmark[]>(() =>
    loadRaidBookmarks(),
  );

  const [ceilings, setCeilings] = useState<Record<string, number>>({});
  const [acceptedStoredAt, setAcceptedStoredAt] = useState<string | null>(null);

  const acceptedPriceExpiryMinutes = useDataFreshnessStore(
    (s) => s.acceptedPriceExpiryMinutes,
  );
  const freshnessWarningsEnabled = useDataFreshnessStore(
    (s) => s.freshnessWarningsEnabled,
  );

  const handleFilterChange = <K extends keyof RaidFilters>(
    key: K,
    value: RaidFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => setFilters(DEFAULT_RAID_FILTERS);

  // Load the locally calculated Oracle Buy Ceilings (Accepted Prices).
  useEffect(() => {
    if (window.electronAPI?.oracle) {
      window.electronAPI.oracle
        .getAcceptedPrices()
        .then((res) => {
          if (res?.map) {
            const ceilingNumbers: Record<string, number> = {};
            Object.entries(res.map).forEach(([name, info]) => {
              if (info?.acceptedPrice) ceilingNumbers[name] = info.acceptedPrice;
            });
            setCeilings(ceilingNumbers);
          }
          setAcceptedStoredAt(res.storedAt ?? null);
        })
        .catch(() => {});
    }
  }, []);

  const ceilingCount = Object.keys(ceilings).length;
  const acceptedFreshness = getFreshness(
    acceptedStoredAt,
    acceptedPriceExpiryMinutes,
  );
  const acceptedIsStale =
    freshnessWarningsEnabled && ceilingCount > 0 && acceptedFreshness.isExpired;

  const audit = useMemo(
    () => auditStock(items, ceilings),
    [items, ceilings],
  );

  const filteredRows = useMemo(() => {
    return sortRaidRows(filterRaidRows(audit.rows, filters), sortKey);
  }, [audit, filters, sortKey]);

  // Matched rows the trader has not excluded from the purchase offer.
  const selectedRows = useMemo(
    () =>
      audit.rows.filter(
        (row) =>
          typeof row.ceiling === 'number' &&
          !excludedKeys.has(raidRowKey(row)),
      ),
    [audit, excludedKeys],
  );

  // Purchase offer built only from the trader's selected listings.
  const offer = useMemo(
    () => (seller ? buildRaidOfferPayload(seller, selectedRows) : null),
    [seller, selectedRows],
  );

  const handleToggleSelected = (row: RaidAuditRow) => {
    const key = raidRowKey(row);
    setExcludedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAll = () => setExcludedKeys(new Set());

  const handleClearAll = () => {
    setExcludedKeys(
      new Set(
        audit.rows
          .filter((row) => typeof row.ceiling === 'number')
          .map(raidRowKey),
      ),
    );
  };

  const isFilterActive = isAnyRaidFilterActive(filters);

  const activeBookmarkKey = seller ? `${seller.marketplace}:${seller.id}` : null;
  const isSellerBookmarked = bookmarks.some(
    (b) => `${b.marketplace}:${b.handle}` === activeBookmarkKey,
  );

  const openExternal = (url: string) => {
    if (window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    }
  };

  const runScan = async (ref: RaidStorefrontRef) => {
    if (!ref.scanSupported) {
      setError(
        `${getRaidMarketplaceName(ref.marketplace)} storefronts are not connected yet — Skinport, CSFloat and DMarket are live.`,
      );
      return;
    }

    // Every scan supersedes any in-flight one. Stale responses are dropped by
    // comparing this token, so a slow earlier request can never overwrite the
    // shop the trader scanned last.
    const seq = ++scanSeq.current;
    setIsScanning(true);
    setError(null);
    // Clear the previous shop immediately so its cards never linger.
    setSeller(null);
    setItems([]);
    setScannedAt(null);
    setExcludedKeys(new Set());
    setIsNegotiationOpen(false);
    setSessionIdempotencyKey(null);

    try {
      const api = window.electronAPI;
      let normalized: { seller: RaidSeller; items: RaidStockItem[] };

      if (ref.marketplace === 'skinport') {
        normalized = normalizeSkinportShop(await api.skinport.getShop(ref.handle));
      } else if (ref.marketplace === 'csfloat') {
        normalized = normalizeCsFloatStall(
          await api.csfloat.getStall(ref.handle),
          ref.handle,
        );
      } else if (ref.marketplace === 'dmarket') {
        normalized = normalizeDmarketStore(
          await api.dmarket.getStore(ref.handle),
          ref.handle,
        );
      } else {
        if (seq === scanSeq.current) {
          setError(
            `${getRaidMarketplaceName(ref.marketplace)} storefronts are not connected yet.`,
          );
        }
        return;
      }

      if (seq !== scanSeq.current) return;

      setSeller(normalized.seller);
      setItems(normalized.items);
      setScannedAt(Date.now());

      // Preload 14-day price history for the whole seller in one batch so each
      // card's trend sparkline resolves immediately.
      const trendNames = Array.from(
        new Set(normalized.items.map((item) => item.marketHashName)),
      );
      if (trendNames.length > 0) {
        useTrendStore.getState().fetchHistoryBatch(trendNames, 14);
      }

      toast.success(
        `Scanned ${normalized.items.length} listings from ${normalized.seller.name}`,
      );
    } catch (err: any) {
      if (seq !== scanSeq.current) return;
      setSeller(null);
      setItems([]);
      setScannedAt(null);
      setError(err?.message || 'Storefront scan failed.');
      toast.error(err?.message || 'Storefront scan failed.');
    } finally {
      if (seq === scanSeq.current) setIsScanning(false);
    }
  };

  const handlePaste = async () => {
    try {
      // Main reads the clipboard and returns only a validated storefront ref —
      // raw clipboard text (which may hold API keys) never reaches the renderer.
      const result = await window.electronAPI.raid.pasteStorefront();
      if (!result?.ok || !result.ref) {
        toast(result?.error || 'Clipboard does not contain a storefront link.');
        return;
      }
      setInput(result.ref.canonicalUrl);
      setError(null);
      inputRef.current?.focus();
    } catch {
      toast.error('Could not read the clipboard.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseStorefrontUrl(input);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    runScan(parsed.ref);
  };

  const handleRescan = () => {
    if (!seller) return;
    runScan({
      marketplace: seller.marketplace,
      handle: seller.id,
      originalUrl: seller.url,
      canonicalUrl: seller.url,
      scanSupported: true,
    });
  };

  const handleStartLiveRoom = () => {
    if (!offer || offer.summary.itemCount === 0) return;

    if (sessionIdempotencyKey) {
      setIsNegotiationOpen(true);
      return;
    }

    const cryptoApi = (globalThis as any)?.crypto;
    const key =
      typeof cryptoApi?.randomUUID === 'function'
        ? String(cryptoApi.randomUUID())
        : `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 12)}`;
    setSessionIdempotencyKey(key);
    setIsNegotiationOpen(true);
  };

  const handleExportOffer = async () => {
    if (!seller || selectedRows.length === 0) return;
    setIsExportingOffer(true);
    try {
      const payload = buildRaidOfferPayload(seller, selectedRows);
      const result = await window.electronAPI.raid.exportOffer(payload);
      if (result?.canceled) return;
      toast.success(
        result?.filePath
          ? `Offer exported to ${result.filePath}`
          : 'Offer exported',
      );
    } catch (err: any) {
      toast.error(err?.message || 'Offer export failed.');
    } finally {
      setIsExportingOffer(false);
    }
  };

  const handleToggleBookmark = () => {
    if (!seller) return;
    if (isSellerBookmarked) {
      setBookmarks(removeRaidBookmark(seller.marketplace, seller.id));
      toast('Seller removed from saved list');
      return;
    }
    setBookmarks(
      upsertRaidBookmark({
        marketplace: seller.marketplace,
        handle: seller.id,
        name: seller.name,
        url: seller.url,
        savedAt: new Date().toISOString(),
      }),
    );
    toast.success('Seller saved for quick rescanning');
  };

  const handleSelectBookmark = (bookmark: RaidBookmark) => {
    setInput(bookmark.url);
    runScan({
      marketplace: bookmark.marketplace,
      handle: bookmark.handle,
      originalUrl: bookmark.url,
      canonicalUrl: bookmark.url,
      scanSupported: bookmark.marketplace === 'skinport',
    });
  };

  const handleRemoveBookmark = (bookmark: RaidBookmark) => {
    setBookmarks(removeRaidBookmark(bookmark.marketplace, bookmark.handle));
  };

  return (
    <div style={styles.container}>
      <RaidScreenHeader
        ceilingCount={ceilingCount}
        acceptedStoredAt={acceptedStoredAt}
        acceptedIsStale={acceptedIsStale}
      />

      {/* Storefront Search */}
      <RaidStorefrontSearch
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onPaste={handlePaste}
        isScanning={isScanning}
        inputRef={inputRef}
      />

      <RaidBookmarks
        bookmarks={bookmarks}
        activeKey={activeBookmarkKey}
        onSelect={handleSelectBookmark}
        onRemove={handleRemoveBookmark}
      />

      {error && (
        <div style={styles.errorBanner}>
          <AlertTriangle size={14} style={styles.errorIcon} />
          <span>{error}</span>
        </div>
      )}

      {/* Seller Results */}
      {seller ? (
        <>
          <RaidSellerHeader
            seller={seller}
            scannedAt={scannedAt}
            loadedCount={items.length}
            isBookmarked={isSellerBookmarked}
            isScanning={isScanning}
            onToggleBookmark={handleToggleBookmark}
            onRescan={handleRescan}
            onOpenStorefront={() => openExternal(seller.url)}
          />

          <RaidStatCards summary={audit.summary} />

          <RaidFilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            isFilterActive={isFilterActive}
            sortKey={sortKey}
            onSortChange={setSortKey}
            visibleCount={filteredRows.length}
            totalCount={audit.summary.totalItems}
          />

          {/* Purchase Offer action — always visible so the export path is
              discoverable; disabled with a reason when there is nothing to offer. */}
          <RaidOfferBar
            offer={offer}
            valuedItems={audit.summary.valuedItems}
            itemCount={items.length}
            selectedCount={selectedRows.length}
            hasSession={Boolean(sessionIdempotencyKey)}
            isExporting={isExportingOffer}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            onStartLiveRoom={handleStartLiveRoom}
            onExportOffer={handleExportOffer}
          />

          {items.length === 0 ? (
            <div style={styles.emptyState}>
              <Crosshair size={38} style={styles.emptyIcon} />
              <h3 style={styles.emptyTitle}>No Auditable Listings</h3>
              <p style={styles.emptySubtitle}>
                {seller.marketplace === 'csfloat'
                  ? 'This CSFloat stall has no buy-now listings. Auction listings are excluded from the audit because their price is a live bid, not the seller\u2019s asking price.'
                  : 'This seller has no listings to audit right now.'}
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div style={styles.emptyState}>
              <Crosshair size={38} style={styles.emptyIcon} />
              <h3 style={styles.emptyTitle}>No Listings Match The RAID Zone</h3>
              <p style={styles.emptySubtitle}>
                {audit.summary.raidCount === 0
                  ? 'This seller has no listings at or below your Buy Ceilings. Widen the criteria or recalculate accepted prices.'
                  : 'Your filters excluded every raid. Relax the spread/profit floors or clear the search.'}
              </p>
              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={styles.resetBtn}
                >
                  Reset Raid Filters
                </button>
              )}
            </div>
          ) : (
            <div style={styles.grid}>
              {filteredRows.map((row) => (
                <RaidItemCard
                  key={`${row.item.marketplace}:${row.item.id}`}
                  row={row}
                  isSelected={!excludedKeys.has(raidRowKey(row))}
                  onToggleSelected={handleToggleSelected}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <RaidIntroState />
      )}

      {seller && sessionIdempotencyKey && (
        <RaidNegotiationModal
          seller={seller}
          rows={selectedRows}
          sessionIdempotencyKey={sessionIdempotencyKey}
          isOpen={isNegotiationOpen}
          onClose={() => setIsNegotiationOpen(false)}
          onEndSession={() => {
            setIsNegotiationOpen(false);
            setSessionIdempotencyKey(null);
          }}
          onTopUp={() => {
            setIsNegotiationOpen(false);
            setSessionIdempotencyKey(null);
            navigate('/balance');
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Styles extracted to bottom per TONE_AND_UI_STYLE_GUIDE.md
// ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '1380px',
    margin: '0 auto',
    paddingBottom: '40px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '12.5px',
    fontWeight: 600,
  },
  errorIcon: { flexShrink: 0 },
  grid: {
    display: 'grid',
    width: '100%',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '16px',
    alignItems: 'start',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 20px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px dashed var(--so-border-subtle, #1e2430)',
    textAlign: 'center',
    gap: '10px',
  },
  emptyIcon: { color: 'var(--so-text-muted, #475569)' },
  emptyTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  emptySubtitle: {
    margin: 0,
    maxWidth: '480px',
    fontSize: '13px',
    color: 'var(--so-text-muted, #64748b)',
    lineHeight: 1.45,
  },
  resetBtn: {
    marginTop: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

function raidRowKey(row: RaidAuditRow): string {
  return `${row.item.marketplace}:${row.item.id}`;
}

export default RaidScreen;
