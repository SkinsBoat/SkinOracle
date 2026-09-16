import React from "react";
import {
  Tag,
  Package,
  History,
  RotateCw,
  RefreshCw,
  Zap,
  Search,
  X,
  HelpCircle,
  Bot,
  Loader2,
} from "lucide-react";
import {
  DmarketOfferItem,
  DmarketInventoryItem,
} from "../../../../../../shared/types";
import { steamLogo } from "../../../../../utils/marketLogos";

export interface ListingsToolbarProps {
  listingSubTab: "active" | "inventory" | "history";
  setListingSubTab: (tab: "active" | "inventory" | "history") => void;
  offers: DmarketOfferItem[];
  inventory: DmarketInventoryItem[];
  closedOffers: any[];
  offersLoading: boolean;
  inventoryLoading: boolean;
  closedOffersLoading: boolean;
  loadingListingPrices: boolean;
  listingPricesLoaded: boolean;
  steamSyncing: boolean;
  // Filters & Counts
  listingModeFilter: "all" | "p2p" | "bot";
  setListingModeFilter: (mode: "all" | "p2p" | "bot") => void;
  p2pCount: number;
  botCount: number;
  inventoryMarketFilter: "all" | "dmarket" | "steam";
  setInventoryMarketFilter: (filter: "all" | "dmarket" | "steam") => void;
  dmarketInventoryCount: number;
  steamInventoryCount: number;
  listingFilterAction: "all" | "action_required" | "overpriced" | "underpriced" | "safe";
  setListingFilterAction: (action: "all" | "action_required" | "overpriced" | "underpriced" | "safe") => void;
  matchedListingCount: number;
  actionReqListingCount: number;
  overpricedListingCount: number;
  underpricedListingCount: number;
  safeListingCount: number;
  selectedOfferCount: number;
  onClearSelectedOffers: () => void;
  selectedInventoryCount: number;
  onClearSelectedInventory: () => void;
  listingSearch: string;
  setListingSearch: (search: string) => void;
  // Action Handlers
  onLoadListingPrices: () => void;
  onFetchOffers: () => void;
  onFetchInventory: () => void;
  onSteamResync: () => void;
  onFetchClosedOffers: () => void;
}

export const ListingsToolbar: React.FC<ListingsToolbarProps> = ({
  listingSubTab,
  setListingSubTab,
  offers,
  inventory,
  closedOffers,
  offersLoading,
  inventoryLoading,
  closedOffersLoading,
  loadingListingPrices,
  listingPricesLoaded,
  steamSyncing,
  listingModeFilter,
  setListingModeFilter,
  p2pCount,
  botCount,
  inventoryMarketFilter,
  setInventoryMarketFilter,
  dmarketInventoryCount,
  steamInventoryCount,
  listingFilterAction,
  setListingFilterAction,
  matchedListingCount,
  actionReqListingCount,
  overpricedListingCount,
  underpricedListingCount,
  safeListingCount,
  selectedOfferCount,
  onClearSelectedOffers,
  selectedInventoryCount,
  onClearSelectedInventory,
  listingSearch,
  setListingSearch,
  onLoadListingPrices,
  onFetchOffers,
  onFetchInventory,
  onSteamResync,
  onFetchClosedOffers,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "8px",
        backgroundColor: "var(--so-surface-card)",
        border: "1px solid var(--so-border-medium)",
        borderRadius: "var(--so-radius-md)",
        padding: "12px 16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      {/* Top Tier: Navigation Subtabs & Primary Sync/Action Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Segmented Sub-Tabs */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            backgroundColor: "var(--so-surface-panel)",
            padding: "3px",
            borderRadius: "var(--so-radius-sm)",
            border: "1px solid var(--so-border-subtle)",
          }}
        >
          <button
            type="button"
            onClick={() => setListingSubTab("active")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "28px",
              padding: "0 12px",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              backgroundColor:
                listingSubTab === "active"
                  ? "var(--so-primary)"
                  : "transparent",
              color:
                listingSubTab === "active"
                  ? "#ffffff"
                  : "var(--so-text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <Tag size={13} />
            <span>Active Listings</span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "10px",
                backgroundColor:
                  listingSubTab === "active"
                    ? "rgba(255,255,255,0.25)"
                    : "var(--so-surface-input)",
              }}
            >
              {offers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setListingSubTab("inventory")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "28px",
              padding: "0 12px",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              backgroundColor:
                listingSubTab === "inventory"
                  ? "var(--so-primary)"
                  : "transparent",
              color:
                listingSubTab === "inventory"
                  ? "#ffffff"
                  : "var(--so-text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <Package size={13} />
            <span>Inventory (Unlisted)</span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "10px",
                backgroundColor:
                  listingSubTab === "inventory"
                    ? "rgba(255,255,255,0.25)"
                    : "var(--so-surface-input)",
              }}
            >
              {inventory.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setListingSubTab("history");
              if (closedOffers.length === 0 && !closedOffersLoading) {
                onFetchClosedOffers();
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              height: "28px",
              padding: "0 12px",
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "4px",
              border: "none",
              cursor: "pointer",
              backgroundColor:
                listingSubTab === "history"
                  ? "var(--so-primary)"
                  : "transparent",
              color:
                listingSubTab === "history"
                  ? "#ffffff"
                  : "var(--so-text-secondary)",
              transition: "all 0.15s ease",
            }}
          >
            <History size={13} />
            <span>Sales History</span>
            <span
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "10px",
                backgroundColor:
                  listingSubTab === "history"
                    ? "rgba(255,255,255,0.25)"
                    : "var(--so-surface-input)",
              }}
            >
              {closedOffers.length}
            </span>
          </button>
        </div>

        {/* Right: Primary Sync & Oracle Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={onLoadListingPrices}
            disabled={loadingListingPrices}
            className={`btn ${listingPricesLoaded ? "btn-secondary" : "btn-outline"} btn-sm`}
            style={{
              height: "32px",
              fontSize: "12px",
              padding: "0 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontWeight: 700,
            }}
            title="Load computed listing prices from Oracle Dashboard Step 3"
          >
            {loadingListingPrices ? (
              <Loader2 size={13} className="spin" />
            ) : (
              <Zap size={13} style={{ color: "var(--so-accent-cyan)" }} />
            )}
            <span>
              {listingPricesLoaded ? "Reload Oracle" : "Load Oracle Prices"}
            </span>
          </button>

          {listingSubTab === "active" && (
            <button
              onClick={onFetchOffers}
              disabled={offersLoading}
              className="btn btn-primary btn-sm"
              style={{
                height: "32px",
                fontSize: "12px",
                padding: "0 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
              }}
            >
              {offersLoading ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <RotateCw size={13} />
              )}
              <span>Sync Listings</span>
            </button>
          )}

          {listingSubTab === "inventory" && (
            <>
              <button
                onClick={onFetchInventory}
                disabled={inventoryLoading}
                className="btn btn-primary btn-sm"
                style={{
                  height: "32px",
                  fontSize: "12px",
                  padding: "0 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 700,
                }}
                title="Sync currently cached inventory from DMarket"
              >
                {inventoryLoading ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <RotateCw size={13} />
                )}
                <span>Sync Inventory</span>
              </button>
              <button
                onClick={onSteamResync}
                disabled={steamSyncing}
                className="btn btn-outline btn-sm"
                style={{
                  height: "32px",
                  fontSize: "12px",
                  padding: "0 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 700,
                }}
                title="Steam Sync Notice: DMarket caches your Steam inventory. If newly bought or traded CS2 items aren't showing, click Steam Re-sync to instruct DMarket to re-crawl your Steam account."
              >
                {steamSyncing ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                <span>Steam Re-sync</span>
                <HelpCircle
                  size={13}
                  style={{
                    color: "var(--so-accent-cyan)",
                    opacity: 0.85,
                    flexShrink: 0,
                  }}
                />
              </button>
            </>
          )}

          {listingSubTab === "history" && (
            <button
              onClick={onFetchClosedOffers}
              disabled={closedOffersLoading}
              className="btn btn-primary btn-sm"
              style={{
                height: "32px",
                fontSize: "12px",
                padding: "0 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
              }}
            >
              {closedOffersLoading ? (
                <Loader2 size={13} className="spin" />
              ) : (
                <RotateCw size={13} />
              )}
              <span>Sync History</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Tier: Mode Selectors, Filter Pills, Stats & Aligned Search Box */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          paddingTop: "10px",
          borderTop: "1px solid var(--so-border-subtle)",
        }}
      >
        {/* Left: Filter Groups & Mode Selectors */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          {/* Active Mode Filter (All / P2P / Bot) */}
          {listingSubTab === "active" && offers.length > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                backgroundColor: "var(--so-surface-panel)",
                borderRadius: "var(--so-radius-sm)",
                padding: "2px",
                border: "1px solid var(--so-border-subtle)",
                gap: "2px",
                height: "30px",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={() => setListingModeFilter("all")}
                style={{
                  height: "24px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "0 9px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    listingModeFilter === "all"
                      ? "var(--so-primary)"
                      : "transparent",
                  color:
                    listingModeFilter === "all"
                      ? "#ffffff"
                      : "var(--so-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                All Modes ({offers.length})
              </button>
              <button
                type="button"
                onClick={() => setListingModeFilter("p2p")}
                style={{
                  height: "24px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "0 9px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor:
                    listingModeFilter === "p2p" ? "#2563eb" : "transparent",
                  color: listingModeFilter === "p2p" ? "#ffffff" : "#60a5fa",
                  transition: "all 0.15s ease",
                }}
                title="Listings hosted directly in Steam inventory"
              >
                <img
                  src={steamLogo}
                  alt="Steam"
                  style={{ width: "11px", height: "11px", objectFit: "contain" }}
                />
                <span>P2P ({p2pCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setListingModeFilter("bot")}
                style={{
                  height: "24px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "0 9px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor:
                    listingModeFilter === "bot" ? "#7c3aed" : "transparent",
                  color: listingModeFilter === "bot" ? "#ffffff" : "#c084fc",
                  transition: "all 0.15s ease",
                }}
                title="Listings deposited to DMarket Bot custody"
              >
                <Bot size={11} />
                <span>Bot ({botCount})</span>
              </button>
            </div>
          )}

          {/* Inventory Location Filter (All / On DMarket / In Steam) */}
          {listingSubTab === "inventory" && inventory.length > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                backgroundColor: "var(--so-surface-panel)",
                borderRadius: "var(--so-radius-sm)",
                padding: "2px",
                border: "1px solid var(--so-border-subtle)",
                gap: "2px",
                height: "30px",
                boxSizing: "border-box",
              }}
            >
              <button
                type="button"
                onClick={() => setInventoryMarketFilter("all")}
                style={{
                  height: "24px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "0 9px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    inventoryMarketFilter === "all"
                      ? "var(--so-primary)"
                      : "transparent",
                  color:
                    inventoryMarketFilter === "all"
                      ? "#ffffff"
                      : "var(--so-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                All ({inventory.length})
              </button>
              <button
                type="button"
                onClick={() => setInventoryMarketFilter("dmarket")}
                style={{
                  height: "24px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "0 9px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor:
                    inventoryMarketFilter === "dmarket"
                      ? "#059669"
                      : "transparent",
                  color:
                    inventoryMarketFilter === "dmarket" ? "#ffffff" : "#34d399",
                  transition: "all 0.15s ease",
                }}
                title="Items deposited in DMarket bot custody"
              >
                <Bot size={11} />
                <span>On DMarket ({dmarketInventoryCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setInventoryMarketFilter("steam")}
                style={{
                  height: "24px",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "0 9px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  backgroundColor:
                    inventoryMarketFilter === "steam"
                      ? "#2563eb"
                      : "transparent",
                  color:
                    inventoryMarketFilter === "steam" ? "#ffffff" : "#60a5fa",
                  transition: "all 0.15s ease",
                }}
                title="Items in your Steam inventory available for direct P2P listing"
              >
                <img
                  src={steamLogo}
                  alt="Steam"
                  style={{ width: "11px", height: "11px", objectFit: "contain" }}
                />
                <span>In Steam (P2P) ({steamInventoryCount})</span>
              </button>
            </div>
          )}

          {/* Active Pricing Drift Filters */}
          {listingSubTab === "active" && offers.length > 0 && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setListingFilterAction("all")}
                className={`btn ${listingFilterAction === "all" ? "btn-primary" : "btn-outline"} btn-sm`}
                style={{ height: "30px", fontSize: "11px", padding: "0 10px", fontWeight: 700 }}
              >
                All Status
              </button>
              {actionReqListingCount > 0 && (
                <button
                  onClick={() => setListingFilterAction("action_required")}
                  className={`btn ${listingFilterAction === "action_required" ? "btn-danger" : "btn-outline"} btn-sm`}
                  style={{
                    height: "30px",
                    fontSize: "11px",
                    padding: "0 10px",
                    fontWeight: 700,
                    borderColor: "#ef4444",
                    color:
                      listingFilterAction === "action_required"
                        ? "#ffffff"
                        : "#ef4444",
                  }}
                >
                  Action Req ({actionReqListingCount})
                </button>
              )}
              {overpricedListingCount > 0 && (
                <button
                  onClick={() => setListingFilterAction("overpriced")}
                  className={`btn ${listingFilterAction === "overpriced" ? "btn-danger" : "btn-outline"} btn-sm`}
                  style={{
                    height: "30px",
                    fontSize: "11px",
                    padding: "0 10px",
                    fontWeight: 700,
                    borderColor: "#ef4444",
                    color:
                      listingFilterAction === "overpriced"
                        ? "#ffffff"
                        : "#ef4444",
                  }}
                >
                  Overpriced ({overpricedListingCount})
                </button>
              )}
              {underpricedListingCount > 0 && (
                <button
                  onClick={() => setListingFilterAction("underpriced")}
                  className={`btn ${listingFilterAction === "underpriced" ? "btn-warning" : "btn-outline"} btn-sm`}
                  style={{
                    height: "30px",
                    fontSize: "11px",
                    padding: "0 10px",
                    fontWeight: 700,
                    borderColor: "#f59e0b",
                    color:
                      listingFilterAction === "underpriced"
                        ? "#ffffff"
                        : "#f59e0b",
                  }}
                >
                  Underpriced ({underpricedListingCount})
                </button>
              )}
              {safeListingCount > 0 && (
                <button
                  onClick={() => setListingFilterAction("safe")}
                  className={`btn ${listingFilterAction === "safe" ? "btn-success" : "btn-outline"} btn-sm`}
                  style={{ height: "30px", fontSize: "11px", padding: "0 10px", fontWeight: 700 }}
                >
                  Safe ({safeListingCount})
                </button>
              )}
            </div>
          )}

          {/* Clear Selection Buttons */}
          {listingSubTab === "active" && selectedOfferCount > 0 && (
            <button
              onClick={onClearSelectedOffers}
              className="btn btn-outline btn-sm"
              style={{ height: "30px", fontSize: "11px", padding: "0 10px", fontWeight: 700 }}
            >
              Clear Selection ({selectedOfferCount})
            </button>
          )}

          {listingSubTab === "inventory" && selectedInventoryCount > 0 && (
            <button
              onClick={onClearSelectedInventory}
              className="btn btn-outline btn-sm"
              style={{ height: "30px", fontSize: "11px", padding: "0 10px", fontWeight: 700 }}
            >
              Clear Selection ({selectedInventoryCount})
            </button>
          )}

          {/* Active Stats Summary */}
          {listingSubTab === "active" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "var(--so-surface-panel)",
                border: "1px solid var(--so-border-subtle)",
                padding: "0 10px",
                height: "30px",
                borderRadius: "var(--so-radius-sm)",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: "var(--so-text-muted)" }}>
                Matched:{" "}
                <strong style={{ color: "var(--so-accent-cyan)" }}>
                  {matchedListingCount}
                </strong>
              </span>
              {actionReqListingCount > 0 && (
                <span style={{ color: "#ef4444" }}>
                  Action: <strong>{actionReqListingCount}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Perfectly Aligned Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "var(--so-surface-input)",
            border: "1px solid var(--so-border-medium)",
            borderRadius: "var(--so-radius-sm)",
            padding: "0 10px",
            height: "32px",
            boxSizing: "border-box",
            minWidth: "220px",
          }}
        >
          <Search size={14} style={{ color: "var(--so-text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search skins by name..."
            value={listingSearch}
            onChange={(e) => setListingSearch(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--so-text-primary)",
              fontSize: "12px",
              fontWeight: 600,
              width: "100%",
              padding: 0,
            }}
          />
          {listingSearch && (
            <button
              onClick={() => setListingSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                color: "var(--so-text-muted)",
              }}
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
