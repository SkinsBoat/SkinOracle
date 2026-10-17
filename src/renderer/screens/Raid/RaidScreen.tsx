import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ClipboardPaste,
  Crosshair,
  FileDown,
  Radar,
  Search,
  ShieldCheck,
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
import { formatTimeAgo } from '../../utils/timeAgo';
import { getFreshness } from '../../utils/dataFreshness';
import { getMarketItemUrl } from '../../utils/marketUrls';
import {
  auditStock,
  buildRaidOfferPayload,
  filterRaidRows,
  formatUsd,
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

/**
 * RAID — Targeted Seller Auditor.
 *
 * Paste a single seller's storefront link, stream their listed stock, and audit
 * every listing against the trader's locally calculated Oracle Buy Ceilings to
 * surface the "Raid Zone" (items at or below the ceiling).
 */
export const RaidScreen: React.FC = () => {
  const [input, setInput] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seller, setSeller] = useState<RaidSeller | null>(null);
  const [items, setItems] = useState<RaidStockItem[]>([]);
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const [isExportingOffer, setIsExportingOffer] = useState(false);

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

  const handleOpenListing = (row: RaidAuditRow) => {
    // Always route through the centralized market URL generator so links stay
    // valid (e.g. Skinport falls back to its market search URL).
    const url =
      getMarketItemUrl(row.item.marketplace, row.item.marketHashName) ||
      row.item.listingUrl ||
      undefined;
    if (url) openExternal(url);
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
      {/* Screen Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <div style={styles.iconBox}>
            <Crosshair size={20} style={styles.headerIcon} />
          </div>
          <div>
            <div style={styles.titleLine}>
              <h1 style={styles.title}>RAID</h1>
              <span style={styles.subtitleBadge}>Seller Auditor</span>
            </div>
            <p style={styles.subtitle}>
              Lock onto one seller — value their entire listed stock and hunt
              every listing under your Buy Ceilings.
            </p>
          </div>
        </div>

        <div style={styles.ceilingStatus}>
          <ShieldCheck size={13} style={styles.ceilingStatusIcon} />
          <span>
            Buy Ceilings: {ceilingCount}{' '}
            {ceilingCount === 1 ? 'item' : 'items'}
            {acceptedStoredAt
              ? ` • calculated ${formatTimeAgo(acceptedStoredAt)}`
              : ' • not calculated yet'}
          </span>
        </div>
      </div>

      {/* Stale Buy-Ceiling Warning */}
      {acceptedIsStale && (
        <div style={styles.staleBanner}>
          <AlertTriangle size={15} style={styles.staleIcon} />
          <span style={styles.staleText}>
            Buy ceilings expired
            {acceptedStoredAt
              ? ` (calculated ${formatTimeAgo(acceptedStoredAt)})`
              : ''}{' '}
            — raid results may use stale ceilings. Recalculate accepted prices
            in Pricing Central.
          </span>
          <span style={styles.staleBadge}>EXPIRED</span>
        </div>
      )}

      {/* Storefront Search */}
      <form onSubmit={handleSubmit} style={styles.searchRow}>
        <div style={getInputWrapperStyle(isSearchFocused)}>
          <Radar size={16} style={styles.inputIcon} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Paste a seller storefront link — Skinport shop, CSFloat stall, or DMarket store"
            style={styles.input}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          onClick={handlePaste}
          style={styles.pasteBtn}
          title="Paste a storefront link from your clipboard (validated in the main process)"
        >
          <ClipboardPaste size={15} />
          <span>Paste</span>
        </button>
        <button
          type="submit"
          disabled={!input.trim()}
          style={getScanBtnStyle(!input.trim())}
        >
          <Search size={15} />
          <span>{isScanning ? 'Scanning…' : 'Scan Storefront'}</span>
        </button>
      </form>

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
          <div style={styles.offerBar}>
            <span style={styles.offerInfo}>
              {offer && offer.summary.itemCount > 0
                ? `${offer.summary.itemCount} of ${audit.summary.valuedItems} matched selected · ${formatUsd(
                    offer.summary.ceilingTotal,
                  )} total offer.`
                : audit.summary.valuedItems > 0
                  ? 'All matched listings are excluded from the offer — re-select any you want to include.'
                  : items.length === 0
                    ? 'No auditable listings to offer on.'
                    : 'No seller listings matched a local Buy Ceiling — recalculate accepted prices.'}
            </span>
            <div style={styles.offerActions}>
              {audit.summary.valuedItems > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    style={styles.selectAllBtn}
                    title="Include every matched listing in the offer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={styles.selectAllBtn}
                    title="Exclude every matched listing from the offer"
                  >
                    Clear
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleExportOffer}
                disabled={
                  isExportingOffer || !offer || offer.summary.itemCount === 0
                }
                style={getOfferBtnStyle(
                  isExportingOffer || !offer || offer.summary.itemCount === 0,
                )}
                title="Export a PDF purchase offer for the selected listings"
              >
                <FileDown size={14} />
                <span>
                  {isExportingOffer
                    ? 'Exporting…'
                    : `Export Purchase Offer${
                        offer && offer.summary.itemCount > 0
                          ? ` (${offer.summary.itemCount})`
                          : ''
                      }`}
                </span>
              </button>
            </div>
          </div>

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
                  onOpenListing={handleOpenListing}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={styles.introState}>
          <Radar size={40} style={styles.emptyIcon} />
          <h3 style={styles.emptyTitle}>Lock Onto A Seller</h3>
          <p style={styles.emptySubtitle}>
            Paste a seller's storefront link to value their entire stock and
            flag every listing priced below your Buy Ceilings.
          </p>
          <div style={styles.steps}>
            <Step
              index={1}
              title="Paste the storefront"
              text="Skinport shops, CSFloat stalls and DMarket stores are live. CS.MONEY and Steam inventory links are recognized next."
            />
            <Step
              index={2}
              title="We stream the stock"
              text="Every listing is fetched directly from your machine and priced in USD."
            />
            <Step
              index={3}
              title="RAID the zone"
              text="Items at or below your Oracle Buy Ceilings light up green with dollar spreads and profit percentages."
            />
          </div>
        </div>
      )}
    </div>
  );
};

const Step: React.FC<{ index: number; title: string; text: string }> = ({
  index,
  title,
  text,
}) => (
  <div style={styles.step}>
    <span style={styles.stepIndex}>{index}</span>
    <div style={styles.stepTextGroup}>
      <span style={styles.stepTitle}>{title}</span>
      <span style={styles.stepText}>{text}</span>
    </div>
  </div>
);

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
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerIcon: { color: '#4ade80' },
  titleLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 900,
    letterSpacing: '2px',
    color: 'var(--so-text-primary, #f8fafc)',
    lineHeight: 1.2,
  },
  subtitleBadge: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    padding: '2px 8px',
    borderRadius: '20px',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    color: '#38bdf8',
    textTransform: 'uppercase',
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12.5px',
    color: 'var(--so-text-muted, #94a3b8)',
  },
  ceilingStatus: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    height: '34px',
    padding: '0 12px',
    borderRadius: '8px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '12px',
    fontWeight: 700,
  },
  ceilingStatusIcon: { color: '#38bdf8' },
  staleBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fbbf24',
    fontSize: '12px',
    fontWeight: 700,
  },
  staleIcon: { color: '#f59e0b', flexShrink: 0 },
  staleText: { flex: 1, lineHeight: 1.4 },
  staleBadge: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    border: '1px solid rgba(245, 158, 11, 0.45)',
    color: '#fbbf24',
    flexShrink: 0,
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  pasteBtn: {
    height: '42px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 14px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  },
  inputWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '42px',
    padding: '0 14px',
    borderRadius: 'var(--so-radius-sm, 6px)',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-medium, #2a3342)',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  inputIcon: { color: 'var(--so-text-muted, #64748b)', flexShrink: 0 },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    outline: 'none',
    boxShadow: 'none',
    color: 'var(--so-text-primary, #f8fafc)',
    fontSize: '13.5px',
    fontWeight: 600,
    fontFamily: 'var(--so-font-sans)',
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
  offerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '10px 12px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
  },
  offerInfo: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--so-text-muted, #94a3b8)',
    lineHeight: 1.4,
    flex: 1,
    minWidth: '220px',
  },
  offerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  selectAllBtn: {
    height: '30px',
    padding: '0 10px',
    borderRadius: '7px',
    backgroundColor: 'transparent',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    color: 'var(--so-text-secondary, #94a3b8)',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',
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
  introState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '44px 20px',
    borderRadius: '12px',
    backgroundColor: 'var(--so-surface-card, #131720)',
    border: '1px dashed var(--so-border-subtle, #1e2430)',
    textAlign: 'center',
    gap: '12px',
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
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '12px',
    width: '100%',
    maxWidth: '900px',
    marginTop: '8px',
  },
  step: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: 'var(--so-surface-input, #0d1117)',
    border: '1px solid var(--so-border-subtle, #1e2430)',
    textAlign: 'left',
  },
  stepIndex: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    color: '#4ade80',
    fontSize: '11px',
    fontWeight: 900,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTextGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  stepTitle: {
    fontSize: '12.5px',
    fontWeight: 800,
    color: 'var(--so-text-primary, #f8fafc)',
  },
  stepText: {
    fontSize: '11.5px',
    color: 'var(--so-text-muted, #94a3b8)',
    lineHeight: 1.4,
  },
};

function getInputWrapperStyle(isFocused: boolean): React.CSSProperties {
  return {
    ...styles.inputWrapper,
    borderColor: isFocused
      ? 'var(--so-border-focus, #2563eb)'
      : 'var(--so-border-medium, #2a3342)',
    boxShadow: isFocused ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
  };
}

function raidRowKey(row: RaidAuditRow): string {
  return `${row.item.marketplace}:${row.item.id}`;
}

function getOfferBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '34px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '0 14px',
    borderRadius: '8px',
    backgroundColor: disabled ? 'rgba(37, 99, 235, 0.35)' : '#2563eb',
    border: 'none',
    color: disabled ? 'rgba(255, 255, 255, 0.6)' : '#ffffff',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    boxShadow: disabled ? 'none' : '0 3px 10px rgba(37, 99, 235, 0.28)',
  };
}

function getScanBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    height: '42px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
    padding: '0 18px',
    borderRadius: '10px',
    backgroundColor: disabled ? 'rgba(22, 163, 74, 0.4)' : '#16a34a',
    border: 'none',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800,
    cursor: disabled ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    boxShadow: disabled ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.28)',
  };
}

export default RaidScreen;
