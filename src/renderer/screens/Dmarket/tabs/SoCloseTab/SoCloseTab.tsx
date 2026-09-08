import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Wallet,
  Search,
  X,
  Zap,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Eye,
  PlusCircle,
} from "lucide-react";
import { getWearShortcut, SoCloseResultItem } from "../../dmarket-utils";
import { isMarketMatch } from "../../../../../shared/canonicalMarkets";
import TrendSparkline from "../../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../../components/CopyMarketHashButton";
import { useTrendStore } from "../../../../store/useTrendStore";

export interface SoCloseTabProps {
  hasKey: boolean;
  targets: any[];
  balanceData: {
    usdFormatted?: string;
    usdCents?: number;
    balance?: number;
  } | null;
  isSidebarExpanded: boolean;
  onTargetsUpdated: () => void;
  onOpenLookupModal: (
    name: string,
    targetPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => void;
  onOpenMarket: (title: string) => void;
}

export const SoCloseTab: React.FC<SoCloseTabProps> = ({
  hasKey,
  targets,
  balanceData,
  isSidebarExpanded,
  onTargetsUpdated,
  onOpenLookupModal,
  onOpenMarket,
}) => {
  const [soCloseResults, setSoCloseResults] = useState<SoCloseResultItem[]>([]);
  const [isSoCloseRunning, setIsSoCloseRunning] = useState(false);
  const [soCloseMinPrice, setSoCloseMinPrice] = useState<string>("1");
  const [soCloseMaxPrice, setSoCloseMaxPrice] = useState<string>("50");
  const [soCloseMaxCloseness, setSoCloseMaxCloseness] = useState<number>(1.08);
  const [soCloseAllowedWears, setSoCloseAllowedWears] = useState({
    fn: true,
    mw: true,
    ft: true,
    ww: true,
    bs: true,
    souvenir: true,
    sticker: true,
  });
  const [selectedSoCloseItems, setSelectedSoCloseItems] = useState<
    Record<string, boolean>
  >({});
  const [soCloseProcessingName, setSoCloseProcessingName] = useState<
    string | null
  >(null);
  const [batchSoCloseProcessing, setBatchSoCloseProcessing] = useState(false);
  const [soCloseSearchQuery, setSoCloseSearchQuery] = useState("");

  const selectedSoCloseCount = useMemo(() => {
    return Object.values(selectedSoCloseItems).filter(Boolean).length;
  }, [selectedSoCloseItems]);

  const filteredSoCloseResults = useMemo(() => {
    if (!soCloseSearchQuery.trim()) return soCloseResults;
    const q = soCloseSearchQuery.toLowerCase().trim();
    return soCloseResults.filter((r) => r.name.toLowerCase().includes(q));
  }, [soCloseResults, soCloseSearchQuery]);

  const handleSetBalanceAsMax = () => {
    if (
      balanceData &&
      typeof balanceData.usdCents === "number" &&
      balanceData.usdCents > 0
    ) {
      const dollarVal = (balanceData.usdCents / 100).toFixed(2);
      setSoCloseMaxPrice(dollarVal);
      toast.success(`Max price set to DMarket balance ($${dollarVal})`);
    } else {
      toast.error("DMarket balance is unavailable or $0.00");
    }
  };

  const runSoCloseScan = async () => {
    setIsSoCloseRunning(true);
    setSelectedSoCloseItems({});
    const toastId = toast.loading("Running DMarket So Close market scan...");

    try {
      const acceptedRes: {
        map: Record<
          string,
          { acceptedPrice: number; trendMomentum14d?: number }
        >;
        itemCount: number;
      } = await (window.electronAPI.oracle as any).getAcceptedPrices();

      if (
        !acceptedRes ||
        !acceptedRes.map ||
        Object.keys(acceptedRes.map).length === 0
      ) {
        toast.error(
          "No accepted prices found in memory. Please build Step 2 Accepted Prices in Oracle Dashboard first.",
          { id: toastId },
        );
        setIsSoCloseRunning(false);
        return;
      }

      const priceCache: Record<string, any> =
        await window.electronAPI.skinsnipe.getCache();

      const minP = Math.max(0, parseFloat(soCloseMinPrice) || 0);
      const maxP = Math.max(0, parseFloat(soCloseMaxPrice) || 9999);
      const results: SoCloseResultItem[] = [];

      const activeTargetTitlesSet = new Set(
        targets
          .map((t) => (t.title || (t as any).Title || "").toLowerCase().trim())
          .filter(Boolean),
      );
      const namesToScan = Object.keys(acceptedRes.map);

      for (const name of namesToScan) {
        const acceptedEntry = acceptedRes.map[name];
        if (!acceptedEntry || acceptedEntry.acceptedPrice <= 0) continue;

        const acceptedPrice = parseFloat(
          acceptedEntry.acceptedPrice.toFixed(2),
        );
        if (acceptedPrice <= 0) continue;

        const nameLower = name.toLowerCase();

        if (nameLower.includes("souvenir") && !soCloseAllowedWears.souvenir)
          continue;
        if (nameLower.includes("sticker |") && !soCloseAllowedWears.sticker)
          continue;
        if (nameLower.includes("(factory new)") && !soCloseAllowedWears.fn)
          continue;
        if (nameLower.includes("(minimal wear)") && !soCloseAllowedWears.mw)
          continue;
        if (nameLower.includes("(field-tested)") && !soCloseAllowedWears.ft)
          continue;
        if (nameLower.includes("(well-worn)") && !soCloseAllowedWears.ww)
          continue;
        if (nameLower.includes("(battle-scarred)") && !soCloseAllowedWears.bs)
          continue;

        const cacheItem = priceCache ? priceCache[name] : null;
        let dmarketPrice = 0;
        if (cacheItem?.l && Array.isArray(cacheItem.l)) {
          const dmarketEntry = cacheItem.l.find((m: any) =>
            isMarketMatch(m.m, "dmarket"),
          );
          if (dmarketEntry && dmarketEntry.p)
            dmarketPrice = Number(dmarketEntry.p);
        }

        if (dmarketPrice <= 0 && cacheItem?.lowestPrice) {
          dmarketPrice = Number(cacheItem.lowestPrice);
        }

        if (dmarketPrice <= 0) continue;
        if (dmarketPrice < minP || dmarketPrice > maxP) continue;

        const closeness = dmarketPrice / acceptedPrice;
        if (closeness <= soCloseMaxCloseness) {
          const hasExisting = activeTargetTitlesSet.has(
            name.toLowerCase().trim(),
          );
          results.push({
            name,
            acceptedPrice,
            currentMarketPrice: dmarketPrice,
            closeness: parseFloat(closeness.toFixed(4)),
            closenessPercent: parseFloat(((closeness - 1) * 100).toFixed(1)),
            hasExistingTarget: hasExisting,
            iconUrl: cacheItem?.icon_url,
            trendMomentum14d: acceptedEntry.trendMomentum14d,
          });
        }
      }

      results.sort((a, b) => a.closeness - b.closeness);

      // Safety limit: Never render more than 200 items
      const sliced = results.slice(0, 200);
      setSoCloseResults(sliced);
      useTrendStore.getState().fetchHistoryBatch(sliced.map((r) => r.name));
      toast.success(
        `Found ${Math.min(results.length, 200)} DMarket So Close market opportunities!`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`So Close scan error: ${err.message}`, { id: toastId });
    } finally {
      setIsSoCloseRunning(false);
    }
  };

  const handleCreateSoCloseTarget = async (item: SoCloseResultItem) => {
    if (!hasKey) {
      toast.error(
        "DMarket API keys are not configured. Please set your keys in Settings first.",
      );
      return;
    }

    setSoCloseProcessingName(item.name);
    const targetPriceDollar = parseFloat(item.acceptedPrice.toFixed(2));
    const toastId = toast.loading(
      `Creating target for ${item.name} at $${targetPriceDollar.toFixed(2)}...`,
    );

    try {
      await window.electronAPI.dmarket.createTarget(
        item.name,
        targetPriceDollar,
        1,
      );

      setSoCloseResults((prev) =>
        prev.map((r) =>
          r.name === item.name ? { ...r, hasExistingTarget: true } : r,
        ),
      );
      toast.success(
        `Target created for ${item.name} at $${targetPriceDollar.toFixed(2)}`,
        { id: toastId },
      );
      onTargetsUpdated();
    } catch (err: any) {
      toast.error(`Failed to create target: ${err.message}`, { id: toastId });
    } finally {
      setSoCloseProcessingName(null);
    }
  };

  const executeBatchSoCloseCreate = async () => {
    const selectedNames = Object.keys(selectedSoCloseItems).filter(
      (name) => selectedSoCloseItems[name],
    );
    if (!selectedNames.length) return;

    setBatchSoCloseProcessing(true);
    const toastId = toast.loading(
      `Executing batch target creation for ${selectedNames.length} items...`,
    );
    let createdCount = 0;

    for (const name of selectedNames) {
      const item = soCloseResults.find((r) => r.name === name);
      if (!item || item.hasExistingTarget) continue;

      try {
        await handleCreateSoCloseTarget(item);
        setSelectedSoCloseItems((prev) => ({ ...prev, [name]: false }));
        createdCount++;
      } catch (err) {
        console.error(`[So Close Batch Error for ${name}]:`, err);
      }
      // Pacing delay to guarantee safe rate limits
      await new Promise((r) => setTimeout(r, 600));
    }

    setBatchSoCloseProcessing(false);
    toast.success(`Completed batch target creation for ${createdCount} items`, {
      id: toastId,
    });
    onTargetsUpdated();
  };

  const selectAllSoCloseAvailable = () => {
    const newSelect: Record<string, boolean> = {};
    filteredSoCloseResults.forEach((r) => {
      if (!r.hasExistingTarget) {
        newSelect[r.name] = true;
      }
    });
    setSelectedSoCloseItems(newSelect);
  };

  const selectBestSoClose = () => {
    const newSelect: Record<string, boolean> = {};
    filteredSoCloseResults.forEach((r) => {
      if (!r.hasExistingTarget && r.closeness <= 1.05) {
        newSelect[r.name] = true;
      }
    });
    setSelectedSoCloseItems(newSelect);
  };

  const clearSoCloseSelection = () => setSelectedSoCloseItems({});

  return (
    <>
      {/* CONTROL BAR FOR SO CLOSE OPPORTUNITIES */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          padding: "8px 14px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Left Scanner Inputs & Filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Price Range Filter Inputs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--so-surface-panel)",
              border: "1px solid var(--so-border-medium)",
              padding: "4px 8px",
              borderRadius: "var(--so-radius-sm)",
              fontSize: "11px",
            }}
          >
            <span
              style={{ fontWeight: 700, color: "var(--so-text-secondary)" }}
            >
              Price Range ($):
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={soCloseMinPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSoCloseMinPrice("");
                  return;
                }
                if (val.includes("-")) return;
                const num = parseFloat(val);
                if (!isNaN(num) && num < 0) return;
                setSoCloseMinPrice(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
              }}
              placeholder="Min"
              style={{
                width: "72px",
                padding: "2px 6px",
                fontSize: "11px",
                fontWeight: 800,
                textAlign: "center",
                borderRadius: "3px",
                border: "1px solid var(--so-border-subtle)",
                background: "var(--so-surface-card)",
                color: "var(--so-text-primary)",
              }}
            />
            <span style={{ color: "var(--so-text-muted)" }}>-</span>
            <input
              type="number"
              min="0"
              step="any"
              value={soCloseMaxPrice}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setSoCloseMaxPrice("");
                  return;
                }
                if (val.includes("-")) return;
                const num = parseFloat(val);
                if (!isNaN(num) && num < 0) return;
                setSoCloseMaxPrice(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "-" || e.key === "e" || e.key === "E") {
                  e.preventDefault();
                }
              }}
              placeholder="Max"
              style={{
                width: "72px",
                padding: "2px 6px",
                fontSize: "11px",
                fontWeight: 800,
                textAlign: "center",
                borderRadius: "3px",
                border: "1px solid var(--so-border-subtle)",
                background: "var(--so-surface-card)",
                color: "var(--so-text-primary)",
              }}
            />
            <button
              type="button"
              onClick={handleSetBalanceAsMax}
              title={`Set Max Price to Available Balance (${balanceData?.usdFormatted || "$0.00"})`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2px 4px",
                borderRadius: "3px",
                background: "var(--so-surface-card)",
                border: "1px solid var(--so-border-subtle)",
                color: "var(--so-accent-cyan)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--so-accent-cyan)";
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "rgba(56, 189, 248, 0.15)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--so-border-subtle)";
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--so-surface-card)";
              }}
            >
              <Wallet size={12} />
            </button>
          </div>

          {/* Max Closeness Distance Input */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--so-surface-panel)",
              border: "1px solid var(--so-border-medium)",
              padding: "4px 8px",
              borderRadius: "var(--so-radius-sm)",
              fontSize: "11px",
            }}
          >
            <span
              style={{ fontWeight: 700, color: "var(--so-text-secondary)" }}
            >
              Max Distance:
            </span>
            <input
              type="number"
              step="0.01"
              value={soCloseMaxCloseness}
              onChange={(e) =>
                setSoCloseMaxCloseness(parseFloat(e.target.value) || 1.0)
              }
              style={{
                width: "48px",
                padding: "1px 4px",
                fontSize: "11px",
                fontWeight: 800,
                textAlign: "center",
                borderRadius: "3px",
                border: "1px solid var(--so-border-subtle)",
                background: "var(--so-surface-card)",
                color: "var(--so-text-primary)",
              }}
            />
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 800,
                color: "var(--so-accent-cyan)",
              }}
            >
              (+{((soCloseMaxCloseness - 1) * 100).toFixed(0)}%)
            </span>
          </div>

          {/* Wear Condition Selector Badges */}
          <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "var(--so-text-muted)",
                marginRight: "2px",
              }}
            >
              Wears:
            </span>
            {[
              { key: "fn", label: "FN" },
              { key: "mw", label: "MW" },
              { key: "ft", label: "FT" },
              { key: "ww", label: "WW" },
              { key: "bs", label: "BS" },
              { key: "souvenir", label: "Souvenir" },
              { key: "sticker", label: "Sticker" },
            ].map((w) => {
              const active =
                soCloseAllowedWears[w.key as keyof typeof soCloseAllowedWears];
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() =>
                    setSoCloseAllowedWears((prev) => ({
                      ...prev,
                      [w.key]: !prev[w.key as keyof typeof soCloseAllowedWears],
                    }))
                  }
                  style={{
                    padding: "2px 6px",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    borderRadius: "3px",
                    cursor: "pointer",
                    backgroundColor: active
                      ? "var(--so-primary)"
                      : "var(--so-surface-panel)",
                    color: active ? "#ffffff" : "var(--so-text-muted)",
                    border: active
                      ? "none"
                      : "1px solid var(--so-border-subtle)",
                  }}
                >
                  {w.label}
                </button>
              );
            })}
          </div>

          {/* Quick Selection Filters */}
          {soCloseResults.length > 0 && (
            <div style={{ display: "flex", gap: "5px" }}>
              <button
                onClick={selectAllSoCloseAvailable}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: "10.5px", padding: "3px 8px" }}
              >
                Select Available (
                {soCloseResults.filter((r) => !r.hasExistingTarget).length})
              </button>
              <button
                onClick={selectBestSoClose}
                className="btn btn-warning btn-sm"
                style={{ fontSize: "10.5px", padding: "3px 8px" }}
              >
                Select Best (&lt;5% Dist)
              </button>
              {selectedSoCloseCount > 0 && (
                <button
                  onClick={clearSoCloseSelection}
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "10.5px", padding: "3px 8px" }}
                >
                  Clear ({selectedSoCloseCount})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Run Scan Button & Search */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {soCloseResults.length > 0 && (
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: "8px",
                  color: "var(--so-text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={soCloseSearchQuery}
                onChange={(e) => setSoCloseSearchQuery(e.target.value)}
                placeholder="Search results..."
                style={{
                  padding: "4px 8px 4px 26px",
                  fontSize: "11px",
                  width: "140px",
                  borderRadius: "var(--so-radius-sm)",
                  border: "1px solid var(--so-border-subtle)",
                  background: "var(--so-surface-panel)",
                  color: "var(--so-text-primary)",
                }}
              />
              {soCloseSearchQuery && (
                <button
                  onClick={() => setSoCloseSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "6px",
                    background: "transparent",
                    border: "none",
                    color: "var(--so-text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: 0,
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <button
            onClick={runSoCloseScan}
            disabled={isSoCloseRunning}
            className="btn btn-primary btn-sm"
            style={{
              fontSize: "12px",
              padding: "5px 14px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isSoCloseRunning ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Zap size={13} />
            )}{" "}
            Run SoClose Scan
          </button>
        </div>
      </div>

      {/* SO CLOSE OPPORTUNITIES GRID VIEW */}
      {filteredSoCloseResults.length === 0 ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "50px 20px",
            color: "var(--so-text-muted)",
          }}
        >
          {isSoCloseRunning ? (
            <div>
              Scanning DMarket market prices against Step 2 Accepted Prices...
            </div>
          ) : soCloseResults.length > 0 && soCloseSearchQuery ? (
            <div>
              <Search
                size={32}
                style={{
                  marginBottom: "10px",
                  opacity: 0.5,
                  color: "var(--so-accent-cyan)",
                }}
              />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "var(--so-text-primary)",
                  marginBottom: "4px",
                }}
              >
                No matching opportunities
              </div>
              <div style={{ fontSize: "12px" }}>
                No results match &quot;{soCloseSearchQuery}&quot;. Clear search
                filter to view all {soCloseResults.length} scanned items.
              </div>
            </div>
          ) : (
            <div>
              <Zap
                size={32}
                style={{
                  marginBottom: "10px",
                  opacity: 0.5,
                  color: "var(--so-accent-cyan)",
                }}
              />
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "var(--so-text-primary)",
                  marginBottom: "4px",
                }}
              >
                No So Close opportunities loaded
              </div>
              <div style={{ fontSize: "12px" }}>
                Click &quot;Run SoClose Scan&quot; above to evaluate DMarket
                market prices against Oracle Accepted Prices
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: "10px",
            paddingBottom: "12px",
          }}
        >
          {filteredSoCloseResults.map((item) => {
            const isSelected = !!selectedSoCloseItems[item.name];
            const isProcessing = soCloseProcessingName === item.name;

            const match = item.name.match(/^(.+?)\s*\(([^)]+)\)$/);
            const cleanTitle = match ? match[1] : item.name;
            const wearText = match ? match[2] : "";
            const wearShortcut = getWearShortcut(wearText);

            const imageUrl = item.iconUrl
              ? `https://community.cloudflare.steamstatic.com/economy/image/${item.iconUrl}`
              : `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.name)}`;

            const cardBorderColor = isSelected
              ? "var(--so-primary)"
              : item.hasExistingTarget
                ? "var(--so-accent-cyan)"
                : item.closeness <= 1.0
                  ? "var(--so-success)"
                  : "var(--so-warning)";

            return (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "8px",
                  margin: 0,
                  position: "relative",
                  border: `1.5px solid ${cardBorderColor}`,
                  backgroundColor: isSelected
                    ? "rgba(37, 99, 235, 0.08)"
                    : "var(--so-surface-card)",
                  borderRadius: "var(--so-radius-md)",
                  padding: "8px",
                  boxShadow: isSelected
                    ? "0 0 12px rgba(37, 99, 235, 0.3)"
                    : "var(--so-shadow-sm)",
                  cursor: item.hasExistingTarget ? "default" : "pointer",
                  transition: "all 0.15s ease",
                }}
                onClick={() => {
                  if (!item.hasExistingTarget) {
                    setSelectedSoCloseItems((prev) => ({
                      ...prev,
                      [item.name]: !prev[item.name],
                    }));
                  }
                }}
              >
                {/* Top Row: Checkbox, Actions, Distance Badge */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    {!item.hasExistingTarget && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setSelectedSoCloseItems((prev) => ({
                            ...prev,
                            [item.name]: !prev[item.name],
                          }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: "pointer" }}
                      />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenMarket(item.name);
                      }}
                      className="btn btn-sm"
                      style={{
                        padding: "3px 6px",
                        background: "var(--so-surface-panel)",
                        border: "1px solid var(--so-border-subtle)",
                        borderRadius: "4px",
                        color: "var(--so-text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Open on DMarket (Browser)"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLookupModal(
                          item.name,
                          item.acceptedPrice,
                          item.currentMarketPrice,
                          item.iconUrl,
                        );
                      }}
                      className="btn btn-sm"
                      style={{
                        padding: "3px 6px",
                        background: "var(--so-surface-panel)",
                        border: "1px solid var(--so-border-subtle)",
                        borderRadius: "4px",
                        color: "var(--so-accent-cyan)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Inspect Item Details"
                    >
                      <Eye size={14} />
                    </button>
                    <CopyMarketHashButton name={item.name} />
                  </div>

                  {/* Distance / Closeness Badge */}
                  {item.hasExistingTarget ? (
                    <span
                      className="badge badge-cyan"
                      style={{
                        fontSize: "9px",
                        padding: "1px 5px",
                        fontWeight: 800,
                      }}
                    >
                      TARGET ACTIVE
                    </span>
                  ) : item.closeness <= 1.0 ? (
                    <span
                      className="badge badge-success"
                      style={{
                        fontSize: "9px",
                        padding: "1px 5px",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <CheckCircle2 size={10} /> BELOW TARGET (
                      {item.closenessPercent >= 0
                        ? `+${item.closenessPercent.toFixed(1)}%`
                        : `${item.closenessPercent.toFixed(1)}%`}
                      )
                    </span>
                  ) : (
                    <span
                      className="badge"
                      style={{
                        fontSize: "9px",
                        padding: "1px 5px",
                        fontWeight: 800,
                        backgroundColor: "rgba(245, 158, 11, 0.18)",
                        color: "#f59e0b",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      SO CLOSE (+{item.closenessPercent.toFixed(1)}%)
                    </span>
                  )}
                </div>

                {/* Image Showcase */}
                <div
                  style={{
                    height: "65px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0, 0, 0, 0.25)",
                    borderRadius: "var(--so-radius-sm)",
                    border: "1px solid var(--so-border-subtle)",
                    padding: "4px",
                    backgroundImage:
                      "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
                  }}
                >
                  <img
                    src={imageUrl}
                    alt={cleanTitle}
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = "0.3";
                    }}
                    style={{
                      maxHeight: "55px",
                      maxWidth: "100%",
                      objectFit: "contain",
                      filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
                    }}
                  />
                </div>

                {/* Title & Wear */}
                <div
                  style={{
                    textAlign: "center",
                    minHeight: "30px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "11.5px",
                      color: "var(--so-text-primary)",
                      lineHeight: "1.2",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cleanTitle}
                  </div>
                  {wearShortcut && (
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--so-primary)",
                        fontWeight: 800,
                        marginTop: "2px",
                      }}
                    >
                      {wearShortcut}
                    </div>
                  )}
                </div>

                {/* 14-Day Trend Sparkline */}
                <div onClick={(e) => e.stopPropagation()}>
                  <TrendSparkline
                    name={item.name}
                    momentum={item.trendMomentum14d}
                    height={30}
                    onClick={() =>
                      onOpenLookupModal(
                        item.name,
                        item.acceptedPrice,
                        item.currentMarketPrice,
                        item.iconUrl,
                      )
                    }
                  />
                </div>

                {/* Pricing Info Box */}
                <div
                  style={{
                    backgroundColor:
                      item.closeness <= 1.0
                        ? "rgba(16, 185, 129, 0.12)"
                        : "var(--so-surface-input)",
                    border: `1px solid ${item.closeness <= 1.0 ? "rgba(16, 185, 129, 0.3)" : "var(--so-border-subtle)"}`,
                    padding: "6px 8px",
                    borderRadius: "var(--so-radius-sm)",
                    fontSize: "11px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                    }}
                  >
                    <span style={{ color: "var(--so-text-muted)" }}>
                      Target Buy Price
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        fontWeight: 800,
                        color: "var(--so-success-text)",
                      }}
                    >
                      ${item.acceptedPrice.toFixed(2)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                    }}
                  >
                    <span style={{ color: "var(--so-text-muted)" }}>
                      DMarket Market
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        fontWeight: 800,
                        color:
                          item.closeness <= 1.0
                            ? "var(--so-success-text)"
                            : "#f59e0b",
                      }}
                    >
                      ${item.currentMarketPrice.toFixed(2)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "9.5px",
                    }}
                  >
                    <span style={{ color: "var(--so-text-muted)" }}>
                      Distance
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        fontWeight: 700,
                        color:
                          item.closeness <= 1.0
                            ? "var(--so-success-text)"
                            : "var(--so-text-secondary)",
                      }}
                    >
                      {item.closeness.toFixed(2)}x (+
                      {item.closenessPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <div
                  style={{ display: "flex", gap: "6px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.hasExistingTarget ? (
                    <button
                      disabled
                      className="btn btn-secondary btn-sm"
                      style={{
                        flex: 1,
                        fontWeight: 700,
                        fontSize: "11px",
                        padding: "4px 6px",
                        opacity: 0.6,
                      }}
                    >
                      Target Active
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCreateSoCloseTarget(item)}
                      disabled={isProcessing}
                      className="btn btn-primary btn-sm"
                      style={{
                        flex: 1,
                        fontWeight: 700,
                        fontSize: "11px",
                        padding: "4px 6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      {isProcessing ? (
                        <Loader2 size={11} className="spin" />
                      ) : (
                        <PlusCircle size={12} />
                      )}
                      <span>
                        Create Target (${item.acceptedPrice.toFixed(2)})
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL ── */}
      {selectedSoCloseCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: isSidebarExpanded ? "258px" : "96px",
            right: "28px",
            zIndex: 1000,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            backgroundColor: "rgba(17, 24, 39, 0.96)",
            backdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "var(--so-radius-md)",
            border: "1px solid var(--so-border-medium)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(37, 99, 235, 0.25)",
            boxSizing: "border-box",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            <span
              style={{
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                color: "var(--so-accent-cyan)",
                border: "1px solid var(--so-primary)",
                padding: "2px 9px",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "14px",
              }}
            >
              {selectedSoCloseCount}
            </span>
            <span>OPPORTUNITIES SELECTED FOR BATCH TARGET CREATION</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={clearSoCloseSelection}
              className="btn btn-sm btn-ghost"
              style={{
                fontWeight: 700,
                padding: "6px 14px",
                fontSize: "12px",
                color: "#ffffff",
              }}
            >
              Clear Selection
            </button>

            <button
              onClick={executeBatchSoCloseCreate}
              disabled={batchSoCloseProcessing}
              className="btn btn-primary btn-sm"
              style={{
                fontWeight: 800,
                padding: "6px 18px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ffffff",
              }}
            >
              {batchSoCloseProcessing ? (
                <>
                  <Loader2 size={13} className="spin" /> CREATING TARGETS...
                </>
              ) : (
                <>
                  <PlusCircle size={13} /> CREATE BATCH TARGETS (
                  {selectedSoCloseCount})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
