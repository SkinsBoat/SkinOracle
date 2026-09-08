import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Gem,
  RotateCw,
  Link as LinkIcon,
  Trash2,
  Loader2,
  KeyRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { skinsLogo } from "../../../../assets/images";
import TrendSparkline from "../../components/TrendSparkline";
import { useTrendStore } from "../../store/useTrendStore";

import { useAcceptedPrices } from "../../hooks/useAcceptedPrices";

export default function SkinscomWorkstation() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Accepted prices (from shared hook)
  const {
    acceptedPriceMap,
    acceptedPricesMeta,
    loadingPrices,
    pricesLoaded,
    loadAcceptedPrices,
  } = useAcceptedPrices();

  const checkTokenStatus = async (): Promise<boolean> => {
    const status = await window.electronAPI.settings.getKeysStatus();
    setHasToken(status.hasSkinscomToken);
    return status.hasSkinscomToken;
  };

  const fetchOrders = async () => {
    const tokenOk = await checkTokenStatus();
    if (!tokenOk) {
      toast.error(
        "Skins.com Session Token is not configured. Please set your token in Settings first.",
      );
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Syncing Skins.com buy orders...");
    try {
      const data: any = await window.electronAPI.skinscom.getOrders();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setOrders(list);
      useTrendStore
        .getState()
        .fetchHistoryBatch(list.map((o: any) => o.market_hash_name || o.name));
      toast.success(`Loaded ${list.length} Skins.com buy orders`, {
        id: toastId,
      });
    } catch (err: any) {
      toast.error(`Skins.com error: ${err.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    setDeletingId(id);
    const toastId = toast.loading("Deleting Skins.com buy order...");
    try {
      await window.electronAPI.skinscom.deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
      toast.success("Order deleted successfully", { id: toastId });
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`, { id: toastId });
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    // Only check token status on landing (DO NOT auto-fetch buy orders)
    checkTokenStatus();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Session Token Missing Warning Banner */}
      {hasToken === false && (
        <div
          style={{
            backgroundColor: "var(--so-warning-bg)",
            border: "1px solid var(--so-warning-border)",
            color: "var(--so-warning-text)",
            padding: "14px 20px",
            borderRadius: "var(--so-radius-md)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <KeyRound size={18} style={{ color: "var(--so-warning)" }} />{" "}
            Skins.com API key is not configured. Please add your token in
            Settings before syncing orders.
          </div>
          <Link
            to="/settings"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: "none" }}
          >
            Go to Settings
          </Link>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 20px",
          backgroundColor: "var(--so-surface-header)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src={skinsLogo}
              alt="Skins.com"
              style={{ height: 26, width: "auto", objectFit: "contain" }}
            />
            <span
              style={{
                color: "var(--so-text-primary)",
                fontWeight: 800,
                fontSize: "16px",
                letterSpacing: "-0.3px",
              }}
            >
              Skins.com Workstation
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: pricesLoaded
                  ? "var(--so-success)"
                  : "var(--so-warning)",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.5px",
                color: pricesLoaded
                  ? "var(--so-success-text)"
                  : "var(--so-warning-text)",
              }}
            >
              {pricesLoaded
                ? `ACCEPTED PRICES LOADED (${acceptedPricesMeta!.itemCount.toLocaleString()} ITEMS)`
                : "NO ACCEPTED PRICES LOADED — BUILD IN ORACLE WORKSTATION"}
            </span>
          </div>
        </div>

        <div
          className="stat-box"
          style={{
            padding: "8px 16px",
            minWidth: "110px",
            textAlign: "center",
          }}
        >
          <span className="stat-label">SKINS.COM ORDERS</span>
          <span className="stat-value">{orders.length}</span>
        </div>
      </div>

      {/* Action Control Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          padding: "10px 16px",
        }}
      >
        <div style={{ fontSize: "13px", color: "var(--so-text-secondary)" }}>
          Direct device-to-exchange order management with encrypted session key.
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="btn btn-primary btn-sm"
          >
            {loading ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <RotateCw size={14} />
            )}{" "}
            Sync Orders
          </button>
          <button
            onClick={() => loadAcceptedPrices()}
            disabled={loadingPrices}
            className={`btn ${pricesLoaded ? "btn-secondary" : "btn-outline"} btn-sm`}
          >
            {loadingPrices ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <LinkIcon size={14} />
            )}
            {pricesLoaded ? "Reload Accepted Prices" : "Load Accepted Prices"}
          </button>
        </div>
      </div>

      {/* Order Content Area */}
      <div className="card" style={{ margin: 0 }}>
        {orders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--so-text-muted)",
            }}
          >
            <Gem size={36} style={{ marginBottom: "12px", opacity: 0.5 }} />
            <div
              style={{
                fontWeight: 700,
                fontSize: "16px",
                color: "var(--so-text-primary)",
                marginBottom: "6px",
              }}
            >
              No Skins.com buy orders loaded
            </div>
            <div style={{ fontSize: "13px" }}>
              Verify your Skins.com token in Settings, then click "Sync Orders"
              above.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {orders.map((order) => {
              const name = order.market_hash_name || order.name || "";
              const currentPrice = order.price ? order.price / 100 : 0;
              const oracleData = acceptedPriceMap[name];
              const match = name.match(/^(.+?)\s*\(([^)]+)\)$/);
              const cleanTitle = match ? match[1] : name;
              const wear = match ? match[2] : "";
              const imageUrl = `https://api.steamapis.com/image/item/730/${encodeURIComponent(name)}`;

              return (
                <div
                  key={order.id}
                  style={{
                    backgroundColor: "var(--so-surface-panel)",
                    border: "1px solid var(--so-border-subtle)",
                    borderRadius: "var(--so-radius-sm)",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={name}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                      style={{
                        width: 44,
                        height: 44,
                        objectFit: "contain",
                        borderRadius: "var(--so-radius-sm)",
                        backgroundColor: "var(--so-surface-input)",
                        border: "1px solid var(--so-border-subtle)",
                        padding: "2px",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "13.5px",
                          color: "var(--so-text-primary)",
                        }}
                      >
                        {cleanTitle}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--so-text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "2px",
                        }}
                      >
                        {wear && (
                          <span
                            style={{
                              color: "var(--so-text-secondary)",
                              fontWeight: 600,
                            }}
                          >
                            {wear}
                          </span>
                        )}
                        <span>ID: {order.id}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ width: 110, flexShrink: 0 }}>
                      <TrendSparkline name={name} height={32} />
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--so-text-muted)",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        Current Bid
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          color: "var(--so-text-primary)",
                        }}
                      >
                        ${currentPrice.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--so-text-muted)",
                          textTransform: "uppercase",
                          fontWeight: 700,
                        }}
                      >
                        Accepted Price
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          color: "var(--so-success-text)",
                        }}
                      >
                        {oracleData?.acceptedPrice
                          ? `$${oracleData.acceptedPrice.toFixed(2)}`
                          : "---"}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      disabled={deletingId === order.id}
                      className="btn btn-danger btn-sm"
                      title="Delete Order"
                    >
                      {deletingId === order.id ? (
                        <Loader2 size={14} className="spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
