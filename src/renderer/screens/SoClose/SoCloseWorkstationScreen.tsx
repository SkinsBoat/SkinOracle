import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Radar, RefreshCw, Target } from "lucide-react";
import { SoCloseResultItem } from "../../../shared/types";
import { getMarketDisplayName } from "../../../shared/canonicalMarkets";
import { WorkstationHeader } from "../../components/WorkstationHeader";
import { getMarketItemUrl } from "../../utils/marketUrls";
import { exportNodeAsPng } from "../Oracle/utils/lookupImageExport";
import {
  CSFloatLookupModal,
  LookupModalItemData,
} from "../CSFloat/modals/CSFloatLookupModal";
import { useSoCloseScanner } from "./hooks/useSoCloseScanner";
import { SNOOZE_OPTIONS, makeSnoozeKey } from "./hooks/useSnoozeStore";
import { SoCloseStatusBar } from "./components/SoCloseStatusBar";
import { SoCloseControls } from "./components/SoCloseControls";
import { SoCloseResultsGrid } from "./components/SoCloseResultsGrid";
import {
  SoCloseContextMenu,
  SoCloseContextMenuState,
} from "./components/SoCloseContextMenu";

/**
 * SoClose Opportunity Workstation.
 *
 * Thin shell: data and scan logic live in `useSoCloseScanner`, and each visual
 * region (status, controls, results, context menu) is a focused component.
 */
export default function SoCloseWorkstationScreen() {
  const scanner = useSoCloseScanner();
  const [lookupModalItem, setLookupModalItem] =
    useState<LookupModalItemData | null>(null);
  const [contextMenu, setContextMenu] =
    useState<SoCloseContextMenuState | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [contextMenu]);

  const handleOpenLookupModal = async (item: SoCloseResultItem) => {
    setLookupModalItem({
      name: item.name,
      acceptedPrice: item.acceptedPrice,
      marketPrice: item.currentMarketPrice,
      iconUrl: item.iconUrl,
      market: item.market,
    });
    try {
      if (window.electronAPI?.marketCache?.get) {
        const cache = await window.electronAPI.marketCache.get();
        const cacheItem = cache ? cache[item.name] || cache[item.name.trim()] : null;
        if (cacheItem) {
          setLookupModalItem((prev) =>
            prev && prev.name === item.name
              ? { ...prev, cacheItem }
              : prev,
          );
        }
      }
    } catch (err) {
      console.error(
        "[SoCloseWorkstationScreen] Failed to load cache for lookup modal:",
        err,
      );
    }
  };

  const openItemMarket = (item: SoCloseResultItem) => {
    const url = getMarketItemUrl(item.market || "csfloat", item.name);
    if (!url) {
      toast.error(
        `Market link not available for ${getMarketDisplayName(item.market)}`,
      );
      return;
    }
    window.electronAPI?.app?.openExternal?.(url);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard!`);
  };

  const handleSnoozeItem = (
    item: SoCloseResultItem,
    durationMs: number | null,
  ) => {
    scanner.snoozeItem(makeSnoozeKey(item), durationMs);
    const option = SNOOZE_OPTIONS.find(
      (snoozeOption) => snoozeOption.durationMs === durationMs,
    );
    toast.success(
      option
        ? `Snoozed for ${option.label.toLowerCase()}`
        : "Snoozed for this session",
      { id: "soclose-snooze-toast", duration: 2000 },
    );
  };

  const handleExportCard = async (node: HTMLElement, nameHint: string) => {
    const toastId = toast.loading("Exporting card as PNG...");
    try {
      await exportNodeAsPng(node, nameHint);
      toast.success("Exported PNG image", { id: toastId });
    } catch (err: any) {
      toast.error(
        "Failed to export image: " + (err?.message || "unknown error"),
        { id: toastId },
      );
    }
  };

  const instantDealCount = scanner.soCloseResults.filter(
    (item) => item.closeness <= 1.0,
  ).length;
  const closestSpreadPercent =
    scanner.soCloseResults.length > 0
      ? scanner.soCloseResults[0].closenessPercent
      : null;

  return (
    <div style={styles.container}>
      <WorkstationHeader
        icon={<Radar size={20} />}
        title="SoClose Scanner"
        badge="MULTI-MARKET RADAR"
        subtitle="Universal scan engine across all active markets to surface instant arbitrage & near-miss deals."
        right={
          <button
            type="button"
            className={`btn btn-primary ${scanner.isScanning ? "btn-loading" : ""}`}
            onClick={scanner.runUniversalSoCloseScan}
            disabled={scanner.isScanning}
            title="Scan cached listings against your Oracle buy ceilings"
          >
            {scanner.isScanning ? (
              <>
                <RefreshCw size={15} className="spin" /> Scanning...
              </>
            ) : (
              <>
                <Target size={15} /> Scan Opportunities
              </>
            )}
          </button>
        }
      />

      <div className="card" style={styles.mainCard}>
        <SoCloseStatusBar
          cacheStatus={scanner.cacheStatus}
          acceptedMeta={scanner.acceptedMeta}
          isRefreshingStatus={scanner.isRefreshingStatus}
          onRefresh={scanner.handleManualRefreshStatus}
          scanSummary={scanner.scanSummary}
          resultCount={scanner.soCloseResults.length}
          instantDealCount={instantDealCount}
          snoozedCount={scanner.activeSnoozeCount}
          closestSpreadPercent={closestSpreadPercent}
          isScanning={scanner.isScanning}
        />

        <SoCloseControls
          availableMarkets={scanner.availableMarkets}
          visibleMarkets={scanner.visibleMarkets}
          selectedFilterMarkets={scanner.selectedFilterMarkets}
          isAllSelected={scanner.isAllSelected}
          selectedCount={scanner.selectedCount}
          tradeCount={scanner.tradeCount}
          hideTradeMarkets={scanner.hideTradeMarkets}
          isLoadingMarkets={scanner.isLoadingMarkets}
          cacheItemCount={scanner.cacheStatus.itemCount}
          onToggleHideTrade={scanner.handleToggleHideTrade}
          onSelectAll={scanner.handleSelectAllMarkets}
          onDeselectAll={scanner.handleDeselectAllMarkets}
          onToggleMarket={scanner.handleToggleMarketFilter}
          onSoloMarket={scanner.handleSoloMarketFilter}
          getMarketCount={scanner.getMarketCount}
          minPrice={scanner.minPrice}
          setMinPrice={scanner.setMinPrice}
          maxPrice={scanner.maxPrice}
          setMaxPrice={scanner.setMaxPrice}
          soCloseMaxCloseness={scanner.soCloseMaxCloseness}
          setSoCloseMaxCloseness={scanner.setSoCloseMaxCloseness}
          soCloseMinSssScore={scanner.soCloseMinSssScore}
          setSoCloseMinSssScore={scanner.setSoCloseMinSssScore}
          allowedWears={scanner.allowedWears}
          setAllowedWears={scanner.setAllowedWears}
          isScanning={scanner.isScanning}
          onScan={scanner.runUniversalSoCloseScan}
        />

        <SoCloseResultsGrid
          results={scanner.processedResults}
          totalResults={scanner.soCloseResults.length}
          snoozedCount={scanner.activeSnoozeCount}
          searchQuery={scanner.resultSearchQuery}
          onSearchChange={scanner.setResultSearchQuery}
          cacheItemCount={scanner.cacheStatus.itemCount}
          acceptedItemCount={scanner.acceptedMeta?.itemCount ?? 0}
          isScanning={scanner.isScanning}
          onScan={scanner.runUniversalSoCloseScan}
          onInspect={handleOpenLookupModal}
          onOpenMarket={openItemMarket}
          onContextMenu={(event, item) => {
            event.preventDefault();
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              item,
              target: event.currentTarget,
            });
          }}
        />
      </div>

      {contextMenu && (
        <SoCloseContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onExport={handleExportCard}
          onOpenMarket={openItemMarket}
          onInspect={handleOpenLookupModal}
          onCopyName={(name) => copyToClipboard(name, "market hash name")}
          onSnooze={handleSnoozeItem}
        />
      )}

      {lookupModalItem && (
        <CSFloatLookupModal
          item={lookupModalItem}
          onClose={() => setLookupModalItem(null)}
          onOpenMarket={(name) => {
            const url = getMarketItemUrl(
              lookupModalItem.market || "csfloat",
              name,
            );
            if (url) window.electronAPI?.app?.openExternal?.(url);
          }}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingBottom: "40px",
    width: "100%",
    maxWidth: "var(--so-screen-max-width)",
    margin: "0 auto",
  },
  mainCard: {
    border: "1px solid var(--so-border-medium)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
};
