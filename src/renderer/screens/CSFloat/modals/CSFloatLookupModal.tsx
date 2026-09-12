import React from "react";
import { X, ExternalLink } from "lucide-react";
import {
  isMarketMatch,
  getMarketDisplayName,
} from "../../../../shared/canonicalMarkets";
import TrendDetailedChart from "../../../components/TrendDetailedChart";

export interface LookupModalItemData {
  name: string;
  acceptedPrice?: number;
  marketPrice?: number;
  cacheItem?: any;
  iconUrl?: string;
  market?: string;
}

interface CSFloatLookupModalProps {
  item: LookupModalItemData | null;
  onClose: () => void;
  onOpenMarket: (name: string) => void;
  getHumanMarketName?: (marketId: string) => string;
}

export const CSFloatLookupModal: React.FC<CSFloatLookupModalProps> = ({
  item,
  onClose,
  onOpenMarket,
  getHumanMarketName = getMarketDisplayName,
}) => {
  if (!item) return null;

  const [internalCacheItem, setInternalCacheItem] = React.useState<any>(
    item.cacheItem || null,
  );

  React.useEffect(() => {
    if (item.cacheItem) {
      setInternalCacheItem(item.cacheItem);
      return;
    }
    let isMounted = true;
    const fetchCache = async () => {
      try {
        if (window.electronAPI?.skinsnipe?.getCache) {
          const cache = await window.electronAPI.skinsnipe.getCache();
          if (isMounted && cache) {
            const found = cache[item.name] || cache[item.name.trim()];
            if (found) {
              setInternalCacheItem(found);
            }
          }
        }
      } catch (err) {
        console.error("CSFloatLookupModal: Failed to auto-fetch item cache:", err);
      }
    };
    fetchCache();
    return () => {
      isMounted = false;
    };
  }, [item.name, item.cacheItem]);

  const activeCache = item.cacheItem || internalCacheItem;

  const cacheListings: any[] =
    activeCache?.l && Array.isArray(activeCache.l)
      ? activeCache.l
      : [];

  const validPrices = cacheListings
    .map((m: any) => (typeof m.p === "number" ? m.p : parseFloat(m.p)))
    .filter((p: number) => !isNaN(p) && p > 0);

  const calculatedLowestPrice =
    validPrices.length > 0 ? Math.min(...validPrices) : null;
  const targetMarketEntry = cacheListings.find((m: any) =>
    isMarketMatch(m.m, item.market || "csfloat"),
  );
  const resolvedMarketPrice =
    item.marketPrice || (targetMarketEntry?.p ? Number(targetMarketEntry.p) : null);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          maxWidth: "620px",
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "22px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src={
                item.iconUrl
                  ? (item.iconUrl.startsWith("http://") || item.iconUrl.startsWith("https://")
                      ? item.iconUrl
                      : `https://community.cloudflare.steamstatic.com/economy/image/${item.iconUrl}`)
                  : activeCache?.icon_url
                    ? `https://community.cloudflare.steamstatic.com/economy/image/${activeCache.icon_url}`
                    : `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.name)}`
              }
              alt={item.name}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.includes("steamapis.com")) {
                  target.src = `https://api.steamapis.com/image/item/730/${encodeURIComponent(item.name)}`;
                }
              }}
              style={{
                width: 56,
                height: 56,
                objectFit: "contain",
                borderRadius: "6px",
                background: "rgba(0,0,0,0.3)",
                padding: "4px",
              }}
            />
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "15.5px",
                  color: "var(--so-text-primary)",
                }}
              >
                {item.name}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--so-text-muted)",
                  marginTop: "2px",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <span
                  style={{ color: "var(--so-accent-cyan)", fontWeight: 700 }}
                >
                  Single Item Inspection
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: "4px 8px", borderRadius: "50%" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 4-Stat Metric Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "10px",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--so-radius-sm)",
              backgroundColor: "var(--so-surface-input)",
              border: "1px solid var(--so-border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: "10.5px",
                color: "var(--so-text-muted)",
                fontWeight: 600,
              }}
            >
              Target Buy Ceiling
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: "16px",
                fontWeight: 900,
                color: "var(--so-success-text)",
                marginTop: "2px",
              }}
            >
              {item.acceptedPrice ? `$${item.acceptedPrice.toFixed(2)}` : "—"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--so-radius-sm)",
              backgroundColor: "var(--so-surface-input)",
              border: "1px solid var(--so-border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: "10.5px",
                color: "var(--so-text-muted)",
                fontWeight: 600,
              }}
            >
              {item.market
                ? `${getHumanMarketName(item.market)} Market Price`
                : "CSFloat Market Price"}
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: "16px",
                fontWeight: 900,
                color: "#f59e0b",
                marginTop: "2px",
              }}
            >
              {resolvedMarketPrice
                ? `$${resolvedMarketPrice.toFixed(2)}`
                : "—"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--so-radius-sm)",
              backgroundColor: "var(--so-surface-input)",
              border: "1px solid var(--so-border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: "10.5px",
                color: "var(--so-text-muted)",
                fontWeight: 600,
              }}
            >
              Lowest Listing
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: "16px",
                fontWeight: 900,
                color: "var(--so-text-primary)",
                marginTop: "2px",
              }}
            >
              {calculatedLowestPrice !== null
                ? `$${calculatedLowestPrice.toFixed(2)}`
                : "—"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--so-radius-sm)",
              backgroundColor: "var(--so-surface-input)",
              border: "1px solid var(--so-border-subtle)",
            }}
          >
            <div
              style={{
                fontSize: "10.5px",
                color: "var(--so-text-muted)",
                fontWeight: 600,
              }}
            >
              Total Markets
            </div>
            <div
              className="tabular-nums"
              style={{
                fontSize: "16px",
                fontWeight: 900,
                color: "var(--so-accent-cyan)",
                marginTop: "2px",
              }}
            >
              {cacheListings.length} Markets
            </div>
          </div>
        </div>

        {/* 14-Day Price Trend History Section */}
        <TrendDetailedChart name={item.name} />

        {/* Marketplace Breakdown Table */}
        {cacheListings.length > 0 && (
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--so-text-primary)",
                marginBottom: "8px",
              }}
            >
              Live Marketplace Price Breakdown ({cacheListings.length} Markets)
            </div>
            <div
              style={{
                overflowX: "auto",
                border: "1px solid var(--so-border-subtle)",
                borderRadius: "var(--so-radius-sm)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "var(--so-surface-input)",
                      borderBottom: "1px solid var(--so-border-subtle)",
                      textAlign: "left",
                      color: "var(--so-text-muted)",
                    }}
                  >
                    <th style={{ padding: "6px 10px", fontWeight: 700 }}>
                      Marketplace
                    </th>
                    <th
                      style={{
                        padding: "6px 10px",
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                    >
                      Lowest Active Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cacheListings.map((m: any, idx: number) => (
                    <tr
                      key={m.m + idx}
                      style={{
                        borderBottom: "1px solid var(--so-border-subtle)",
                      }}
                    >
                      <td
                        style={{
                          padding: "6px 10px",
                          fontWeight: 700,
                          color: "var(--so-text-primary)",
                        }}
                      >
                        {getHumanMarketName(m.m)}
                      </td>
                      <td
                        className="tabular-nums"
                        style={{
                          padding: "6px 10px",
                          textAlign: "right",
                          fontWeight: 800,
                          color: "var(--so-primary)",
                        }}
                      >
                        ${m.p ? m.p.toFixed(2) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "6px",
          }}
        >
          <button
            onClick={() => onOpenMarket(item.name)}
            className="btn btn-secondary btn-sm"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            <ExternalLink size={13} /> View on {getHumanMarketName(item.market || "csfloat")} Market
          </button>
        </div>
      </div>
    </div>
  );
};
