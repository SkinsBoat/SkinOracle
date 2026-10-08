import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Package, RotateCw, Search } from "lucide-react";
import type {
  SkinscomCreateDepositItem,
  SkinscomInventoryItem,
} from "../../../../shared/types/skinscom.types";
import { confirmModal } from "../../../store/useConfirmStore";
import { useLayoutStore } from "../../../store/useLayoutStore";
import { handleSkinsComReferenceLink } from "../../../utils/marketUrls";
import type { ListingPriceInfo } from "../../../../shared/types/csfloat.types";
import { MAX_DEPOSIT_ITEMS } from "../constants";
import { chunkArray, isInventoryListed, usdToCents } from "../utils/skinscomUtils";
import { useSkinscomInventory } from "../hooks/useSkinscomInventory";
import { SkinscomInventoryCard } from "../components/SkinscomInventoryCard";
import { InventoryBatchBar } from "../components/InventoryBatchBar";
import {
  SkinscomLookupModal,
  type SkinscomLookupItem,
} from "../components/SkinscomLookupModal";

type StatusFilter = "all" | "warning" | "noTarget" | "deposited";

interface SkinscomListingsTabProps {
  hasKey: boolean;
  /** Oracle Sell Targets (listing prices), lifted to the workstation. */
  listingPriceMap: Record<string, ListingPriceInfo>;
  /** Reports inventory counts up to the workstation header. */
  onStats?: (stats: { total: number; depositable: number }) => void;
}

interface PendingDeposit {
  item: SkinscomInventoryItem;
  coinValue: number;
}

/**
 * Skins.com Listings & Inventory tab.
 *
 * Inventory view only (Active Listings is phase 2 — the Trading API has no
 * "get my deposits" endpoint). The single action is **List** (deposit):
 * `POST /trading/deposit`, chunked to the 20-item request cap. Each item keeps
 * its own price seeded from the Oracle Sell Target. Filters surface risky
 * listings (below Skins Suggested) and items without a Sell Target.
 */
export const SkinscomListingsTab: React.FC<SkinscomListingsTabProps> = ({
  hasKey,
  listingPriceMap,
  onStats,
}) => {
  const { items, loading, hasLoaded, fetchInventory, removeItems } =
    useSkinscomInventory(hasKey);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [lookupItem, setLookupItem] = useState<SkinscomLookupItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const isSidebarExpanded = useLayoutStore((s) => s.isSidebarExpanded);

  // Oracle Sell Targets (listing prices) in USD cents, keyed by market name.
  const sellTargets = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(listingPriceMap).forEach(([name, info]) => {
      if (info?.listingPrice && info.listingPrice > 0) {
        map[name] = Math.round(info.listingPrice * 100);
      }
    });
    return map;
  }, [listingPriceMap]);

  const openOnSkinscom = (name: string) => {
    const url = handleSkinsComReferenceLink(name);
    if (url && window.electronAPI?.app?.openExternal) {
      window.electronAPI.app.openExternal(url);
    }
  };

  // Seed each item's list price from the Oracle Sell Target (fallback: Skins
  // suggested, then market value).
  useEffect(() => {
    setPrices((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        if (next[it.id] === undefined) {
          const base =
            sellTargets[it.market_name] ??
            (it.suggested_price && it.suggested_price > 0
              ? it.suggested_price
              : it.market_value);
          next[it.id] = (base / 100).toFixed(2);
        }
      });
      return next;
    });
  }, [items, sellTargets]);

  // Load/Reload Oracle: overwrite every item's price with its Oracle Sell
  // Target (fallback: Skins suggested, then market value).
  useEffect(() => {
    if (!sellTargets || Object.keys(sellTargets).length === 0) return;
    setPrices((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        const base =
          sellTargets[it.market_name] ??
          (it.suggested_price && it.suggested_price > 0
            ? it.suggested_price
            : it.market_value);
        next[it.id] = (base / 100).toFixed(2);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellTargets]);

  const depositableCount = useMemo(
    () => items.filter((i) => !isInventoryListed(i)).length,
    [items],
  );

  useEffect(() => {
    onStats?.({ total: items.length, depositable: depositableCount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, depositableCount]);

  const isWarning = (item: SkinscomInventoryItem): boolean => {
    if (isInventoryListed(item)) return false;
    const cents = usdToCents(prices[item.id] ?? "");
    return (
      cents !== null &&
      !!item.suggested_price &&
      item.suggested_price > 0 &&
      cents < item.suggested_price
    );
  };

  const counts = useMemo(() => {
    let warning = 0;
    let noTarget = 0;
    let deposited = 0;
    items.forEach((it) => {
      if (isWarning(it)) warning += 1;
      if (!sellTargets[it.market_name]) noTarget += 1;
      if (isInventoryListed(it)) deposited += 1;
    });
    return { all: items.length, warning, noTarget, deposited };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sellTargets, prices]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (q && !it.market_name.toLowerCase().includes(q)) return false;
      if (statusFilter === "deposited") return isInventoryListed(it);
      if (statusFilter === "warning") return isWarning(it);
      if (statusFilter === "noTarget") return !sellTargets[it.market_name];
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, search, statusFilter, sellTargets, prices]);

  const selectedItems = useMemo(
    () => items.filter((i) => selected[i.id] && !isInventoryListed(i)),
    [items, selected],
  );
  const selectedCount = selectedItems.length;

  const handlePriceChange = (id: number, value: string) =>
    setPrices((prev) => ({ ...prev, [id]: value }));

  const handleToggleSelect = (id: number) =>
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  /** Align every below-suggested item's price up to the Skins suggested price. */
  const handleAlignAll = () => {
    const updates: Record<number, string> = {};
    let count = 0;
    items.forEach((it) => {
      if (isInventoryListed(it) || !it.suggested_price || it.suggested_price <= 0)
        return;
      const cents = usdToCents(prices[it.id] ?? "");
      if (cents !== null && cents < it.suggested_price) {
        updates[it.id] = (it.suggested_price / 100).toFixed(2);
        count += 1;
      }
    });
    if (count === 0) {
      toast.error("No items are below the Skins suggested price");
      return;
    }
    setPrices((prev) => ({ ...prev, ...updates }));
    toast.success(`Aligned ${count} item(s) to Skins Suggested`);
  };

  /** Deposit a set of items, chunked to the API cap, salvaging per-item. */
  const deposit = async (chosen: PendingDeposit[]) => {
    let ok = 0;
    let failed = 0;
    let failMsg = "";

    for (const chunk of chunkArray(chosen, MAX_DEPOSIT_ITEMS)) {
      const payload: SkinscomCreateDepositItem[] = chunk.map((c) => ({
        id: c.item.id,
        asset_id: c.item.asset_id,
        coin_value: c.coinValue,
      }));
      try {
        await window.electronAPI.skinscom.createDeposit(payload);
        ok += chunk.length;
        removeItems(chunk.map((c) => c.item.id));
      } catch {
        // A single bad item fails the whole chunk (422); retry individually.
        for (const c of chunk) {
          try {
            await window.electronAPI.skinscom.createDeposit([
              {
                id: c.item.id,
                asset_id: c.item.asset_id,
                coin_value: c.coinValue,
              },
            ]);
            ok += 1;
            removeItems([c.item.id]);
          } catch (err: any) {
            failed += 1;
            failMsg = err.message;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    return { ok, failed, failMsg };
  };

  const handleList = async (item: SkinscomInventoryItem, coinValue: number) => {
    setProcessingId(item.id);
    const toastId = toast.loading("Creating listing...");
    try {
      await window.electronAPI.skinscom.createDeposit([
        { id: item.id, asset_id: item.asset_id, coin_value: coinValue },
      ]);
      removeItems([item.id]);
      setSelected((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      toast.success(`Listed ${item.market_name}`, { id: toastId });
    } catch (err: any) {
      toast.error(`List failed: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleListSelected = async () => {
    const chosen: PendingDeposit[] = selectedItems
      .map((item) => ({ item, coinValue: usdToCents(prices[item.id] ?? "") }))
      .filter((c): c is PendingDeposit => c.coinValue !== null);

    if (chosen.length === 0) {
      toast.error("No selected items have a valid list price");
      return;
    }

    const confirmed = await confirmModal({
      title: "Create Listings?",
      message: `List ${chosen.length} item(s) for sale on Skins.com? Each item is deposited at its own entered price.`,
      confirmText: `List ${chosen.length} Item(s)`,
      cancelText: "Cancel",
    });
    if (!confirmed) return;

    setBatchProcessing(true);
    const toastId = toast.loading(`Creating ${chosen.length} listing(s)...`);
    const { ok, failed, failMsg } = await deposit(chosen);
    setBatchProcessing(false);
    setSelected({});
    if (failed > 0) {
      toast.error(
        `Listed ${ok}, failed ${failed}${failMsg ? ` — ${failMsg}` : ""}`,
        { id: toastId },
      );
    } else {
      toast.success(`Listed ${ok} item(s)`, { id: toastId });
    }
  };

  const statusChips: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "warning", label: "Below Suggested", count: counts.warning },
    { key: "noTarget", label: "Unmatched", count: counts.noTarget },
    { key: "deposited", label: "Deposited", count: counts.deposited },
  ];

  return (
    <div style={styles.container}>
      {/* Toolbar: search + situational filters */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <div style={styles.searchWrapper}>
            <Search size={13} style={styles.searchIcon} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inventory..."
              style={styles.searchInput}
            />
          </div>
          {statusChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setStatusFilter(c.key)}
              className={`btn ${statusFilter === c.key ? "btn-primary" : "btn-outline"} btn-sm`}
              style={styles.chip}
            >
              {c.label} ({c.count})
            </button>
          ))}
        </div>
        <div style={styles.toolbarRight}>
          <span style={styles.statItem}>
            Inventory: <strong>{items.length}</strong>
          </span>
          <span style={styles.statItem}>
            Depositable: <strong>{depositableCount}</strong>
          </span>
          <button
            onClick={handleAlignAll}
            disabled={counts.warning === 0}
            className="btn btn-secondary btn-sm"
            style={styles.alignAllButton}
            title="Set every below-suggested item's price to its Skins suggested price"
          >
            Align All ({counts.warning})
          </button>
          <button
            onClick={fetchInventory}
            disabled={loading || !hasKey}
            className="btn btn-primary btn-sm"
            style={styles.syncButton}
          >
            {loading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <RotateCw size={14} />
            )}{" "}
            Sync Inventory
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <InventoryBatchBar
          selectedCount={selectedCount}
          isSidebarExpanded={isSidebarExpanded}
          onListSelected={handleListSelected}
          onClear={() => setSelected({})}
          processing={batchProcessing}
        />
      )}

      {/* Inventory grid */}
      <div style={styles.scrollView}>
        {filteredItems.length === 0 ? (
          <div className="card" style={styles.emptyCard}>
            <Package size={32} style={styles.emptyIcon} />
            <div style={styles.emptyTitle}>
              {loading
                ? "Syncing inventory..."
                : !hasLoaded
                  ? "No inventory synced"
                  : "No items match these filters"}
            </div>
            <div style={styles.emptySubtitle}>
              {hasKey
                ? 'Click "Sync Inventory" to load your Steam CS2 items from Skins.com.'
                : "Add your Skins.com API key in Settings to load your inventory."}
            </div>
          </div>
        ) : (
          <div style={getCardsGridStyle(selectedCount > 0)}>
            {filteredItems.map((item) => (
              <SkinscomInventoryCard
                key={item.id}
                item={item}
                sellTargetCents={sellTargets[item.market_name] ?? null}
                isSelected={!!selected[item.id]}
                onToggleSelect={() => handleToggleSelect(item.id)}
                price={prices[item.id] ?? ""}
                onPriceChange={(v) => handlePriceChange(item.id, v)}
                isProcessing={processingId === item.id}
                onList={handleList}
                onOpenMarket={openOnSkinscom}
                onOpenLookup={(it) =>
                  setLookupItem({
                    name: it.market_name,
                    iconUrl: it.icon_url,
                    marketPrice: it.market_value / 100,
                    suggestedPrice: it.suggested_price
                      ? it.suggested_price / 100
                      : undefined,
                    sellTargetPrice: sellTargets[it.market_name]
                      ? sellTargets[it.market_name] / 100
                      : undefined,
                  })
                }
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

// ── STYLES ───────────────────────────────────────────────────────────

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
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "8px 14px",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: 0,
  },
  toolbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-sm)",
    padding: "4px 8px",
  },
  searchIcon: {
    color: "var(--so-text-muted)",
  },
  searchInput: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--so-text-primary)",
    fontSize: "12px",
    minWidth: "180px",
  },
  chip: {
    fontSize: "10.5px",
    padding: "3px 8px",
  },
  toolbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginLeft: "auto",
  },
  statItem: {
    fontSize: "11.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
  },
  syncButton: {
    fontWeight: 800,
  },
  alignAllButton: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontWeight: 700,
  },
  scrollView: {
    flex: 1,
    overflowY: "auto",
    minHeight: 0,
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
