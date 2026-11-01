import React from "react";
import { Copy, Download, ExternalLink, Eye } from "lucide-react";
import { SoCloseResultItem } from "../../../../shared/types";
import { getMarketDisplayName } from "../../../../shared/canonicalMarkets";

export interface SoCloseContextMenuState {
  x: number;
  y: number;
  item: SoCloseResultItem;
  target: HTMLElement;
}

export interface SoCloseContextMenuProps {
  menu: SoCloseContextMenuState;
  onClose: () => void;
  onExport: (target: HTMLElement, name: string) => void;
  onOpenMarket: (item: SoCloseResultItem) => void;
  onInspect: (item: SoCloseResultItem) => void;
  onCopyName: (name: string) => void;
}

export const SoCloseContextMenu: React.FC<SoCloseContextMenuProps> = ({
  menu,
  onClose,
  onExport,
  onOpenMarket,
  onInspect,
  onCopyName,
}) => (
  <>
    <div
      style={styles.contextMenuOverlay}
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    />
    <div
      style={getContextMenuStyle(menu.x, menu.y)}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        style={styles.contextMenuItem}
        onClick={() => {
          onExport(menu.target, menu.item.name);
          onClose();
        }}
      >
        <Download size={13} style={styles.contextMenuIcon} /> Export as PNG
      </button>
      <button
        type="button"
        role="menuitem"
        style={styles.contextMenuItem}
        onClick={() => {
          onOpenMarket(menu.item);
          onClose();
        }}
      >
        <ExternalLink size={13} style={styles.contextMenuIcon} /> Open on{" "}
        {getMarketDisplayName(menu.item.market)}
      </button>
      <button
        type="button"
        role="menuitem"
        style={styles.contextMenuItem}
        onClick={() => {
          onInspect(menu.item);
          onClose();
        }}
      >
        <Eye size={13} style={styles.contextMenuIcon} /> Inspect details
      </button>
      <button
        type="button"
        role="menuitem"
        style={styles.contextMenuItem}
        onClick={() => {
          onCopyName(menu.item.name);
          onClose();
        }}
      >
        <Copy size={13} style={styles.contextMenuIcon} /> Copy item name
      </button>
    </div>
  </>
);

function getContextMenuStyle(x: number, y: number): React.CSSProperties {
  const MENU_WIDTH = 210;
  const MENU_HEIGHT = 4 * 34 + 10;
  const margin = 8;
  const left = Math.max(
    margin,
    Math.min(x, window.innerWidth - MENU_WIDTH - margin),
  );
  const top = Math.max(
    margin,
    Math.min(y, window.innerHeight - MENU_HEIGHT - margin),
  );
  return { ...styles.contextMenu, left, top };
}

const styles: Record<string, React.CSSProperties> = {
  contextMenuOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9998,
  },
  contextMenu: {
    position: "fixed",
    zIndex: 9999,
    minWidth: "190px",
    padding: "5px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.45)",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  contextMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "7px 10px",
    border: "none",
    borderRadius: "var(--so-radius-sm)",
    background: "transparent",
    color: "var(--so-text-primary)",
    fontSize: "12.5px",
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "left",
  },
  contextMenuIcon: {
    color: "var(--so-text-muted)",
    flexShrink: 0,
  },
};
