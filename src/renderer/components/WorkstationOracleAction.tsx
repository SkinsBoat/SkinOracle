import React, { useEffect, useState } from "react";
import { Loader2, RotateCw, Zap } from "lucide-react";
import { WorkstationDataStatusCards } from "./WorkstationDataStatusCards";

export interface WorkstationOracleActionProps {
  meta: {
    itemCount: number;
    storedAt: string | null;
  } | null;
  loading: boolean;
  onLoad: () => void | Promise<void>;
  disabled?: boolean;
  /** Which calculated dataset `meta` represents, to pick the expiry window. */
  datasetKind?: "accepted" | "listing";
}

export const WorkstationOracleAction: React.FC<
  WorkstationOracleActionProps
> = ({ meta, loading, onLoad, disabled = false, datasetKind = "accepted" }) => {
  // Live market price cache status (shared in-memory cache, refreshed by scans/auto-refresh)
  const [cacheStatus, setCacheStatus] = useState<{
    itemCount: number;
    isFetching: boolean;
    lastFetchedAt: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    window.electronAPI?.skinsnipe
      ?.getCacheStatus()
      .then((status) => {
        if (!mounted || !status) return;
        setCacheStatus({
          itemCount: status.itemCount,
          isFetching: status.isFetching,
          lastFetchedAt: status.lastFetchedAt,
        });
      })
      .catch(() => {});

    const unsubscribe = window.electronAPI?.skinsnipe?.onCacheStatusUpdated?.(
      (status) => {
        if (!mounted || !status) return;
        setCacheStatus({
          itemCount: status.itemCount,
          isFetching: status.isFetching,
          lastFetchedAt: status.lastFetchedAt,
        });
      },
    );

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const hasData = meta !== null && meta.itemCount > 0;

  return (
    <div style={styles.container}>
      <WorkstationDataStatusCards
        cacheStatus={cacheStatus}
        oracle={meta}
        oracleKind={datasetKind}
      />

      {/* Unified Action Button */}
      <button
        type="button"
        onClick={() => {
          if (!loading && !disabled) {
            onLoad();
          }
        }}
        disabled={loading || disabled}
        className={`btn btn-sm ${hasData ? "btn-secondary" : "btn-primary"}`}
        style={styles.actionButton}
        title={
          hasData
            ? "Reload Oracle prices from local memory and rematch active items"
            : "Load calculated Oracle prices from local memory"
        }
      >
        {loading ? (
          <Loader2 size={13} className="spin" />
        ) : hasData ? (
          <RotateCw size={13} />
        ) : (
          <Zap size={13} />
        )}
        <span>{hasData ? "Reload Oracle" : "Load Oracle"}</span>
      </button>
    </div>
  );
};

// ── EXTRACTED STYLES & DYNAMIC HELPERS ─────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
  },
  actionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    height: "28px",
    fontSize: "12px",
    fontWeight: 700,
    padding: "0 12px",
    whiteSpace: "nowrap",
  },
};
