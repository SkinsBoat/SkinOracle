import React, { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import {
  RotateCw,
  Trash2,
  Loader2,
  RefreshCw,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  History,
  Target,
  Eye,
  Zap,
} from "lucide-react";
import {
  DmarketTargetItem,
  AcceptedPriceInfo,
} from "../../../../../shared/types";
import TrendSparkline from "../../../../components/TrendSparkline";
import { CopyMarketHashButton } from "../../../../components/CopyMarketHashButton";
import {
  TargetAnalysis,
  getWearShortcut,
  getTradeTitle,
  getTradePrice,
  getTradeAmount,
  getTradeDate,
} from "../../dmarket-utils";

interface TargetTabProps {
  hasKey: boolean | null;
  targets: DmarketTargetItem[];
  setTargets: React.Dispatch<React.SetStateAction<DmarketTargetItem[]>>;
  loading: boolean;
  fetchTargets: () => Promise<void>;
  isSidebarExpanded: boolean;
  onUserDataUpdated: () => Promise<void>;
  onOpenLookupModal: (
    title: string,
    acceptedPrice?: number,
    marketPrice?: number,
    iconUrl?: string,
  ) => void;
  onOpenEditModal: (
    target: DmarketTargetItem,
    analysis?: TargetAnalysis,
  ) => void;
  onOpenMarket: (title: string) => void;
}

export const TargetTab: React.FC<TargetTabProps> = ({
  hasKey,
  targets,
  setTargets,
  loading,
  fetchTargets,
  isSidebarExpanded,
  onUserDataUpdated,
  onOpenLookupModal,
  onOpenEditModal,
  onOpenMarket,
}) => {
  const [targetSubTab, setTargetSubTab] = useState<"active" | "history">(
    "active",
  );
  const [driftThresholdPercent, setDriftThresholdPercent] = useState<number>(2);
  const [showExtraOptions, setShowExtraOptions] = useState(false);
  const [filterAction, setFilterAction] = useState<
    "all" | "action_required" | "overbid" | "underbid" | "safe"
  >("all");

  const [targetAnalysis, setTargetAnalysis] = useState<
    Record<string, TargetAnalysis>
  >({});
  const [acceptedPricesMeta, setAcceptedPricesMeta] = useState<{
    itemCount: number;
    storedAt: string | null;
  } | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);

  const [selectedTargets, setSelectedTargets] = useState<
    Record<string, boolean>
  >({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  const [closedTrades, setClosedTrades] = useState<any[]>([]);
  const [closedLoading, setClosedLoading] = useState(false);
  const isFetchingClosedTargetsRef = useRef(false);

  const fetchClosedTargets = async () => {
    if (isFetchingClosedTargetsRef.current) return;
    isFetchingClosedTargetsRef.current = true;

    setClosedLoading(true);
    const toastId = "dmarket-closed-targets";
    toast.loading("Loading target history...", { id: toastId });
    try {
      const res = await window.electronAPI.dmarket.getClosedTargets(50);
      setClosedTrades(Array.isArray(res?.trades) ? res.trades : []);
      toast.success(
        `Loaded ${res?.trades?.length || 0} completed target trades`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`Failed to fetch target history: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setClosedLoading(false);
      isFetchingClosedTargetsRef.current = false;
    }
  };

  useEffect(() => {
    if (targetSubTab === "history" && closedTrades.length === 0 && hasKey) {
      fetchClosedTargets();
    }
  }, [targetSubTab, hasKey]);

  const loadAcceptedPrices = async () => {
    setLoadingPrices(true);
    const toastId = toast.loading("Matching Oracle accepted prices...");
    try {
      const result: {
        map: Record<string, AcceptedPriceInfo>;
        itemCount: number;
        storedAt: string | null;
      } = await (window.electronAPI.oracle as any).getAcceptedPrices();

      if (!result || result.itemCount === 0) {
        toast.error(
          "No accepted prices found in memory. Please evaluate skins in Oracle Dashboard first.",
          { id: toastId },
        );
        setLoadingPrices(false);
        return;
      }

      setAcceptedPricesMeta({
        itemCount: result.itemCount,
        storedAt: result.storedAt,
      });

      const newAnalysis: Record<string, TargetAnalysis> = {};
      targets.forEach((target) => {
        const title = target.title;
        const priceEntry = result.map[title];
        if (!priceEntry) return;

        const currentPriceDollar = parseFloat(target.priceCents) / 100;
        const acceptedDollar = parseFloat(priceEntry.acceptedPrice.toFixed(2));

        newAnalysis[target.targetId] = {
          acceptedPrice: acceptedDollar,
          liquidityScore: priceEntry.liquidityScore,
          isHyperLiquid: priceEntry.isHyperLiquid,
          currentPrice: currentPriceDollar,
          trendMomentum14d: priceEntry.trendMomentum14d,
        };
      });

      setTargetAnalysis(newAnalysis);
      toast.success(
        `Matched ${Object.keys(newAnalysis).length} targets with Oracle prices`,
        { id: toastId },
      );
    } catch (err: any) {
      toast.error(`Failed to load accepted prices: ${err.message}`, {
        id: toastId,
      });
    } finally {
      setLoadingPrices(false);
    }
  };

  const getTargetDriftDetails = (target: DmarketTargetItem) => {
    const analysis = targetAnalysis[target.targetId];
    if (!analysis?.acceptedPrice) return null;

    const currentPrice = parseFloat(target.priceCents) / 100;
    const oraclePrice = analysis.acceptedPrice;

    const drift =
      oraclePrice > 0 ? (currentPrice - oraclePrice) / oraclePrice : 0;
    const thresholdFraction = (driftThresholdPercent || 2) / 100;

    const isOverbid = drift > thresholdFraction;
    const isUnderbid = drift < -thresholdFraction;
    const isActionRequired = isOverbid || isUnderbid;

    return {
      acceptedPrice: oraclePrice,
      currentPrice,
      drift,
      driftPercent: drift * 100,
      isActionRequired,
      isOverbid,
      isUnderbid,
      trendMomentum14d: analysis.trendMomentum14d,
    };
  };

  const handleDeleteTarget = async (targetId: string, title: string) => {
    setProcessingId(targetId);
    const toastId = toast.loading(`Deleting target for ${title}...`);
    try {
      await window.electronAPI.dmarket.deleteTarget(targetId);
      setTargets((prev) => prev.filter((t) => t.targetId !== targetId));
      setSelectedTargets((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      toast.success(`Target deleted for ${title}`, { id: toastId });
      onUserDataUpdated();
    } catch (err: any) {
      toast.error(`Failed to delete target: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickUpdateToOracle = async (
    target: DmarketTargetItem,
    acceptedPrice: number,
  ) => {
    const targetQty = parseInt(target.amount, 10) || 1;
    setProcessingId(target.targetId);
    const toastId = toast.loading(
      `Updating ${target.title} to $${acceptedPrice.toFixed(2)}...`,
    );
    try {
      const res = await window.electronAPI.dmarket.updateTarget(
        target.targetId,
        target.title,
        acceptedPrice,
        targetQty,
      );
      const newTargetId = res?.newTargetId || target.targetId;
      const updatedPriceCents = String(Math.round(acceptedPrice * 100));

      setTargets((prev) =>
        prev.map((t) =>
          t.targetId === target.targetId
            ? {
                ...t,
                targetId: newTargetId,
                priceCents: updatedPriceCents,
              }
            : t,
        ),
      );

      if (targetAnalysis[target.targetId]) {
        setTargetAnalysis((prev) => {
          const next = { ...prev };
          const entry = next[target.targetId];
          delete next[target.targetId];
          next[newTargetId] = {
            ...entry,
            currentPrice: acceptedPrice,
          };
          return next;
        });
      }

      toast.success(`Target updated to $${acceptedPrice.toFixed(2)}`, {
        id: toastId,
      });
      onUserDataUpdated();
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuantityAdjust = async (
    target: DmarketTargetItem,
    delta: number,
  ) => {
    const currentQty = parseInt(target.amount, 10) || 1;
    const newQty = Math.max(1, currentQty + delta);
    if (newQty === currentQty) return;

    setTargets((prev) =>
      prev.map((t) =>
        t.targetId === target.targetId ? { ...t, amount: String(newQty) } : t,
      ),
    );
    const currentPrice = parseFloat(target.priceCents) / 100;
    try {
      const res = await window.electronAPI.dmarket.updateTarget(
        target.targetId,
        target.title,
        currentPrice,
        newQty,
      );
      if (res?.newTargetId && res.newTargetId !== target.targetId) {
        setTargets((prev) =>
          prev.map((t) =>
            t.targetId === target.targetId
              ? { ...t, targetId: res.newTargetId }
              : t,
          ),
        );
      }
    } catch (err: any) {
      toast.error(`Failed to adjust quantity: ${err.message}`);
      setTargets((prev) =>
        prev.map((t) =>
          t.targetId === target.targetId
            ? { ...t, amount: String(currentQty) }
            : t,
        ),
      );
    }
  };

  const handleBatchUpdateToOracle = async () => {
    const selectedIds = Object.keys(selectedTargets).filter(
      (id) => selectedTargets[id],
    );
    if (selectedIds.length === 0) {
      toast.error("No targets selected");
      return;
    }

    const eligibleTargets = targets.filter((t) => {
      if (!selectedTargets[t.targetId]) return false;
      const analysis = targetAnalysis[t.targetId];
      return !!analysis?.acceptedPrice;
    });

    if (eligibleTargets.length === 0) {
      toast.error(
        "None of the selected targets have a matching Oracle accepted price",
      );
      return;
    }

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    const processedTitles = new Set<string>();
    const toastId = toast.loading(
      `Updating 0/${eligibleTargets.length} targets...`,
    );

    for (let i = 0; i < eligibleTargets.length; i++) {
      const target = eligibleTargets[i];
      if (processedTitles.has(target.title)) {
        continue;
      }
      processedTitles.add(target.title);

      const analysis = targetAnalysis[target.targetId];
      const targetPrice = analysis.acceptedPrice;
      const targetQty = parseInt(target.amount, 10) || 1;

      toast.loading(
        `[${i + 1}/${eligibleTargets.length}] Updating: ${target.title}...`,
        { id: toastId },
      );
      try {
        const res = await window.electronAPI.dmarket.updateTarget(
          target.targetId,
          target.title,
          targetPrice,
          targetQty,
        );
        const newTargetId = res?.newTargetId || target.targetId;
        const updatedPriceCents = String(Math.round(targetPrice * 100));

        setTargets((prev) =>
          prev.map((t) =>
            t.targetId === target.targetId
              ? {
                  ...t,
                  targetId: newTargetId,
                  priceCents: updatedPriceCents,
                }
              : t,
          ),
        );
        successCount++;
      } catch (err: any) {
        console.error(`Batch update error for ${target.title}:`, err);
        failCount++;
        const errMsg = err?.message || "Update failed";
        errors.push(`${target.title}: ${errMsg}`);
      }

      if (i < eligibleTargets.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setBatchProcessing(false);
    setSelectedTargets({});
    await onUserDataUpdated();

    if (failCount === 0) {
      toast.success(
        `Batch complete: all ${successCount} target(s) updated successfully!`,
        { id: toastId },
      );
    } else if (successCount === 0) {
      const sampleErr = errors[0] || "DMarket rejected update";
      toast.error(`Batch failed (${failCount} target(s)): ${sampleErr}`, {
        id: toastId,
        duration: 8000,
      });
    } else {
      toast.error(
        `Batch finished: ${successCount} updated, ${failCount} failed. ${errors[0] || ""}`,
        {
          id: toastId,
          duration: 8000,
        },
      );
    }
  };

  const handleBatchDelete = async () => {
    const selectedIds = Object.keys(selectedTargets).filter(
      (id) => selectedTargets[id],
    );
    if (selectedIds.length === 0) {
      toast.error("No targets selected");
      return;
    }

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;
    const deleteErrors: string[] = [];
    const toastId = toast.loading(
      `Deleting 0/${selectedIds.length} targets...`,
    );

    for (let i = 0; i < selectedIds.length; i++) {
      const targetId = selectedIds[i];
      try {
        await window.electronAPI.dmarket.deleteTarget(targetId);
        setTargets((prev) => prev.filter((t) => t.targetId !== targetId));
        successCount++;
      } catch (err: any) {
        console.error(`Batch delete error for target ${targetId}:`, err);
        failCount++;
        deleteErrors.push(err?.message || "Delete failed");
      }
      toast.loading(`Deleted ${i + 1}/${selectedIds.length}...`, {
        id: toastId,
      });

      if (i < selectedIds.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }

    setBatchProcessing(false);
    setSelectedTargets({});
    await onUserDataUpdated();

    if (failCount === 0) {
      toast.success(`Successfully deleted ${successCount} target(s)`, {
        id: toastId,
      });
    } else if (successCount === 0) {
      toast.error(
        `Failed to delete target(s): ${deleteErrors[0] || "DMarket error"}`,
        {
          id: toastId,
          duration: 6000,
        },
      );
    } else {
      toast.error(
        `Deleted ${successCount} target(s), but ${failCount} failed.`,
        {
          id: toastId,
          duration: 6000,
        },
      );
    }
  };

  const clearSelection = () => setSelectedTargets({});

  const filteredTargets = useMemo(() => {
    return targets.filter((target) => {
      if (filterAction !== "all") {
        const driftDetails = getTargetDriftDetails(target);
        if (filterAction === "action_required") {
          if (!driftDetails || !driftDetails.isActionRequired) return false;
        } else if (filterAction === "overbid") {
          if (!driftDetails || !driftDetails.isOverbid) return false;
        } else if (filterAction === "underbid") {
          if (!driftDetails || !driftDetails.isUnderbid) return false;
        } else if (filterAction === "safe") {
          if (!driftDetails || driftDetails.isActionRequired) return false;
        }
      }
      return true;
    });
  }, [targets, filterAction, targetAnalysis, driftThresholdPercent]);

  const matchedCount = useMemo(() => {
    return targets.filter((t) => !!targetAnalysis[t.targetId]?.acceptedPrice)
      .length;
  }, [targets, targetAnalysis]);

  const actionRequiredCount = useMemo(() => {
    return targets.filter((t) => {
      const d = getTargetDriftDetails(t);
      return d?.isActionRequired;
    }).length;
  }, [targets, targetAnalysis, driftThresholdPercent]);

  const handleSelectActionRequired = () => {
    const next: Record<string, boolean> = {};
    targets.forEach((t) => {
      const d = getTargetDriftDetails(t);
      if (d?.isActionRequired) {
        next[t.targetId] = true;
      }
    });
    setSelectedTargets(next);
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    targets.forEach((t) => {
      next[t.targetId] = true;
    });
    setSelectedTargets(next);
  };

  const selectedCount = Object.values(selectedTargets).filter(Boolean).length;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--so-surface-card)",
          border: "1px solid var(--so-border-medium)",
          borderRadius: "var(--so-radius-md)",
          padding: "8px 14px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {/* Left Controls: Sub-Tabs & Stats Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "3px",
              backgroundColor: "var(--so-surface-panel)",
              padding: "2px",
              borderRadius: "var(--so-radius-sm)",
              border: "1px solid var(--so-border-subtle)",
            }}
          >
            <button
              type="button"
              onClick={() => setTargetSubTab("active")}
              style={{
                padding: "3px 10px",
                fontSize: "11.5px",
                fontWeight: 700,
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  targetSubTab === "active"
                    ? "var(--so-primary)"
                    : "transparent",
                color:
                  targetSubTab === "active"
                    ? "#ffffff"
                    : "var(--so-text-secondary)",
                transition: "all 0.15s ease",
              }}
            >
              Active ({targets.length})
            </button>
            <button
              type="button"
              onClick={() => setTargetSubTab("history")}
              style={{
                padding: "3px 10px",
                fontSize: "11.5px",
                fontWeight: 700,
                borderRadius: "4px",
                border: "none",
                cursor: "pointer",
                backgroundColor:
                  targetSubTab === "history"
                    ? "var(--so-primary)"
                    : "transparent",
                color:
                  targetSubTab === "history"
                    ? "#ffffff"
                    : "var(--so-text-secondary)",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <History size={12} /> History
            </button>
          </div>

          {targetSubTab === "active" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "var(--so-surface-panel)",
                border: "1px solid var(--so-border-medium)",
                padding: "4px 10px",
                borderRadius: "var(--so-radius-sm)",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: "var(--so-text-muted)" }}>
                Targets:{" "}
                <strong style={{ color: "var(--so-text-primary)" }}>
                  {targets.length}
                </strong>
              </span>
              <span style={{ color: "var(--so-text-muted)" }}>
                Matched:{" "}
                <strong style={{ color: "var(--so-accent-cyan)" }}>
                  {matchedCount}
                </strong>
              </span>
              {actionRequiredCount > 0 && (
                <button
                  type="button"
                  onClick={handleSelectActionRequired}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  title="Click to select all targets requiring action"
                >
                  <AlertTriangle size={12} /> Action Req:{" "}
                  <strong>{actionRequiredCount}</strong>
                </button>
              )}
            </div>
          )}

          {targetSubTab === "active" && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setShowExtraOptions((prev) => !prev)}
                className="btn btn-sm"
                style={{
                  backgroundColor: showExtraOptions
                    ? "var(--so-surface-input)"
                    : "transparent",
                  color: showExtraOptions
                    ? "var(--so-primary)"
                    : "var(--so-text-muted)",
                  border: "1px solid var(--so-border-subtle)",
                  padding: "3px 7px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  borderRadius: "4px",
                }}
                title="Toggle Threshold & Options"
              >
                <Sliders size={12} />
                <span style={{ fontSize: "10.5px" }}>
                  {showExtraOptions ? "Hide" : "Options"}
                </span>
                {showExtraOptions ? (
                  <ChevronLeft size={13} />
                ) : (
                  <ChevronRight size={13} />
                )}
              </button>

              <div
                style={{
                  maxWidth: showExtraOptions ? "220px" : "0px",
                  opacity: showExtraOptions ? 1 : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    backgroundColor: "var(--so-surface-input)",
                    border: "1px solid var(--so-border-medium)",
                    padding: "2px 6px",
                    borderRadius: "var(--so-radius-sm)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "var(--so-text-secondary)",
                    }}
                  >
                    Threshold:
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="20"
                    value={driftThresholdPercent}
                    onChange={(e) =>
                      setDriftThresholdPercent(parseFloat(e.target.value) || 2)
                    }
                    style={{
                      width: "42px",
                      padding: "1px 3px",
                      fontSize: "11px",
                      fontWeight: 800,
                      textAlign: "center",
                      backgroundColor: "var(--so-surface-card)",
                      color: "var(--so-text-primary)",
                      border: "1px solid var(--so-border-subtle)",
                      borderRadius: "3px",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: "var(--so-text-muted)",
                    }}
                  >
                    %
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Controls: Drift Filter Pills & Oracle Load */}
        {targetSubTab === "active" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {(
                [
                  { id: "all", label: "All" },
                  { id: "action_required", label: "Action Req" },
                  { id: "overbid", label: "Overbid" },
                  { id: "underbid", label: "Underbid" },
                  { id: "safe", label: "Safe" },
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setFilterAction(pill.id)}
                  style={{
                    padding: "3px 8px",
                    fontSize: "11px",
                    borderRadius: "12px",
                    border: "1px solid",
                    cursor: "pointer",
                    fontWeight: 700,
                    backgroundColor:
                      filterAction === pill.id
                        ? "var(--so-primary)"
                        : "transparent",
                    color:
                      filterAction === pill.id
                        ? "#ffffff"
                        : "var(--so-text-secondary)",
                    borderColor:
                      filterAction === pill.id
                        ? "var(--so-primary)"
                        : "var(--so-border-subtle)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={fetchTargets}
              disabled={loading}
              title="Refresh DMarket active targets"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11.5px",
                padding: "5px 12px",
              }}
            >
              {loading ? (
                <Loader2 size={12} className="spin" />
              ) : (
                <RefreshCw size={12} />
              )}
              <span>Sync Targets</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={loadAcceptedPrices}
              disabled={loadingPrices}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11.5px",
                padding: "5px 12px",
              }}
            >
              <RotateCw size={12} className={loadingPrices ? "spin" : ""} />
              <span>
                {acceptedPricesMeta ? "Re-load Oracle" : "Load Oracle"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── SUB-TAB: ACTIVE TARGETS (CARDS GRID) ─────────────────────── */}
      {targetSubTab === "active" && (
        <>
          {loading ? (
            <div
              style={{
                padding: "60px 0",
                textAlign: "center",
                color: "var(--so-text-muted)",
              }}
            >
              <Loader2
                size={32}
                className="spin"
                style={{ margin: "0 auto 12px" }}
              />
              <div>Fetching active targets from DMarket...</div>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: "center",
                padding: "50px 20px",
                color: "var(--so-text-muted)",
                backgroundColor: "var(--so-surface-card)",
                border: "1px solid var(--so-border-medium)",
                borderRadius: "var(--so-radius-md)",
              }}
            >
              <Target
                size={38}
                style={{ margin: "0 auto 12px", opacity: 0.4 }}
              />
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--so-text-primary)",
                }}
              >
                No targets found
              </div>
              <div style={{ fontSize: "12.5px", marginTop: "4px" }}>
                {filterAction !== "all"
                  ? 'Try switching filter back to "All"'
                  : "No active buy targets found on your DMarket account"}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "10px",
                paddingBottom: selectedCount > 0 ? "75px" : "12px",
              }}
            >
              {filteredTargets.map((target) => {
                const driftDetails = getTargetDriftDetails(target);
                const isSelected = !!selectedTargets[target.targetId];
                const currentPrice = parseFloat(target.priceCents) / 100;
                const isProcessing = processingId === target.targetId;

                const cardBorderColor = isSelected
                  ? "var(--so-primary)"
                  : driftDetails?.isOverbid
                    ? "#ef4444"
                    : driftDetails?.isUnderbid
                      ? "#f59e0b"
                      : "var(--so-border-medium)";

                const match = target.title.match(/^(.+?)\s*\(([^)]+)\)$/);
                const cleanTitle = match ? match[1] : target.title;
                const wearShortcut = getWearShortcut(
                  target.attributes?.cs2?.exterior || (match ? match[2] : ""),
                );
                const isStattrak =
                  target.title.includes("StatTrak™") ||
                  target.attributes?.cs2?.category === "CATEGORY_STATTRACK";
                const phase = target.attributes?.cs2?.phase;

                const imageUrl =
                  target.attributes?.image ||
                  `https://api.steamapis.com/image/item/730/${encodeURIComponent(target.title)}`;

                return (
                  <div
                    key={target.targetId}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "8px",
                      margin: 0,
                      padding: "10px",
                      minHeight: "240px",
                      height: "auto",
                      boxSizing: "border-box",
                      borderRadius: "var(--so-radius-md)",
                      backgroundColor: "var(--so-surface-card)",
                      border: `1px solid ${isSelected ? "var(--so-primary)" : cardBorderColor}`,
                      boxShadow: isSelected
                        ? "inset 0 0 0 1px var(--so-primary)"
                        : "none",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "border-color 0.15s ease",
                    }}
                    onClick={() =>
                      setSelectedTargets((prev) => ({
                        ...prev,
                        [target.targetId]: !prev[target.targetId],
                      }))
                    }
                  >
                    {/* Top Header Row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenMarket(target.title);
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: "3px 6px",
                            background: "var(--so-surface-panel)",
                            border: "1px solid var(--so-border-subtle)",
                            borderRadius: "4px",
                            color: "var(--so-text-secondary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Open on DMarket Market (Browser)"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLookupModal(
                              target.title,
                              driftDetails?.acceptedPrice,
                              currentPrice,
                              target.attributes?.image,
                            );
                          }}
                          className="btn btn-sm"
                          style={{
                            padding: "3px 6px",
                            background: "var(--so-surface-panel)",
                            border: "1px solid var(--so-border-subtle)",
                            borderRadius: "4px",
                            color: "var(--so-accent-cyan)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Inspect Multi-Market Prices"
                        >
                          <Eye size={13} />
                        </button>
                        <CopyMarketHashButton name={target.title} />
                      </div>

                      {/* Drift Status Badge */}
                      {driftDetails ? (
                        driftDetails.isOverbid ? (
                          <span
                            className="badge"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              backgroundColor: "rgba(239, 68, 68, 0.18)",
                              color: "#ef4444",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                              fontWeight: 800,
                              fontSize: "9px",
                              padding: "1px 5px",
                            }}
                          >
                            <AlertTriangle size={10} /> OVERBID (
                            {driftDetails.driftPercent > 0
                              ? `+${driftDetails.driftPercent.toFixed(0)}%`
                              : `${driftDetails.driftPercent.toFixed(0)}%`}
                            )
                          </span>
                        ) : driftDetails.isUnderbid ? (
                          <span
                            className="badge"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              backgroundColor: "rgba(245, 158, 11, 0.18)",
                              color: "#f59e0b",
                              border: "1px solid rgba(245, 158, 11, 0.4)",
                              fontWeight: 800,
                              fontSize: "9px",
                              padding: "1px 5px",
                            }}
                          >
                            <AlertTriangle size={10} /> UNDERBID (
                            {driftDetails.driftPercent.toFixed(0)}%)
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              fontWeight: 800,
                              fontSize: "9px",
                              padding: "1px 5px",
                              backgroundColor: "rgba(56, 189, 248, 0.15)",
                              color: "var(--so-accent-cyan)",
                              border: "1px solid rgba(56, 189, 248, 0.35)",
                            }}
                          >
                            <CheckCircle2 size={10} /> SAFE (
                            {driftDetails.driftPercent >= 0
                              ? `+${driftDetails.driftPercent.toFixed(0)}%`
                              : `${driftDetails.driftPercent.toFixed(0)}%`}
                            )
                          </span>
                        )
                      ) : (
                        <span
                          className="badge badge-secondary"
                          style={{ fontSize: "9px", padding: "1px 5px" }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Weapon Image */}
                    <div
                      style={{
                        height: "65px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.25)",
                        borderRadius: "var(--so-radius-sm)",
                        border: "1px solid var(--so-border-subtle)",
                        padding: "4px",
                        backgroundImage:
                          "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={cleanTitle}
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = "0.3";
                        }}
                        style={{
                          maxHeight: "55px",
                          maxWidth: "100%",
                          objectFit: "contain",
                          filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
                        }}
                      />
                    </div>

                    {/* Title & Wear Tags */}
                    <div
                      style={{
                        textAlign: "center",
                        minHeight: "32px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: "11.5px",
                          color: "var(--so-text-primary)",
                          lineHeight: "1.2",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={target.title}
                      >
                        {cleanTitle}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          marginTop: "3px",
                          flexWrap: "wrap",
                        }}
                      >
                        {wearShortcut && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 800,
                              padding: "0 4px",
                              borderRadius: "3px",
                              backgroundColor: "rgba(255, 255, 255, 0.08)",
                              color: "var(--so-text-secondary)",
                            }}
                          >
                            {wearShortcut}
                          </span>
                        )}
                        {isStattrak && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              fontWeight: 800,
                              padding: "0 4px",
                              borderRadius: "3px",
                              backgroundColor: "rgba(249, 115, 22, 0.15)",
                              color: "#fb923c",
                            }}
                          >
                            ST™
                          </span>
                        )}
                        {phase && phase !== "PHASE_TITLE_UNSPECIFIED" && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              padding: "0 4px",
                              borderRadius: "3px",
                              backgroundColor: "rgba(168, 85, 247, 0.15)",
                              color: "#c084fc",
                            }}
                          >
                            {phase.replace("PHASE_TITLE_", "")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 14-Day Trend Sparkline */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <TrendSparkline
                        name={target.title}
                        momentum={driftDetails?.trendMomentum14d}
                        height={30}
                        onClick={() =>
                          onOpenLookupModal(
                            target.title,
                            driftDetails?.acceptedPrice,
                            currentPrice,
                            target.attributes?.image,
                          )
                        }
                      />
                    </div>

                    {/* Pricing Block */}
                    <div
                      style={{
                        backgroundColor: driftDetails?.isOverbid
                          ? "rgba(239, 68, 68, 0.12)"
                          : driftDetails?.isUnderbid
                            ? "rgba(245, 158, 11, 0.12)"
                            : "var(--so-surface-input)",
                        border: `1px solid ${
                          driftDetails?.isOverbid
                            ? "rgba(239, 68, 68, 0.3)"
                            : driftDetails?.isUnderbid
                              ? "rgba(245, 158, 11, 0.3)"
                              : "var(--so-border-subtle)"
                        }`,
                        padding: "6px 8px",
                        borderRadius: "var(--so-radius-sm)",
                        fontSize: "11px",
                      }}
                    >
                      {/* Quantity Stepper */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ color: "var(--so-text-muted)" }}>
                          Quantity
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleQuantityAdjust(target, -1)}
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "3px",
                              border: "1px solid var(--so-border-subtle)",
                              background: "var(--so-surface-panel)",
                              color: "var(--so-text-primary)",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                            }}
                            title="Decrease Quantity"
                          >
                            -
                          </button>
                          <span
                            style={{
                              fontWeight: 800,
                              color: "var(--so-primary)",
                              minWidth: "16px",
                              textAlign: "center",
                              fontSize: "11.5px",
                            }}
                          >
                            {target.amount || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityAdjust(target, 1)}
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "3px",
                              border: "1px solid var(--so-border-subtle)",
                              background: "var(--so-surface-panel)",
                              color: "var(--so-text-primary)",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              lineHeight: 1,
                            }}
                            title="Increase Quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* My Target Price */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ color: "var(--so-text-muted)" }}>
                          Current Bid
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: 800,
                            color: driftDetails?.isOverbid
                              ? "#ef4444"
                              : driftDetails?.isUnderbid
                                ? "#f59e0b"
                                : "#ffffff",
                          }}
                        >
                          ${currentPrice.toFixed(2)}
                        </span>
                      </div>

                      {/* Oracle Accepted Price */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ color: "var(--so-text-muted)" }}>
                          Accepted
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontWeight: 800,
                            color: "var(--so-accent-cyan)",
                          }}
                        >
                          {driftDetails?.acceptedPrice
                            ? `$${driftDetails.acceptedPrice.toFixed(2)}`
                            : "---"}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div
                      style={{ display: "flex", gap: "5px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {driftDetails?.acceptedPrice && (
                        <button
                          onClick={() =>
                            handleQuickUpdateToOracle(
                              target,
                              driftDetails.acceptedPrice,
                            )
                          }
                          disabled={isProcessing}
                          className="btn btn-primary btn-sm"
                          style={{
                            flex: 1,
                            fontWeight: 700,
                            fontSize: "11px",
                            padding: "4px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                          title="Update Target to Oracle Price"
                        >
                          {isProcessing ? (
                            <Loader2 size={11} className="spin" />
                          ) : (
                            <Zap size={11} />
                          )}
                          <span>Update</span>
                        </button>
                      )}
                      <button
                        onClick={() =>
                          onOpenEditModal(
                            target,
                            targetAnalysis[target.targetId],
                          )
                        }
                        disabled={isProcessing}
                        className="btn btn-secondary btn-sm"
                        title="Edit Target Price / Quantity"
                        style={{ padding: "4px 6px" }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteTarget(target.targetId, target.title)
                        }
                        disabled={isProcessing}
                        className="btn btn-danger btn-sm"
                        title="Delete Target"
                        style={{ padding: "4px 6px" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── SUB-TAB: TARGET HISTORY / CLOSED TRADES ─────────────────── */}
      {targetSubTab === "history" && (
        <div
          style={{
            backgroundColor: "var(--so-surface-card)",
            border: "1px solid var(--so-border-medium)",
            borderRadius: "var(--so-radius-md)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid var(--so-border-medium)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: "14px",
                color: "var(--so-text-primary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <History size={16} style={{ color: "var(--so-accent-cyan)" }} />{" "}
              Completed Target Purchases
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchClosedTargets}
              disabled={closedLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11.5px",
              }}
            >
              <RefreshCw size={12} className={closedLoading ? "spin" : ""} />
              <span>Refresh History</span>
            </button>
          </div>

          {closedLoading ? (
            <div
              style={{
                padding: "60px 0",
                textAlign: "center",
                color: "var(--so-text-muted)",
              }}
            >
              <Loader2
                size={32}
                className="spin"
                style={{ margin: "0 auto 12px" }}
              />
              <div>Loading closed targets history...</div>
            </div>
          ) : closedTrades.length === 0 ? (
            <div
              style={{
                padding: "60px 0",
                textAlign: "center",
                color: "var(--so-text-muted)",
              }}
            >
              <History
                size={36}
                style={{ margin: "0 auto 12px", opacity: 0.4 }}
              />
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--so-text-primary)",
                }}
              >
                No completed target trades yet
              </div>
              <div style={{ fontSize: "12px", marginTop: "4px" }}>
                When your buy targets are fulfilled by sellers, they appear
                here.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12.5px",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: "var(--so-surface-sidebar)",
                      borderBottom: "1px solid var(--so-border-medium)",
                      color: "var(--so-text-muted)",
                      fontSize: "11px",
                      textTransform: "uppercase",
                    }}
                  >
                    <th style={{ padding: "10px 14px" }}>Skin Title & Wear</th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "center",
                        width: "70px",
                      }}
                    >
                      Amount
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        width: "130px",
                      }}
                    >
                      Purchased Price
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "center",
                        width: "110px",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        width: "170px",
                      }}
                    >
                      Completed Date
                    </th>
                    <th
                      style={{
                        padding: "10px 14px",
                        textAlign: "right",
                        width: "60px",
                      }}
                    >
                      Market
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.map((trade, idx) => {
                    const title = getTradeTitle(trade);
                    const price = getTradePrice(trade);
                    const amount = getTradeAmount(trade);
                    const dateStr = getTradeDate(trade);
                    const status = trade.status || trade.Status || "FULFILLED";
                    const cleanStatus = String(status)
                      .replace(/^TargetClosedStatus/, "")
                      .toUpperCase();

                    const match = title.match(/^(.+?)\s*\(([^)]+)\)$/);
                    const cleanTitle = match ? match[1] : title;
                    const wearShortcut = getWearShortcut(
                      trade.attributes?.cs2?.exterior ||
                        (match ? match[2] : ""),
                    );
                    const isStattrak = title.includes("StatTrak™");
                    const imageUrl =
                      trade.attributes?.image ||
                      trade.image ||
                      `https://api.steamapis.com/image/item/730/${encodeURIComponent(title)}`;

                    return (
                      <tr
                        key={
                          trade.tradeId ||
                          trade.OfferID ||
                          trade.TargetID ||
                          idx
                        }
                        style={{
                          borderBottom: "1px solid var(--so-border-subtle)",
                        }}
                      >
                        {/* Skin Thumbnail, Title & Wear */}
                        <td style={{ padding: "10px 14px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt={cleanTitle}
                              onError={(e) => {
                                (e.target as HTMLElement).style.opacity = "0.3";
                              }}
                              style={{
                                width: "36px",
                                height: "36px",
                                objectFit: "contain",
                                borderRadius: "4px",
                                backgroundColor: "rgba(0, 0, 0, 0.25)",
                                padding: "2px",
                                border: "1px solid var(--so-border-subtle)",
                              }}
                            />
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: "var(--so-text-primary)",
                                  fontSize: "12.5px",
                                }}
                              >
                                {cleanTitle}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  marginTop: "2px",
                                }}
                              >
                                {wearShortcut && (
                                  <span
                                    style={{
                                      fontSize: "9.5px",
                                      fontWeight: 800,
                                      padding: "0 4px",
                                      borderRadius: "3px",
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.08)",
                                      color: "var(--so-text-secondary)",
                                    }}
                                  >
                                    {wearShortcut}
                                  </span>
                                )}
                                {isStattrak && (
                                  <span
                                    style={{
                                      fontSize: "9.5px",
                                      fontWeight: 800,
                                      padding: "0 4px",
                                      borderRadius: "3px",
                                      backgroundColor:
                                        "rgba(249, 115, 22, 0.15)",
                                      color: "#fb923c",
                                    }}
                                  >
                                    ST™
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          {amount}
                        </td>

                        {/* Purchased Price */}
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            fontWeight: 800,
                            fontSize: "13px",
                            color: "var(--so-accent-cyan)",
                          }}
                        >
                          {price !== "—" ? `$${price}` : "—"}
                        </td>

                        {/* Status */}
                        <td
                          style={{ padding: "10px 14px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              padding: "2px 7px",
                              borderRadius: "10px",
                              backgroundColor: "rgba(56, 189, 248, 0.15)",
                              color: "var(--so-accent-cyan)",
                              border: "1px solid rgba(56, 189, 248, 0.3)",
                            }}
                          >
                            {cleanStatus}
                          </span>
                        </td>

                        {/* Completed Date */}
                        <td
                          style={{
                            padding: "10px 14px",
                            textAlign: "right",
                            color: "var(--so-text-muted)",
                            fontSize: "11.5px",
                          }}
                        >
                          {dateStr}
                        </td>

                        {/* Action link */}
                        <td
                          style={{ padding: "10px 14px", textAlign: "right" }}
                        >
                          <button
                            onClick={() => onOpenMarket(title)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "3px 6px", borderRadius: "4px" }}
                            title="Open on DMarket Market"
                          >
                            <ExternalLink size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL FOR TARGETS ── */}
      {targetSubTab === "active" && selectedCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: isSidebarExpanded ? "258px" : "96px",
            right: "28px",
            zIndex: 1000,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            backgroundColor: "rgba(17, 24, 39, 0.96)",
            backdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "var(--so-radius-md)",
            border: "1px solid var(--so-border-medium)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 16px rgba(37, 99, 235, 0.25)",
            boxSizing: "border-box",
            transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontWeight: 700,
              fontSize: "13px",
            }}
          >
            <span
              style={{
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                color: "var(--so-accent-cyan)",
                border: "1px solid var(--so-primary)",
                padding: "2px 9px",
                borderRadius: "4px",
                fontWeight: 900,
                fontSize: "14px",
              }}
            >
              {selectedCount}
            </span>
            <span>TARGETS SELECTED FOR BATCH OPERATIONS</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleSelectAll}
              className="btn btn-sm btn-ghost"
              style={{
                fontWeight: 700,
                padding: "6px 14px",
                fontSize: "12px",
                color: "#ffffff",
              }}
            >
              Select All ({targets.length})
            </button>

            {actionRequiredCount > 0 && (
              <button
                onClick={handleSelectActionRequired}
                className="btn btn-sm btn-ghost"
                style={{
                  fontWeight: 700,
                  padding: "6px 14px",
                  fontSize: "12px",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                title="Select all targets requiring action"
              >
                <AlertTriangle size={13} /> Action Req ({actionRequiredCount})
              </button>
            )}

            <button
              onClick={clearSelection}
              className="btn btn-sm btn-ghost"
              style={{
                fontWeight: 700,
                padding: "6px 14px",
                fontSize: "12px",
                color: "#ffffff",
              }}
            >
              Clear Selection
            </button>

            <button
              onClick={handleBatchDelete}
              disabled={batchProcessing}
              className="btn btn-danger btn-sm"
              style={{
                fontWeight: 800,
                padding: "6px 14px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ffffff",
              }}
            >
              <Trash2 size={13} />
              <span>Delete Selected</span>
            </button>

            <button
              onClick={handleBatchUpdateToOracle}
              disabled={batchProcessing}
              className="btn btn-primary btn-sm"
              style={{
                fontWeight: 800,
                padding: "6px 18px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ffffff",
              }}
            >
              {batchProcessing ? (
                <>
                  <Loader2 size={13} className="spin" />
                  <span>UPDATING BATCH...</span>
                </>
              ) : (
                <>
                  <Zap size={13} />
                  <span>MATCH ORACLE PRICES</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
