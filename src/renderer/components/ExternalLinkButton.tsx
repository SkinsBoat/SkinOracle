import React, { useEffect, useRef, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export interface ExternalLinkButtonProps {
  /** Destination URL. When empty the control renders disabled. */
  url?: string | null;
  /** Tooltip / accessible label for the destination. */
  label?: string;
  /** Icon size in px. */
  size?: number;
  /** Optional click override; defaults to opening the URL externally. */
  onOpen?: () => void;
  /** Long-press copies the URL instead of opening it. Defaults to true. */
  copyOnLongPress?: boolean;
  /** Optional custom toast message when the URL is copied. */
  copyMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

const LONG_PRESS_MS = 550;

const isSafeExternalUrl = (value?: string | null): boolean => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Reusable external-link control for item cards.
 *
 * - Click opens the URL in the user's default browser.
 * - Long-press copies the generated URL to the clipboard.
 * - Shows a check briefly after copying.
 */
export const ExternalLinkButton: React.FC<ExternalLinkButtonProps> = ({
  url,
  label,
  size = 13,
  onOpen,
  copyOnLongPress = true,
  copyMessage = "URL copied to clipboard",
  className,
  style,
}) => {
  const [copied, setCopied] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUrl = isSafeExternalUrl(url);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const clearCopyReset = () => {
    if (copyResetTimer.current) {
      clearTimeout(copyResetTimer.current);
      copyResetTimer.current = null;
    }
  };

  useEffect(
    () => () => {
      clearLongPress();
      clearCopyReset();
    },
    [],
  );

  const copyUrl = async () => {
    if (!hasUrl || !url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(copyMessage);
      clearCopyReset();
      copyResetTimer.current = setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Could not copy URL");
    }
  };

  const startLongPress = () => {
    if (!copyOnLongPress || !hasUrl || !url) return;
    clearLongPress();
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      longPressTimer.current = null;
      void copyUrl();
    }, LONG_PRESS_MS);
  };

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (!hasUrl) return;
    if (onOpen) {
      onOpen();
      return;
    }
    window.electronAPI?.app?.openExternal?.(url as string);
  };

  return (
    <button
      type="button"
      className={`external-link-btn ${className || ""}`.trim()}
      style={style}
      disabled={!hasUrl}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void copyUrl();
      }}
      title={
        hasUrl
          ? `${label || "Open link"} — right-click to copy URL`
          : "Link unavailable"
      }
      aria-label={label || "Open external link"}
    >
      {copied ? <Check size={size} /> : <ExternalLink size={size} />}
    </button>
  );
};

export default ExternalLinkButton;
