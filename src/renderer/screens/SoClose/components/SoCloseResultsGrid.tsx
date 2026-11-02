import React from "react";
import { SoCloseResultItem } from "../../../../shared/types";
import { SoCloseResultRow } from "./SoCloseResultRow";
import { SoCloseEmptyState } from "./SoCloseEmptyState";

export interface SoCloseResultsGridProps {
  results: SoCloseResultItem[];
  totalResults: number;
  snoozedCount: number;
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
  snoozedCount,
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
        snoozedCount={snoozedCount}
        totalResults={totalResults}
        onScan={onScan}
      />
    );
  }

  return (
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
  );
};

const styles: Record<string, React.CSSProperties> = {
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
    gap: "12px",
  },
};
