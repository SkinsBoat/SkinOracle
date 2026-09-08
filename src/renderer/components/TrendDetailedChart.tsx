import React, { useEffect, useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useTrendStore } from "../store/useTrendStore";

export interface TrendDetailedChartProps {
  name: string;
  data?: number[];
  labels?: string[];
  momentum?: number;
  height?: number;
  className?: string;
  compact?: boolean;
}

/**
 * TrendDetailedChart
 * Responsive high-resolution historical trend chart powered by Recharts.
 * Automatically adapts to 100% of any container width without letterboxing or clipping.
 * Pulls directly from useTrendStore if data is not directly supplied.
 */
export const TrendDetailedChart: React.FC<TrendDetailedChartProps> = ({
  name,
  data,
  labels,
  momentum,
  height = 130,
  className = "",
  compact = false,
}) => {
  const gradientId = useId().replace(/:/g, "_");
  const storeEntry = useTrendStore((s) => s.trendHistoryMap[name]);

  useEffect(() => {
    if (!data && !storeEntry && name) {
      useTrendStore.getState().fetchHistoryBatch([name]);
    }
  }, [name, data, storeEntry]);

  const rawData = data || storeEntry?.overallAverages || [];
  const rawLabels = labels || storeEntry?.labels || [];

  const validData = Array.isArray(rawData)
    ? rawData.filter((v) => typeof v === "number" && !isNaN(v) && v > 0)
    : [];

  const firstVal = validData[0] || 0;
  const lastVal = validData[validData.length - 1] || 0;
  const deltaPct = firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const effectiveMomentum =
    typeof momentum === "number" && !isNaN(momentum)
      ? momentum * 100
      : deltaPct;

  const isUp = effectiveMomentum >= 3.0;
  const isDown = effectiveMomentum <= -3.0;
  const themeColor = isUp ? "#10b981" : isDown ? "#ef4444" : "#38bdf8";

  const min = validData.length > 0 ? Math.min(...validData) : 0;
  const max = validData.length > 0 ? Math.max(...validData) : 0;
  const padding = Math.max(0.01, (max - min) * 0.12 || min * 0.04);
  const domain = [
    Math.max(0, parseFloat((min - padding).toFixed(2))),
    parseFloat((max + padding).toFixed(2)),
  ];

  const chartData = validData.map((val, idx) => {
    const rawDate = rawLabels[idx] || "";
    // Format YYYY-MM-DD -> MM/DD for clean axis labeling
    const shortLabel =
      rawDate.length >= 10
        ? `${rawDate.slice(5, 7)}/${rawDate.slice(8, 10)}`
        : rawDate || `D${idx + 1}`;
    return {
      index: idx,
      date: rawDate || `Day ${idx + 1}`,
      shortDate: shortLabel,
      price: val,
    };
  });

  return (
    <div
      className={className}
      style={{
        backgroundColor: "var(--so-surface-panel)",
        border: "1px solid var(--so-border-subtle)",
        borderRadius: "var(--so-radius-sm)",
        padding: compact ? "8px 10px" : "12px 14px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "var(--so-text-primary)",
            }}
          >
            14-Day Price Trend History
          </span>
          <span
            style={{
              fontSize: "10px",
              color: "var(--so-text-muted)",
              backgroundColor: "var(--so-surface-card)",
              padding: "1px 6px",
              borderRadius: "4px",
              border: "1px solid var(--so-border-subtle)",
            }}
          >
            SQLite Local Analytics
          </span>
        </div>

        {validData.length >= 2 && (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              color: themeColor,
              backgroundColor: isUp
                ? "rgba(16, 185, 129, 0.15)"
                : isDown
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(56, 189, 248, 0.15)",
              border: `1px solid ${themeColor}40`,
              padding: "2px 8px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontFamily: "monospace",
            }}
          >
            {isUp ? "▲" : isDown ? "▼" : "●"}{" "}
            {effectiveMomentum >= 0
              ? `+${effectiveMomentum.toFixed(1)}%`
              : `${effectiveMomentum.toFixed(1)}%`}{" "}
            (14D)
          </span>
        )}
      </div>

      {validData.length >= 2 ? (
        <div>
          {/* Summary Metrics Row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "11px",
              color: "var(--so-text-muted)",
              marginBottom: "8px",
            }}
          >
            <span>
              Min:{" "}
              <strong style={{ color: "var(--so-text-primary)" }}>
                ${min.toFixed(2)}
              </strong>
            </span>
            <span>
              Max:{" "}
              <strong style={{ color: "var(--so-text-primary)" }}>
                ${max.toFixed(2)}
              </strong>
            </span>
            <span>
              Latest:{" "}
              <strong style={{ color: themeColor }}>
                ${lastVal.toFixed(2)}
              </strong>
            </span>
            <span>
              Points:{" "}
              <strong style={{ color: "var(--so-text-primary)" }}>
                {validData.length} Days
              </strong>
            </span>
          </div>

          {/* Recharts Responsive Container */}
          <div
            style={{
              width: "100%",
              height: `${height}px`,
              backgroundColor: "rgba(0, 0, 0, 0.35)",
              borderRadius: "var(--so-radius-sm)",
              overflow: "hidden",
              border: "1px solid var(--so-border-subtle)",
              paddingTop: "6px",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 12, bottom: 2 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={themeColor}
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor={themeColor}
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255, 255, 255, 0.05)"
                  vertical={false}
                />

                <XAxis
                  dataKey="shortDate"
                  tickLine={false}
                  axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
                  tick={{
                    fill: "var(--so-text-muted)",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                  interval="preserveStartEnd"
                />

                <YAxis domain={domain} hide={true} />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div
                          style={{
                            backgroundColor: "rgba(15, 23, 42, 0.95)",
                            border: `1px solid ${themeColor}60`,
                            padding: "6px 12px",
                            borderRadius: "6px",
                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                            fontSize: "11px",
                          }}
                        >
                          <div
                            style={{
                              color: "var(--so-text-muted)",
                              marginBottom: "2px",
                              fontFamily: "monospace",
                            }}
                          >
                            {item.date}
                          </div>
                          <div
                            style={{
                              fontWeight: 800,
                              color: themeColor,
                              fontSize: "13px",
                              fontFamily: "monospace",
                            }}
                          >
                            ${Number(item.price).toFixed(2)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={themeColor}
                  strokeWidth={2.4}
                  fillOpacity={1}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                  dot={{ r: 2.5, fill: themeColor, strokeWidth: 0 }}
                  activeDot={{
                    r: 5,
                    fill: themeColor,
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "16px 10px",
            color: "var(--so-text-muted)",
            fontSize: "11.5px",
          }}
        >
          <p style={{ margin: "0 0 4px 0", fontWeight: 600 }}>
            No 14-day historical trend recorded yet for this skin
          </p>
          <p style={{ margin: 0, fontSize: "10.5px", opacity: 0.7 }}>
            Snapshots accumulate automatically each day or can be generated via
            "Seed 14-Day History" in Oracle Dashboard.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrendDetailedChart;
