import React from "react";
import { Gauge, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CSFloatBuyLimitIndicatorProps {
  balance?: number;
  balanceLoading?: boolean;
  orders: any[];
  ordersLoading: boolean;
  activeTab: "buy_orders" | "soclose" | "listings";
  selectedSoCloseTotal: number;
  selectedSoCloseCount: number;
  selectedOrdersTotal: number;
  selectedOrdersCount: number;
}

export const CSFloatBuyLimitIndicator: React.FC<
  CSFloatBuyLimitIndicatorProps
> = ({
  balance = 0,
  balanceLoading = false,
  orders,
  ordersLoading,
  activeTab,
  selectedSoCloseTotal,
  selectedSoCloseCount,
  selectedOrdersTotal,
  selectedOrdersCount,
}) => {
  // CSFloat maximum limits
  const maxLimitValue = balance > 0 ? balance * 10 : 0;
  const maxLimitCount = 1000;

  // Active buy orders totals
  const activeOrdersTotal = orders.reduce((sum, o) => {
    const price = (o.price || 0) / 100;
    const qty = o.qty || o.quantity || 1;
    return sum + price * qty;
  }, 0);
  const activeOrdersCount = orders.reduce(
    (sum, o) => sum + (o.qty || o.quantity || 1),
    0,
  );

  // Tab-specific projected additional values from current selection
  const isSoClose = activeTab === "soclose";
  const previewSelectedTotal = isSoClose ? selectedSoCloseTotal : 0;
  const previewSelectedCount = isSoClose ? selectedSoCloseCount : 0;

  // Total projected buy order commitment
  const totalProjectedValue = activeOrdersTotal + previewSelectedTotal;
  const totalProjectedCount = activeOrdersCount + previewSelectedCount;

  // Percentage calculations
  const percentage =
    maxLimitValue > 0 ? (totalProjectedValue / maxLimitValue) * 100 : 0;
  const activePct =
    maxLimitValue > 0
      ? Math.min(100, (activeOrdersTotal / maxLimitValue) * 100)
      : 0;
  const selectedPct =
    maxLimitValue > 0
      ? Math.min(100 - activePct, (previewSelectedTotal / maxLimitValue) * 100)
      : 0;

  // Over-limit excess
  const isValueExceeded =
    maxLimitValue > 0
      ? totalProjectedValue > maxLimitValue
      : totalProjectedValue > 0;
  const isCountExceeded = totalProjectedCount > maxLimitCount;
  const isExceeded = isValueExceeded || isCountExceeded;
  const excessAmount = Math.max(0, totalProjectedValue - maxLimitValue);
  const remainingCapacity = Math.max(0, maxLimitValue - totalProjectedValue);

  // Dynamic theme colors based on exposure percentage
  let statusTheme = {
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.14)",
    borderColor: "rgba(16, 185, 129, 0.35)",
    label: "Safe",
    barGradient: "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
    previewGradient: "linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%)",
    shadow: "none",
  };

  if (isExceeded) {
    statusTheme = {
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.2)",
      borderColor: "rgba(239, 68, 68, 0.5)",
      label: `Limit Exceeded (+${excessAmount > 0 ? `$${excessAmount.toFixed(2)}` : "Qty"})`,
      barGradient: "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
      previewGradient: "linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)",
      shadow: "0 0 10px rgba(239, 68, 68, 0.4)",
    };
  } else if (percentage >= 90) {
    statusTheme = {
      color: "#f97316",
      bgColor: "rgba(249, 115, 22, 0.16)",
      borderColor: "rgba(249, 115, 22, 0.4)",
      label: "Near Limit",
      barGradient: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)",
      previewGradient: "linear-gradient(90deg, #ea580c 0%, #ef4444 100%)",
      shadow: "none",
    };
  } else if (percentage >= 70) {
    statusTheme = {
      color: "#f59e0b",
      bgColor: "rgba(245, 158, 11, 0.16)",
      borderColor: "rgba(245, 158, 11, 0.4)",
      label: "Caution",
      barGradient: "linear-gradient(90deg, #f59e0b 0%, #eab308 100%)",
      previewGradient: "linear-gradient(90deg, #eab308 0%, #f97316 100%)",
      shadow: "none",
    };
  }

  // Fallback state when balance is $0
  const isZeroBalance = !balanceLoading && (!balance || balance <= 0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "4px",
        backgroundColor: "var(--so-surface-card)",
        border: `1px solid ${isExceeded ? "rgba(239, 68, 68, 0.5)" : "var(--so-border-medium)"}`,
        borderRadius: "var(--so-radius-md)",
        padding: "6px 12px",
        flex: 1,
        maxWidth: "460px",
        minWidth: "280px",
        boxShadow: statusTheme.shadow,
        transition: "all 0.25s ease",
      }}
      title={`CSFloat 10x Balance Limit: $${maxLimitValue.toFixed(2)} | Active: $${activeOrdersTotal.toFixed(2)} (${activeOrdersCount} orders) | Remaining: $${remainingCapacity.toFixed(2)} | Max Orders: 1,000`}
    >
      {/* Top Header Row: Title, Values & Dynamic Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Gauge
            size={13}
            style={{ color: statusTheme.color, flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 800,
              color: "var(--so-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.4px",
            }}
          >
            CSFloat Buy Limit (10x)
          </span>

          <span
            className="tabular-nums"
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: "3px",
              backgroundColor: isCountExceeded
                ? "rgba(239, 68, 68, 0.2)"
                : "var(--so-surface-panel)",
              color: isCountExceeded ? "#ef4444" : "var(--so-text-muted)",
              border: `1px solid ${isCountExceeded ? "rgba(239, 68, 68, 0.4)" : "var(--so-border-subtle)"}`,
            }}
          >
            {totalProjectedCount.toLocaleString()} /{" "}
            {maxLimitCount.toLocaleString()} orders
          </span>
        </div>

        {/* Dynamic Status Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "3px",
              backgroundColor: statusTheme.bgColor,
              border: `1px solid ${statusTheme.borderColor}`,
              color: statusTheme.color,
              padding: "1px 6px",
              borderRadius: "10px",
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "0.2px",
            }}
          >
            {isExceeded ? (
              <AlertTriangle size={10} />
            ) : (
              <CheckCircle2 size={10} />
            )}
            <span>
              {isZeroBalance
                ? "Zero Balance ($0.00)"
                : `${statusTheme.label} (${percentage.toFixed(1)}%)`}
            </span>
          </span>
        </div>
      </div>

      {/* Dynamic Visual Indicator Bar */}
      <div
        style={{
          height: "7px",
          width: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          borderRadius: "4px",
          overflow: "hidden",
          display: "flex",
          position: "relative",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Baseline Active Orders Fill */}
        <div
          style={{
            height: "100%",
            width: `${activePct}%`,
            background: statusTheme.barGradient,
            transition: "width 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            borderRadius: selectedPct > 0 ? "4px 0 0 4px" : "4px",
          }}
        />

        {/* Selected Cards Fill (Preview Segment with animated striped pattern) */}
        {selectedPct > 0 && (
          <div
            style={{
              height: "100%",
              width: `${selectedPct}%`,
              background: `repeating-linear-gradient(
                -45deg,
                rgba(255, 255, 255, 0.22),
                rgba(255, 255, 255, 0.22) 5px,
                rgba(255, 255, 255, 0.06) 5px,
                rgba(255, 255, 255, 0.06) 10px
              ), ${statusTheme.previewGradient}`,
              transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              borderRadius: activePct > 0 ? "0 4px 4px 0" : "4px",
            }}
          />
        )}

        {/* Pulsing Overflow Indicator if limit is exceeded */}
        {isExceeded && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              background:
                "linear-gradient(90deg, transparent 60%, rgba(239, 68, 68, 0.8) 100%)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Bottom Metrics Breakdown */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "9.5px",
          color: "var(--so-text-muted)",
          fontWeight: 700,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <span>
            Active:{" "}
            <strong
              className="tabular-nums"
              style={{ color: "var(--so-text-primary)" }}
            >
              ${activeOrdersTotal.toFixed(2)}
            </strong>
          </span>

          {previewSelectedTotal > 0 && (
            <span style={{ color: statusTheme.color }}>
              + Selected:{" "}
              <strong className="tabular-nums">
                +${previewSelectedTotal.toFixed(2)}
              </strong>{" "}
              ({previewSelectedCount})
            </span>
          )}

          {!isSoClose && selectedOrdersCount > 0 && (
            <span style={{ color: "var(--so-primary)" }}>
              (Selected:{" "}
              <strong className="tabular-nums">
                ${selectedOrdersTotal.toFixed(2)}
              </strong>
              )
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span>Total:</span>
          <strong
            className="tabular-nums"
            style={{
              color: isExceeded ? "#ef4444" : "#ffffff",
              fontSize: "10.5px",
            }}
          >
            ${totalProjectedValue.toFixed(2)}
          </strong>
          <span style={{ color: "var(--so-text-muted)" }}>
            / ${maxLimitValue.toFixed(2)} Max
          </span>
        </div>
      </div>
    </div>
  );
};
