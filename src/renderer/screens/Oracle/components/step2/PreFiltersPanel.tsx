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
    <div
      style={{
        padding: "18px 20px",
        borderRadius: "var(--so-radius-md)",
        backgroundColor: "var(--so-surface-panel)",
        border: "1px solid var(--so-border-medium)",
        marginBottom: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            fontWeight: 800,
            fontSize: "14px",
            color: "var(--so-text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Sliders size={16} style={{ color: "var(--so-primary)" }} /> Section
          1: Pre-Evaluation Filters
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {totalCacheCount > 0 && (
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--so-cyan-text)",
              }}
            >
              Passing Filters: {passingFilterCount.toLocaleString()} /{" "}
              {totalCacheCount.toLocaleString()} items
            </div>
          )}
          <button
            className="btn btn-sm btn-ghost"
            onClick={resetPreFilters}
            style={{ fontSize: "11.5px", padding: "3px 8px" }}
          >
            <RefreshCw size={12} /> Reset Pre-Filters
          </button>
        </div>
      </div>

      {/* Quick Category & Special Exclusions Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {/* Exclude Souvenir */}
        <div
          onClick={() =>
            setPreFilters((p) => ({
              ...p,
              excludeSouvenir: !p.excludeSouvenir,
            }))
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "var(--so-radius-sm)",
            backgroundColor: preFilters.excludeSouvenir
              ? "rgba(239, 68, 68, 0.12)"
              : "var(--so-surface-input)",
            border: preFilters.excludeSouvenir
              ? "1px solid rgba(239, 68, 68, 0.4)"
              : "1px solid var(--so-border-subtle)",
            cursor: "pointer",
            userSelect: "none",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: preFilters.excludeSouvenir
                ? "var(--so-danger)"
                : "transparent",
              border: preFilters.excludeSouvenir
                ? "none"
                : "1px solid var(--so-border-medium)",
            }}
          >
            {preFilters.excludeSouvenir && (
              <Check size={12} style={{ color: "#fff" }} />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: preFilters.excludeSouvenir
                  ? "var(--so-danger-text)"
                  : "var(--so-text-primary)",
              }}
            >
              Exclude Souvenir Items
            </div>
            <div style={{ fontSize: "11px", color: "var(--so-text-muted)" }}>
              Removes Souvenir package drops
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "var(--so-radius-sm)",
            backgroundColor: preFilters.excludeStatTrak
              ? "rgba(239, 68, 68, 0.12)"
              : "var(--so-surface-input)",
            border: preFilters.excludeStatTrak
              ? "1px solid rgba(239, 68, 68, 0.4)"
              : "1px solid var(--so-border-subtle)",
            cursor: "pointer",
            userSelect: "none",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: preFilters.excludeStatTrak
                ? "var(--so-danger)"
                : "transparent",
              border: preFilters.excludeStatTrak
                ? "none"
                : "1px solid var(--so-border-medium)",
            }}
          >
            {preFilters.excludeStatTrak && (
              <Check size={12} style={{ color: "#fff" }} />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: preFilters.excludeStatTrak
                  ? "var(--so-danger-text)"
                  : "var(--so-text-primary)",
              }}
            >
              Exclude StatTrak™ Items
            </div>
            <div style={{ fontSize: "11px", color: "var(--so-text-muted)" }}>
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "var(--so-radius-sm)",
            backgroundColor: preFilters.excludeStickers
              ? "rgba(239, 68, 68, 0.12)"
              : "var(--so-surface-input)",
            border: preFilters.excludeStickers
              ? "1px solid rgba(239, 68, 68, 0.4)"
              : "1px solid var(--so-border-subtle)",
            cursor: "pointer",
            userSelect: "none",
            transition: "all 0.15s ease",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: preFilters.excludeStickers
                ? "var(--so-danger)"
                : "transparent",
              border: preFilters.excludeStickers
                ? "none"
                : "1px solid var(--so-border-medium)",
            }}
          >
            {preFilters.excludeStickers && (
              <Check size={12} style={{ color: "#fff" }} />
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: preFilters.excludeStickers
                  ? "var(--so-danger-text)"
                  : "var(--so-text-primary)",
              }}
            >
              Exclude Stickers
            </div>
            <div style={{ fontSize: "11px", color: "var(--so-text-muted)" }}>
              Removes standalone stickers
            </div>
          </div>
        </div>

        {/* Forced Group Exclusions: Charms, Cases, Keys, Music Kits, Agents, Patches, Graffiti */}
        <div
          style={{
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
          }}
          title="Forced Excluded Commodity Group (Locked)"
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "var(--so-border-medium)",
              border: "none",
            }}
          >
            <Check size={12} style={{ color: "var(--so-text-primary)" }} />
          </div>
          <div>
            <div
              style={{
                fontSize: "12.5px",
                fontWeight: 700,
                color: "var(--so-text-muted)",
              }}
            >
              Exclude Charms, Cases, Keys, Music Kits, Agents, Patches & Graffiti
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--so-text-muted)",
                opacity: 0.8,
              }}
            >
              Forced Filtered Out (Locked)
            </div>
          </div>
        </div>
      </div>

      {/* Wear Condition & Price Filters Row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Wear Condition Selector */}
        <div style={{ flex: 1, minWidth: "300px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--so-text-secondary)",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Tag size={14} /> Allowed Wear Conditions:
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
                    toggleWear(wear.key as keyof BuildPreFilters["allowedWears"])
                  }
                  style={{
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
                    color: isSelected
                      ? "var(--so-text-primary)"
                      : "var(--so-text-muted)",
                  }}
                >
                  {isSelected ? "✓ " : "✕ "} {wear.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Compact Inline Price Filters */}
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--so-text-secondary)",
              marginBottom: "8px",
              whiteSpace: "nowrap",
            }}
          >
            Price Range ($):
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              style={{
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
              }}
            />
            <span style={{ color: "var(--so-text-muted)", fontSize: "12px" }}>
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
              style={{
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
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
