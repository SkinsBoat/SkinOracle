import React, { useState } from "react";
import { getMarketLogo, getMarketInitials } from "../utils/marketLogos";

export interface MarketLogoProps {
  marketId?: string | null;
  marketName?: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
  showBackground?: boolean;
  alt?: string;
}

/**
 * Centralized Market Logo component.
 * Displays the official platform logo for any marketplace identifier or alias,
 * with a high-fidelity monogram badge fallback if unavailable or on image error.
 */
export const MarketLogo: React.FC<MarketLogoProps> = ({
  marketId,
  marketName,
  size = 16,
  style,
  className,
  showBackground = true,
  alt,
}) => {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getMarketLogo(marketId);

  // If a logo is found and hasn't failed to load
  if (logoUrl && !hasError) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: size <= 18 ? "3px" : "4px",
          backgroundColor: showBackground ? "rgba(255, 255, 255, 0.05)" : "transparent",
          border: showBackground ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
          overflow: "hidden",
          flexShrink: 0,
          boxSizing: "border-box",
          padding: "1px",
          ...style,
        }}
        title={marketName || marketId || "Market"}
      >
        <img
          src={logoUrl}
          alt={alt || marketName || marketId || "Market Logo"}
          onError={() => setHasError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    );
  }

  // Graceful Monogram / Initial badge fallback
  const initials = getMarketInitials(marketName || marketId);
  const fontSize = Math.max(8, Math.round(size * 0.46));

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size <= 18 ? "3px" : "4px",
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        border: "1px solid var(--so-border-subtle)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${fontSize}px`,
        fontWeight: 800,
        color: "var(--so-text-secondary)",
        letterSpacing: "-0.5px",
        userSelect: "none",
        flexShrink: 0,
        boxSizing: "border-box",
        ...style,
      }}
      title={marketName || marketId || "Market"}
    >
      {initials}
    </div>
  );
};

export default MarketLogo;
