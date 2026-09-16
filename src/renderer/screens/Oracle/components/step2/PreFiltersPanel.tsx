import React from "react";
import { Sliders, RefreshCw, Check, Tag } from "lucide-react";
import { BuildPreFilters } from "../../../../store/useOracleStore";

interface PreFiltersPanelProps {
  preFilters: BuildPreFilters;
  setPreFilters: React.Dispatch<React.SetStateAction<BuildPreFilters>>;
  toggleWear: (wearKey: keyof BuildPreFilters["allowedWears"]) => void;
  resetPreFilters: () => void;
  passingFilterCount: number;
  totalCacheCount: number;
}

export const PreFiltersPanel: React.FC<PreFiltersPanelProps> = ({
  preFilters,
  setPreFilters,
  toggleWear,
  resetPreFilters,
  passingFilterCount,
  totalCacheCount,
}) => {
  return (
    <div style={styles.panelContainer}>
      <div style={styles.headerRow}>
        <div style={styles.headerTitle}>
          <Sliders size={16} style={styles.sliderIcon} /> Section 1: Pre-Evaluation Filters
        </div>

        <div style={styles.headerRight}>
          {totalCacheCount > 0 && (
            <div
              style={styles.passingCountBadge}
              title="Items outside your pre-filter criteria (wear conditions, exclusions, and price range) are bypassed before valuation."
            >
              Passing Filters: {passingFilterCount.toLocaleString()} /{" "}
              {totalCacheCount.toLocaleString()} items
            </div>
          )}
          <button
            className="btn btn-sm btn-ghost"
            onClick={resetPreFilters}
            style={styles.resetBtn}
          >
            <RefreshCw size={12} /> Reset Pre-Filters
          </button>
        </div>
      </div>

      {/* Quick Category & Special Exclusions Grid */}
      <div style={styles.exclusionsGrid}>
        {/* Exclude Souvenir */}
        <div
          onClick={() =>
            setPreFilters((p) => ({
              ...p,
              excludeSouvenir: !p.excludeSouvenir,
            }))
          }
          style={getExclusionCardStyle(preFilters.excludeSouvenir)}
        >
          <div style={getCheckboxBoxStyle(preFilters.excludeSouvenir)}>
            {preFilters.excludeSouvenir && (
              <Check size={12} style={styles.checkIconWhite} />
            )}
          </div>
          <div>
            <div style={getExclusionTitleStyle(preFilters.excludeSouvenir)}>
              Exclude Souvenir Weapons
            </div>
            <div style={styles.exclusionDesc}>
              Removes Souvenir weapon skins
            </div>
          </div>
        </div>

        {/* Exclude StatTrak */}
        <div
          onClick={() =>
            setPreFilters((p) => ({
              ...p,
              excludeStatTrak: !p.excludeStatTrak,
            }))
          }
          style={getExclusionCardStyle(preFilters.excludeStatTrak)}
        >
          <div style={getCheckboxBoxStyle(preFilters.excludeStatTrak)}>
            {preFilters.excludeStatTrak && (
              <Check size={12} style={styles.checkIconWhite} />
            )}
          </div>
          <div>
            <div style={getExclusionTitleStyle(preFilters.excludeStatTrak)}>
              Exclude StatTrak™ Items
            </div>
            <div style={styles.exclusionDesc}>
              Removes kill-tracker weapons
            </div>
          </div>
        </div>

        {/* Exclude Stickers */}
        <div
          onClick={() =>
            setPreFilters((p) => ({
              ...p,
              excludeStickers: !p.excludeStickers,
            }))
          }
          style={getExclusionCardStyle(preFilters.excludeStickers)}
        >
          <div style={getCheckboxBoxStyle(preFilters.excludeStickers)}>
            {preFilters.excludeStickers && (
              <Check size={12} style={styles.checkIconWhite} />
            )}
          </div>
          <div>
            <div style={getExclusionTitleStyle(preFilters.excludeStickers)}>
              Exclude Stickers
            </div>
            <div style={styles.exclusionDesc}>
              Removes standalone stickers
            </div>
          </div>
        </div>

        {/* Forced Group Exclusions: Charms, Cases, Keys, Music Kits, Agents, Patches, Graffiti */}
        <div
          style={styles.lockedCard}
          title="Forced Excluded Commodity Group (Locked)"
        >
          <div style={styles.lockedCheckboxBox}>
            <Check size={12} style={styles.lockedCheckIcon} />
          </div>
          <div>
            <div style={styles.lockedTitle}>
              Exclude Charms, Cases, Packages, Keys, Music Kits, Agents, Patches
              & Graffiti
            </div>
            <div style={styles.lockedSubtitle}>
              Forced Filtered Out (Locked)
            </div>
          </div>
        </div>
      </div>

      {/* Wear Condition & Price Filters Row */}
      <div style={styles.bottomRow}>
        {/* Wear Condition Selector */}
        <div style={styles.wearSection}>
          <div style={styles.wearSectionTitle}>
            <Tag size={14} /> Allowed Wear Conditions:
          </div>

          <div style={styles.wearButtonsRow}>
            {[
              { key: "fn", label: "Factory New (FN)" },
              { key: "mw", label: "Minimal Wear (MW)" },
              { key: "ft", label: "Field-Tested (FT)" },
              { key: "ww", label: "Well-Worn (WW)" },
              { key: "bs", label: "Battle-Scarred (BS)" },
            ].map((wear) => {
              const isSelected =
                preFilters.allowedWears[
                  wear.key as keyof BuildPreFilters["allowedWears"]
                ];
              return (
                <button
                  key={wear.key}
                  type="button"
                  onClick={() =>
                    toggleWear(
                      wear.key as keyof BuildPreFilters["allowedWears"],
                    )
                  }
                  style={getWearButtonStyle(isSelected)}
                >
                  {isSelected ? "✓ " : "✕ "} {wear.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Inline Price Filters */}
        <div>
          <div style={styles.priceSectionTitle}>
            Price Range ($):
          </div>
          <div style={styles.priceInputsRow}>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="Min $"
              value={preFilters.minPrice ? preFilters.minPrice : ""}
              onChange={(e) => {
                const val =
                  e.target.value === "" ? 0 : parseFloat(e.target.value);
                setPreFilters((p) => ({
                  ...p,
                  minPrice: isNaN(val) ? 0 : val,
                }));
              }}
              style={styles.priceInput}
            />
            <span style={styles.priceSeparator}>
              —
            </span>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Max $"
              value={preFilters.maxPrice ? preFilters.maxPrice : ""}
              onChange={(e) => {
                const val =
                  e.target.value === "" ? 0 : parseFloat(e.target.value);
                setPreFilters((p) => ({
                  ...p,
                  maxPrice: isNaN(val) ? 0 : val,
                }));
              }}
              style={styles.priceInput}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

function getExclusionCardStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: isActive
      ? "rgba(239, 68, 68, 0.12)"
      : "var(--so-surface-input)",
    border: isActive
      ? "1px solid rgba(239, 68, 68, 0.4)"
      : "1px solid var(--so-border-subtle)",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 0.15s ease",
  };
}

function getCheckboxBoxStyle(isActive: boolean): React.CSSProperties {
  return {
    width: 16,
    height: 16,
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isActive ? "var(--so-danger)" : "transparent",
    border: isActive ? "none" : "1px solid var(--so-border-medium)",
  };
}

function getExclusionTitleStyle(isActive: boolean): React.CSSProperties {
  return {
    fontSize: "12.5px",
    fontWeight: 700,
    color: isActive ? "var(--so-danger-text)" : "var(--so-text-primary)",
  };
}

function getWearButtonStyle(isSelected: boolean): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: "var(--so-radius-sm)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s ease",
    backgroundColor: isSelected
      ? "rgba(99, 102, 241, 0.18)"
      : "var(--so-surface-input)",
    border: isSelected
      ? "1px solid var(--so-primary)"
      : "1px solid var(--so-border-subtle)",
    color: isSelected ? "var(--so-text-primary)" : "var(--so-text-muted)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  panelContainer: {
    padding: "18px 20px",
    borderRadius: "var(--so-radius-md)",
    backgroundColor: "var(--so-surface-panel)",
    border: "1px solid var(--so-border-medium)",
    marginBottom: "18px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },
  headerTitle: {
    fontWeight: 800,
    fontSize: "14px",
    color: "var(--so-text-primary)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sliderIcon: {
    color: "var(--so-primary)",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  passingCountBadge: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-cyan-text)",
  },
  resetBtn: {
    fontSize: "11.5px",
    padding: "3px 8px",
  },
  exclusionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "10px",
    marginBottom: "16px",
  },
  checkIconWhite: {
    color: "#fff",
  },
  exclusionDesc: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
  },
  lockedCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "var(--so-radius-sm)",
    backgroundColor: "var(--so-surface-input)",
    border: "1px solid var(--so-border-subtle)",
    cursor: "not-allowed",
    userSelect: "none",
    opacity: 0.75,
  },
  lockedCheckboxBox: {
    width: 16,
    height: 16,
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--so-border-medium)",
    border: "none",
  },
  lockedCheckIcon: {
    color: "var(--so-text-primary)",
  },
  lockedTitle: {
    fontSize: "12.5px",
    fontWeight: 700,
    color: "var(--so-text-muted)",
  },
  lockedSubtitle: {
    fontSize: "11px",
    color: "var(--so-text-muted)",
    opacity: 0.8,
  },
  bottomRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "16px",
  },
  wearSection: {
    flex: 1,
    minWidth: "300px",
  },
  wearSectionTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
    marginBottom: "8px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  wearButtonsRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  priceSectionTitle: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--so-text-secondary)",
    marginBottom: "8px",
    whiteSpace: "nowrap",
  },
  priceInputsRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  priceInput: {
    width: "85px",
    height: "29px",
    padding: "4px 8px",
    borderRadius: "var(--so-radius-sm)",
    border: "1px solid var(--so-border-medium)",
    backgroundColor: "var(--so-surface-input)",
    color: "var(--so-text-primary)",
    fontSize: "12px",
    fontWeight: 600,
    outline: "none",
    boxSizing: "border-box",
  },
  priceSeparator: {
    color: "var(--so-text-muted)",
    fontSize: "12px",
  },
};

