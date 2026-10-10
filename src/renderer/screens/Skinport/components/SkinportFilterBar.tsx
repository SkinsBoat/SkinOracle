import React from "react";
import { Info, Loader2, RotateCw } from "lucide-react";
import {
  CATEGORY_BADGES,
  DEFAULT_MAX_CLOSENESS,
  WEAR_RANGES,
  type FeedTypeFilter,
  type SkinportFilterState,
  type WearKey,
} from "../constants";

interface SkinportFilterBarProps {
  filters: SkinportFilterState;
  onChange: (patch: Partial<SkinportFilterState>) => void;
  onToggleWear: (key: WearKey) => void;
  loading: boolean;
  onScan?: () => void;
  primaryAction?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    busy?: boolean;
    disabled?: boolean;
  };
  extraActions?: React.ReactNode;
  /** Show the listed/sold feed selector (Events tab). */
  showFeedType?: boolean;
}

export const SkinportFilterBar: React.FC<SkinportFilterBarProps> = ({
  filters,
  onChange,
  onToggleWear,
  loading,
  onScan,
  primaryAction,
  extraActions,
  showFeedType = false,
}) => {
  return (
    <div style={styles.controlBar}>
      <div style={styles.leftInputsWrapper}>
        <div style={styles.filterGroup}>
          <span style={styles.groupLabel}>Scan</span>

          <div style={styles.filterPill}>
            <span style={styles.filterLabel}>Price Range ($):</span>
            <input
              type="number"
              min="0"
              step="any"
              value={filters.priceMin}
              onChange={(e) => onChange({ priceMin: e.target.value })}
              placeholder="Min"
              style={styles.numberInputWide}
            />
            <span style={styles.dashSeparator}>-</span>
            <input
              type="number"
              min="0"
              step="any"
              value={filters.priceMax}
              onChange={(e) => onChange({ priceMax: e.target.value })}
              placeholder="Max"
              style={styles.numberInputWide}
            />
          </div>

          {showFeedType && (
            <div style={styles.filterPill}>
              <span style={styles.filterLabel}>Feed:</span>
              <select
                value={filters.feedType}
                onChange={(e) =>
                  onChange({ feedType: e.target.value as FeedTypeFilter })
                }
                style={styles.compactSelect}
              >
                <option value="all">Listed + Sold</option>
                <option value="listed">Listed</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          )}

          <div style={styles.wearsWrapper}>
            <span style={styles.wearsLabel}>Category:</span>
            {CATEGORY_BADGES.map((b) => (
              <button
                key={b.key}
                type="button"
                onClick={() => onChange({ category: b.key })}
                style={getBadgeStyle(filters.category === b.key)}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div style={styles.wearsWrapper}>
            <span style={styles.wearsLabel}>Wears:</span>
            {WEAR_RANGES.map((w) => (
              <button
                key={w.key}
                type="button"
                onClick={() => onToggleWear(w.key)}
                style={getBadgeStyle(filters.allowedWears[w.key])}
              >
                {w.label}
              </button>
            ))}
          </div>

          <div style={styles.wearsWrapper}>
            <span style={styles.wearsLabel}>Variant:</span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  allowedWears: {
                    ...filters.allowedWears,
                    souvenir: !filters.allowedWears.souvenir,
                  },
                })
              }
              style={getBadgeStyle(filters.allowedWears.souvenir)}
            >
              Souvenir
            </button>
          </div>
        </div>

        <span style={styles.groupDivider} />

        <div style={styles.filterGroup}>
          <span style={styles.groupLabel}>Oracle</span>

          <div style={styles.filterPill}>
            <span style={styles.filterLabel}>Max Distance:</span>
            <input
              type="number"
              step="0.01"
              min="1"
              value={filters.maxCloseness}
              onChange={(e) =>
                onChange({
                  maxCloseness:
                    parseFloat(e.target.value) || DEFAULT_MAX_CLOSENESS,
                })
              }
              style={styles.numberInputDistance}
            />
            <span style={styles.distancePercentText}>
              (+{((filters.maxCloseness - 1) * 100).toFixed(0)}%)
            </span>
          </div>

          <div style={styles.filterPill}>
            <span
              title="Supply Stability Score (SSS) measures cross-market availability, anti-monopoly supply distribution across markets (HHI), and listed stock depth relative to price bracket."
              style={styles.sssLabel}
            >
              SSS:
              <Info size={12} style={styles.sssInfoIcon} />
            </span>
            <input
              type="number"
              min="0"
              max="1.5"
              step="0.1"
              value={filters.minSss}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange({
                  minSss: isNaN(val) ? 0 : Math.max(0, Math.min(1.5, val)),
                });
              }}
              style={styles.numberInputSss}
            />
            <span style={getSssTierStyle(filters.minSss)}>
              {filters.minSss >= 1.2
                ? "Strict"
                : filters.minSss >= 0.8
                  ? "Balanced"
                  : "Broad"}
            </span>
          </div>
        </div>
      </div>

      <div style={styles.rightActionsGroup}>
        {extraActions}
        {primaryAction ? (
          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.busy || primaryAction.disabled}
            className="btn btn-primary btn-sm"
            style={styles.scanButton}
          >
            {primaryAction.busy ? (
              <Loader2 size={14} className="spin" />
            ) : (
              primaryAction.icon
            )}{" "}
            {primaryAction.label}
          </button>
        ) : (
          <button
            onClick={onScan}
            disabled={loading}
            className="btn btn-primary btn-sm"
            style={styles.scanButton}
          >
            {loading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <RotateCw size={14} />
            )}{" "}
            Run Scan
          </button>
        )}
      </div>
    </div>
  );
};

const getSssTierStyle = (score: number): React.CSSProperties => ({
  fontSize: "10px",
  fontWeight: 800,
  color:
    score >= 1.2
      ? "var(--so-success-text)"
      : score >= 0.8
        ? "var(--so-accent-cyan)"
        : "var(--so-warning)",
});

const getBadgeStyle = (active: boolean): React.CSSProperties => ({
  padding: "2px 7px",
  fontSize: "9.5px",
  fontWeight: 800,
  borderRadius: "3px",
  cursor: "pointer",
  backgroundColor: active ? "var(--so-primary)" : "var(--so-surface-panel)",
  color: active ? "#ffffff" : "var(--so-text-muted)",
  border: active ? "none" : "1px solid var(--so-border-subtle)",
});

const styles: Record<string, React.CSSProperties> = {
  controlBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
    padding: "8px 14px",
    flexWrap: "wrap",
    gap: "10px",
    flexShrink: 0,
  },
  leftInputsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    padding: "2px 8px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "rgba(100, 116, 139, 0.06)",
    border: "1px solid var(--so-border-subtle)",
  },
  groupLabel: {
    fontSize: "9px",
    fontWeight: 800,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    color: "var(--so-text-muted)",
    paddingRight: "4px",
    borderRight: "1px solid var(--so-border-subtle)",
  },
  groupDivider: {
    width: "1px",
    height: "22px",
    backgroundColor: "var(--so-border-medium)",
    flexShrink: 0,
  },
  filterPill: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    padding: "4px 8px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "11px",
  },
  filterLabel: {
    fontWeight: 700,
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  numberInputWide: {
    width: "72px",
    padding: "2px 6px",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  },
  dashSeparator: {
    color: "var(--so-text-muted)",
  },
  compactSelect: {
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 4px",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  },
  wearsWrapper: {
    display: "flex",
    gap: "3px",
    alignItems: "center",
  },
  wearsLabel: {
    fontSize: "10.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
    marginRight: "2px",
  },
  numberInputDistance: {
    width: "48px",
    padding: "1px 4px",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  },
  distancePercentText: {
    fontSize: "10.5px",
    fontWeight: 800,
    color: "var(--so-accent-cyan)",
  },
  sssLabel: {
    fontWeight: 700,
    color: "var(--so-text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    cursor: "help",
  },
  sssInfoIcon: {
    color: "var(--so-accent-cyan)",
    opacity: 0.85,
  },
  numberInputSss: {
    width: "44px",
    padding: "1px 4px",
    fontSize: "11px",
    fontWeight: 800,
    textAlign: "center",
    borderRadius: "3px",
    border: "1px solid var(--so-border-subtle)",
    background: "var(--so-surface-card)",
    color: "var(--so-text-primary)",
  },
  rightActionsGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginLeft: "auto",
  },
  scanButton: {
    fontWeight: 800,
  },
};
