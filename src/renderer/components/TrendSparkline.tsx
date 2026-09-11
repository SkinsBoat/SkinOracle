import React, { useId } from "react";
import { useTrendStore } from "../store/useTrendStore";

export interface TrendSparklineProps {
  name: string;
  data?: number[];
  labels?: string[];
  momentum?: number;
  width?: number | string;
  height?: number;
  showBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * TrendSparkline
 * High-performance SVG sparkline rendering 14-day median price trajectory.
 * Modeled after admin-skinsboat-web TrendSparkline with momentum color logic,
 * area fill gradients, end beacon, and interactive tooltips.
 * Automatically resolves data from global useTrendStore if not passed directly.
 */
export const TrendSparkline: React.FC<TrendSparklineProps> = ({
  name,
  data,
  labels,
  momentum,
  width = "100%",
  height = 34,
  showBadge = true,
  className = "",
  onClick,
}) => {
  const gradientId = useId().replace(/:/g, "_");
  const storeEntry = useTrendStore((s) => s.trendHistoryMap[name]);

  React.useEffect(() => {
    if (name && !data && storeEntry === undefined) {
      useTrendStore.getState().fetchHistoryBatch([name], 14);
    }
  }, [name, data, storeEntry]);

  const rawData = data || storeEntry?.overallAverages;
  const rawLabels = labels || storeEntry?.labels;

  const validData = Array.isArray(rawData)
    ? rawData.filter((v) => typeof v === "number" && !isNaN(v) && v > 0)
    : [];

  // Empty / Pending Fallback State
  if (validData.length < 2) {
    return (
      <div
        className={className}
        title={`${name} — Awaiting 14-day trend history`}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          height: `${height}px`,
          backgroundColor: "rgba(0, 0, 0, 0.18)",
          border: "1px dashed var(--so-border-subtle)",
          borderRadius: "var(--so-radius-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--so-text-muted)",
          fontSize: "9.5px",
          fontWeight: 600,
          userSelect: "none",
          padding: "0 6px",
        }}
      >
        <span style={{ opacity: 0.5, letterSpacing: "0.2px" }}>
          — 14D Trend Pending —
        </span>
      </div>
    );
  }

  const min = Math.min(...validData);
  const max = Math.max(...validData);
  const range = max - min || min * 0.05 || 1;

  const firstVal = validData[0];
  const lastVal = validData[validData.length - 1];

  // Calculate percentage movement from actual historical prices
  const calculatedDelta =
    firstVal > 0 ? ((lastVal - firstVal) / firstVal) * 100 : 0;
  const displayPercent = calculatedDelta;

  // Momentum Color Logic:
  // >= +2%: Emerald Green (Bullish)
  // <= -2%: Danger Red (Bearish)
  // Else: Solid Cyan / Slate (Neutral)
  let color = "#38bdf8"; // Neutral cyan
  let badgeIcon = "●";
  if (displayPercent >= 2.0) {
    color = "#10b981"; // Green
    badgeIcon = "▲";
  } else if (displayPercent <= -2.0) {
    color = "#ef4444"; // Red
    badgeIcon = "▼";
  }

  const svgWidth = 100;
  const svgHeight = height;
  const padTop = 4;
  const padBottom = 4;
  const usableHeight = Math.max(1, svgHeight - padTop - padBottom);

  const points = validData.map((val, idx) => {
    const x = (idx / (validData.length - 1)) * svgWidth;
    const norm = (val - min) / range;
    const y = svgHeight - padBottom - norm * usableHeight;
    return { x, y, val };
  });

  const lineD = points.reduce(
    (acc, p, i) =>
      `${acc} ${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`,
    "",
  );
  const areaD = `${lineD} L ${svgWidth},${svgHeight} L 0,${svgHeight} Z`;

  const lastPoint = points[points.length - 1];

  const tooltipLines = [
    `${name}`,
    `14D Movement: ${displayPercent >= 0 ? "+" : ""}${displayPercent.toFixed(1)}%`,
    `Current Median: $${lastVal.toFixed(2)}`,
    `Range: $${min.toFixed(2)} - $${max.toFixed(2)}`,
    rawLabels && rawLabels.length >= 2
      ? `Period: ${rawLabels[0]} → ${rawLabels[rawLabels.length - 1]}`
      : `${validData.length} daily snapshots`,
  ].join("\n");

  return (
    <div
      className={className}
      title={tooltipLines}
      onClick={onClick}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: `${height}px`,
        backgroundColor: "rgba(0, 0, 0, 0.25)",
        border: "1px solid var(--so-border-subtle)",
        borderRadius: "var(--so-radius-sm)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        padding: "1px 2px",
        boxSizing: "border-box",
      }}
    >
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle Area Fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Crisp Line Stroke */}
        <path
          d={lineD}
          fill="none"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End Beacon Dot */}
        {lastPoint && (
          <>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="3.5"
              fill={color}
              opacity="0.3"
            />
            <circle cx={lastPoint.x} cy={lastPoint.y} r="2" fill={color} />
          </>
        )}
      </svg>

      {/* Compact Corner Momentum Badge */}
      {showBadge && (
        <div
          style={{
            position: "absolute",
            top: "2px",
            right: "4px",
            fontSize: "8.5px",
            fontWeight: 800,
            color,
            backgroundColor: "rgba(10, 14, 23, 0.88)",
            padding: "1px 4px",
            borderRadius: "3px",
            lineHeight: "1.2",
            pointerEvents: "none",
            backdropFilter: "blur(2px)",
            border: `1px solid ${color}33`,
            display: "flex",
            alignItems: "center",
            gap: "2px",
            fontFamily: "monospace",
          }}
        >
          <span>{badgeIcon}</span>
          <span>
            {displayPercent >= 0
              ? `+${displayPercent.toFixed(1)}%`
              : `${displayPercent.toFixed(1)}%`}
          </span>
        </div>
      )}
    </div>
  );
};

export default TrendSparkline;
