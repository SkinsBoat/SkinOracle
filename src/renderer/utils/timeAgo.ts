/**
 * Utility functions for formatting relative timestamps ("time ago")
 * and determining staleness/expiration of cached Oracle pricing data.
 */

export function formatTimeAgo(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return "";

  const date = typeof dateInput === "object" && dateInput instanceof Date
    ? dateInput
    : new Date(dateInput);

  const timestamp = date.getTime();
  if (isNaN(timestamp)) return "";

  const now = Date.now();
  const diffMs = now - timestamp;

  // If clock drift or future by under 1 minute, show just now
  if (diffMs < 45 * 1000) {
    return "just now";
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

