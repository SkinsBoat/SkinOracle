import React, { useState } from "react";
import { isSteamApisImage } from "../../shared/utils/urlSecurity";

export interface SkinImageProps {
  src?: string;
  alt?: string;
  fallbackItemName?: string;
  height?: string | number;
  maxImageHeight?: string | number;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  title?: string;
  containerStyle?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
  zoomOnHover?: boolean;
  className?: string;
}

/**
 * Reusable SkinImage component for item/weapon cards across the workstation.
 * Centralizes image framing, contrast drop-shadows, fallback loading, and hover/clickable interactions.
 */
export const SkinImage: React.FC<SkinImageProps> = ({
  src,
  alt = "CS2 Item",
  fallbackItemName,
  height = "76px",
  maxImageHeight = "64px",
  onClick,
  title,
  containerStyle,
  imageStyle,
  zoomOnHover = true,
  className,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [hasFallbackTried, setHasFallbackTried] = useState(false);

  const isClickable = Boolean(onClick);

  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>,
  ) => {
    const target = e.currentTarget;
    if (
      fallbackItemName &&
      !hasFallbackTried &&
      !isSteamApisImage(target.src)
    ) {
      setHasFallbackTried(true);
      target.src = `https://api.steamapis.com/image/item/730/${encodeURIComponent(
        fallbackItemName,
      )}`;
    } else {
      target.style.opacity = "0.3";
    }
  };

  return (
    <div
      className={className}
      onClick={onClick}
      title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: typeof height === "number" ? `${height}px` : height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--so-radius-sm, 6px)",
        padding: "6px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        cursor: isClickable ? "pointer" : "default",
        transition: "all 0.15s ease",
        border: isClickable
          ? isHovered
            ? "1px solid var(--so-primary)"
            : "1px solid var(--so-border-subtle)"
          : undefined,
        boxShadow:
          isClickable && isHovered
            ? "0 0 8px rgba(56, 189, 248, 0.25)"
            : "none",
        ...containerStyle,
      }}
    >
      <img
        src={src}
        alt={alt}
        onError={handleImageError}
        style={{
          maxHeight:
            typeof maxImageHeight === "number"
              ? `${maxImageHeight}px`
              : maxImageHeight,
          maxWidth: "100%",
          objectFit: "contain",
          filter: "drop-shadow(0 3px 5px rgba(0, 0, 0, 0.25))",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: isHovered && zoomOnHover ? "scale(1.07)" : "scale(1)",
          ...imageStyle,
        }}
      />
    </div>
  );
};

export default SkinImage;
