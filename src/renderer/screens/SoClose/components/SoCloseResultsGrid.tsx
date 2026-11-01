import React from "react";
import { Search } from "lucide-react";
import { SoCloseResultItem } from "../../../../shared/types";
import { SoCloseResultRow } from "./SoCloseResultRow";
import { SoCloseEmptyState } from "./SoCloseEmptyState";

export interface SoCloseResultsGridProps {
  results: SoCloseResultItem[];
  totalResults: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  cacheItemCount: number;
  acceptedItemCount: number;
  isScanning: boolean;
  onScan: () => void;
  onInspect: (item: SoCloseResultItem) => void;
  onOpenMarket: (item: SoCloseResultItem) => void;
  onContextMenu: (
    event: React.MouseEvent<HTMLDivElement>,
    item: SoCloseResultItem,
  ) => void;
}

export const SoCloseResultsGrid: React.FC<SoCloseResultsGridProps> = ({
  results,
  totalResults,
  searchQuery,
  onSearchChange,
  cacheItemCount,
  acceptedItemCount,
  isScanning,
  onScan,
  onInspect,
  onOpenMarket,
  onContextMenu,
}) => {
  if (results.length === 0) {
    return (
      <SoCloseEmptyState
        isScanning={isScanning}
        cacheItemCount={cacheItemCount}
        acceptedItemCount={acceptedItemCount}
        onScan={onScan}
      />
    );
  }

  return (
    <>
      <div style={styles.resultsHeader}>
        <div style={styles.resultsHeaderLeft}>
          <div style={styles.resultsTitle}>
            Found Opportunities ({results.length})
          </div>

          <div style={styles.searchContainer}>
            <Search size={14} style={styles.searchIcon} />
            <input
              type="text"
              className="input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter results..."
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.resultsCountMeta}>
          Showing {results.length} of {totalResults} deal(s)
        </div>
      </div>

      <div style={styles.cardsGrid}>
        {results.map((item, index) => (
          <SoCloseResultRow
            key={`${item.name}-${item.market}-${index}`}
            item={item}
            index={index}
            onInspect={onInspect}
            onOpenMarket={onOpenMarket}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  resultsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  resultsHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  resultsTitle: {
    fontSize: "14px",
    fontWeight: 800,
    color: "var(--so-text-primary)",
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    position: "relative",
  },
  searchIcon: {
    color: "var(--so-text-muted)",
    position: "absolute",
    left: "9px",
    pointerEvents: "none",
  },
  searchInput: {
    width: "220px",
    paddingLeft: "28px",
    height: "32px",
    fontSize: "12px",
  },
  resultsCountMeta: {
    fontSize: "11.5px",
    color: "var(--so-text-muted)",
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "12px",
  },
};
