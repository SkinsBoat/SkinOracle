import React, { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { Loader2, Target } from "lucide-react";
import { DmarketTargetItem, AcceptedPriceInfo } from "../../../../../shared/types";
import { TargetAnalysis } from "../../dmarket-utils";
import {
  getPersistedThreshold,
  setPersistedThreshold,
} from "../../../../utils/storage";
import {
  TargetTabProps,
  FilterAction,
  calculateTargetDrift,
  isAdvancedTarget,
  getTargetHoldInfo,
} from "./types";
import { TargetToolbar } from "./components/TargetToolbar";
import { TargetCard } from "./components/TargetCard";
import { TargetHistoryView } from "./components/TargetHistoryView";
import { TargetBatchBar } from "./components/TargetBatchBar";

export type { TargetTabProps };

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
  driftThresholdPercent: propDriftThresholdPercent,
  setDriftThresholdPercent: propSetDriftThresholdPercent,
  onRegisterLoadOracle,
  onAcceptedPricesLoaded,
}) => {
  const [targetSubTab, setTargetSubTab] = useState<"active" | "history">(
    "active",
  );
  const [internalDriftThresholdPercent, setInternalDriftThresholdPercent] =
    useState<number>(() =>
      getPersistedThreshold(
        "dmarket_drift_threshold_percent",
        "workstation_buyorders_drift_threshold",
        2,
      ),
    );

  const driftThresholdPercent =
    propDriftThresholdPercent !== undefined
      ? propDriftThresholdPercent
      : internalDriftThresholdPercent;

  const setDriftThresholdPercent =
    propSetDriftThresholdPercent || setInternalDriftThresholdPercent;

  useEffect(() => {
    if (propSetDriftThresholdPercent === undefined) {
      setPersistedThreshold(
        "dmarket_drift_threshold_percent",
        internalDriftThresholdPercent,
        "workstation_buyorders_drift_threshold",
      );
    }
  }, [internalDriftThresholdPercent, propSetDriftThresholdPercent]);

  const [showExtraOptions, setShowExtraOptions] = useState(false);
  const [filterAction, setFilterAction] = useState<FilterAction>("all");

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
  const [deleteUnmatched, setDeleteUnmatched] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Live timer tick for target hold countdowns
  const [, setHoldTick] = useState(0);
  useEffect(() => {
    const hasAnyHold = targets.some((t) => getTargetHoldInfo(t).isHoldActive);
    if (!hasAnyHold) return;

    const interval = setInterval(() => {
      setHoldTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [targets]);

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
      toast.error(`Failed to load target history: ${err.message}`, {
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
          "No accepted prices found in memory. Please calculate accepted prices in Oracle Dashboard first.",
          { id: toastId },
        );
        setLoadingPrices(false);
        return;
      }

      const meta = {
        itemCount: result.itemCount,
        storedAt: result.storedAt,
      };
      setAcceptedPricesMeta(meta);
      onAcceptedPricesLoaded?.(meta);

      const newAnalysis: Record<string, TargetAnalysis> = {};
      targets.forEach((target) => {
        const title = target.title;
        const priceEntry = result.map[title];
        if (!priceEntry) return;

        const currentPriceDollar = parseFloat(target.priceCents) / 100;
        const acceptedDollar = parseFloat(priceEntry.acceptedPrice.toFixed(2));

        newAnalysis[target.targetId] = {
          acceptedPrice: acceptedDollar,
          supplyStabilityScore: priceEntry.supplyStabilityScore,
          isHyperStable: priceEntry.isHyperStable,
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

  useEffect(() => {
    onRegisterLoadOracle?.(loadAcceptedPrices);
  }, [loadAcceptedPrices, onRegisterLoadOracle]);

  const getDrift = (target: DmarketTargetItem) =>
    calculateTargetDrift(
      target,
      targetAnalysis[target.targetId],
      driftThresholdPercent,
    );

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
    if (isAdvancedTarget(target)) {
      toast.error(
        `Cannot update "${target.title}": Advanced targets with custom attributes cannot be modified`,
      );
      return;
    }

    const holdInfo = getTargetHoldInfo(target);
    if (holdInfo.isHoldActive) {
      toast.error(
        `Cannot update "${target.title}": 11-min hold active (${holdInfo.formattedRemaining} remaining)`,
      );
      return;
    }

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
      const nowIso = res?.updatedAt || new Date().toISOString();
      const nowMs = Date.now();

      setTargets((prev) =>
        prev.map((t) =>
          t.targetId === target.targetId
            ? {
                ...t,
                targetId: newTargetId,
                priceCents: updatedPriceCents,
                updatedAt: nowIso,
                updatedAtMs: nowMs,
                isHoldActive: true,
                holdExpiresAt: nowMs + 660 * 1000,
                holdRemainingSeconds: 660,
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
    if (isAdvancedTarget(target)) {
      toast.error(
        `Cannot adjust quantity on "${target.title}": Advanced target has custom attributes`,
      );
      return;
    }

    const holdInfo = getTargetHoldInfo(target);
    if (holdInfo.isHoldActive) {
      toast.error(
        `Cannot adjust quantity on "${target.title}": 11-min hold active (${holdInfo.formattedRemaining} remaining)`,
      );
      return;
    }

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
      const newTargetId = res?.newTargetId || target.targetId;
      const nowIso = res?.updatedAt || new Date().toISOString();
      const nowMs = Date.now();
      setTargets((prev) =>
        prev.map((t) =>
          t.targetId === target.targetId
            ? {
                ...t,
                targetId: newTargetId,
                updatedAt: nowIso,
                updatedAtMs: nowMs,
                isHoldActive: true,
                holdExpiresAt: nowMs + 660 * 1000,
                holdRemainingSeconds: 660,
              }
            : t,
        ),
      );
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

    const advancedSelectedCount = targets.filter(
      (t) => selectedTargets[t.targetId] && isAdvancedTarget(t),
    ).length;

    const onHoldSelectedCount = targets.filter(
      (t) => selectedTargets[t.targetId] && getTargetHoldInfo(t).isHoldActive,
    ).length;

    const eligibleTargets = targets.filter((t) => {
      if (!selectedTargets[t.targetId]) return false;
      if (isAdvancedTarget(t)) return false;
      if (getTargetHoldInfo(t).isHoldActive) return false;
      const analysis = targetAnalysis[t.targetId];
      return !!analysis?.acceptedPrice;
    });

    const unmatchedTargets = targets.filter((t) => {
      if (!selectedTargets[t.targetId]) return false;
      if (isAdvancedTarget(t)) return false;
      if (getTargetHoldInfo(t).isHoldActive) return false;
      const analysis = targetAnalysis[t.targetId];
      return !analysis?.acceptedPrice;
    });

    if (
      eligibleTargets.length === 0 &&
      (!deleteUnmatched || unmatchedTargets.length === 0)
    ) {
      if (advancedSelectedCount > 0) {
        toast.error(
          "Selected target(s) are advanced targets with custom attributes and cannot be updated",
        );
      } else if (onHoldSelectedCount > 0) {
        toast.error(
          `Selected target(s) are currently under 11-minute hold and cannot be updated yet`,
        );
      } else {
        toast.error(
          "None of the selected targets have a matching Oracle accepted price. Toggle 'Delete unmatched' or use 'Delete Selected'.",
        );
      }
      return;
    }

    if (advancedSelectedCount > 0) {
      toast(
        `Skipping ${advancedSelectedCount} advanced target(s) with custom attributes`,
        { icon: "ℹ️" },
      );
    }

    if (onHoldSelectedCount > 0) {
      toast(
        `Skipping ${onHoldSelectedCount} target(s) currently under 11-minute hold`,
        { icon: "⏳" },
      );
    }

    setBatchProcessing(true);
    let successCount = 0;
    let failCount = 0;
    let deletedCount = 0;
    const errors: string[] = [];
    const processedTitles = new Set<string>();

    const totalOperations =
      eligibleTargets.length + (deleteUnmatched ? unmatchedTargets.length : 0);
    const toastId = toast.loading(`Processing 0/${totalOperations} targets...`);

    // 1. Update priced targets
    for (let i = 0; i < eligibleTargets.length; i++) {
      const target = eligibleTargets[i];
      if (isAdvancedTarget(target) || getTargetHoldInfo(target).isHoldActive) {
        continue;
      }
      if (processedTitles.has(target.title)) {
        continue;
      }
      processedTitles.add(target.title);

      const analysis = targetAnalysis[target.targetId];
      const targetPrice = analysis.acceptedPrice;
      const targetQty = parseInt(target.amount, 10) || 1;

      toast.loading(
        `[${i + 1}/${totalOperations}] Updating: ${target.title}...`,
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
        const nowIso = res?.updatedAt || new Date().toISOString();
        const nowMs = Date.now();

        setTargets((prev) =>
          prev.map((t) =>
            t.targetId === target.targetId
              ? {
                  ...t,
                  targetId: newTargetId,
                  priceCents: updatedPriceCents,
                  updatedAt: nowIso,
                  updatedAtMs: nowMs,
                  isHoldActive: true,
                  holdExpiresAt: nowMs + 660 * 1000,
                  holdRemainingSeconds: 660,
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

      if (
        i < eligibleTargets.length - 1 ||
        (deleteUnmatched && unmatchedTargets.length > 0)
      ) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // 2. Delete unmatched targets if option checked
    if (deleteUnmatched && unmatchedTargets.length > 0) {
      const unmatchedIds = unmatchedTargets.map((t) => t.targetId);
      toast.loading(
        `Deleting ${unmatchedIds.length} unmatched target(s)...`,
        { id: toastId },
      );

      if (window.electronAPI?.dmarket?.batchDeleteTargets) {
        try {
          const res = await window.electronAPI.dmarket.batchDeleteTargets(unmatchedIds);
          const results = res?.Result || [];
          const failedIds = new Set(
            results.filter((r) => !r.Successful).map((r) => r.TargetID),
          );
          const successfullyDeletedIds = unmatchedIds.filter((id) => !failedIds.has(id));
          deletedCount += successfullyDeletedIds.length;
          setTargets((prev) =>
            prev.filter((t) => !successfullyDeletedIds.includes(t.targetId)),
          );
          if (failedIds.size > 0) {
            failCount += failedIds.size;
            errors.push(`Failed to delete ${failedIds.size} unmatched targets`);
          }
        } catch (err: any) {
          console.error("Batch delete API failed, falling back to sequential:", err);
          for (let j = 0; j < unmatchedTargets.length; j++) {
            const target = unmatchedTargets[j];
            try {
              await window.electronAPI.dmarket.deleteTarget(target.targetId);
              setTargets((prev) =>
                prev.filter((t) => t.targetId !== target.targetId),
              );
              deletedCount++;
            } catch (delErr: any) {
              failCount++;
              errors.push(`Delete ${target.title}: ${delErr?.message || "Failed"}`);
            }
            if (j < unmatchedTargets.length - 1) {
              await new Promise((r) => setTimeout(r, 600));
            }
          }
        }
      } else {
        for (let j = 0; j < unmatchedTargets.length; j++) {
          const target = unmatchedTargets[j];
          try {
            await window.electronAPI.dmarket.deleteTarget(target.targetId);
            setTargets((prev) =>
              prev.filter((t) => t.targetId !== target.targetId),
            );
            deletedCount++;
          } catch (delErr: any) {
            failCount++;
            errors.push(`Delete ${target.title}: ${delErr?.message || "Failed"}`);
          }
          if (j < unmatchedTargets.length - 1) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }
    }

    setBatchProcessing(false);
    setSelectedTargets({});
    await onUserDataUpdated();

    let resultMsg = "";
    if (successCount > 0) {
      resultMsg = `Batch complete: ${successCount} updated`;
      if (deletedCount > 0) resultMsg += `, ${deletedCount} unmatched deleted`;
    } else if (deletedCount > 0) {
      resultMsg = `Batch complete: ${deletedCount} unmatched deleted`;
    } else {
      resultMsg = "Batch complete: 0 items updated";
    }
    if (failCount > 0) resultMsg += `, ${failCount} failed`;

    if (failCount === 0) {
      toast.success(resultMsg, { id: toastId });
    } else {
      toast.error(`${resultMsg}. ${errors[0] || ""}`, {
        id: toastId,
        duration: 8000,
      });
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
      `Deleting ${selectedIds.length} target(s)...`,
    );

    if (window.electronAPI?.dmarket?.batchDeleteTargets) {
      try {
        const res = await window.electronAPI.dmarket.batchDeleteTargets(selectedIds);
        const results = res?.Result || [];
        const failedIds = new Set(
          results.filter((r) => !r.Successful).map((r) => r.TargetID),
        );
        const successfullyDeletedIds = selectedIds.filter((id) => !failedIds.has(id));
        successCount = successfullyDeletedIds.length;
        setTargets((prev) =>
          prev.filter((t) => !successfullyDeletedIds.includes(t.targetId)),
        );

        if (failedIds.size > 0) {
          failCount = failedIds.size;
          deleteErrors.push(`Failed to delete ${failedIds.size} target(s)`);
        }
      } catch (err: any) {
        console.error("Batch delete API failed, falling back to sequential delete:", err);
        for (let i = 0; i < selectedIds.length; i++) {
          const targetId = selectedIds[i];
          try {
            await window.electronAPI.dmarket.deleteTarget(targetId);
            setTargets((prev) => prev.filter((t) => t.targetId !== targetId));
            successCount++;
          } catch (e: any) {
            failCount++;
            deleteErrors.push(e?.message || "Delete failed");
          }
          if (i < selectedIds.length - 1) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }
      }
    } else {
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
        if (i < selectedIds.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
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
        const driftDetails = getDrift(target);
        if (filterAction === "action_required") {
          if (!driftDetails || !driftDetails.isActionRequired) return false;
        } else if (filterAction === "overbid") {
          if (!driftDetails || !driftDetails.isOverbid) return false;
        } else if (filterAction === "underbid") {
          if (!driftDetails || !driftDetails.isUnderbid) return false;
        } else if (filterAction === "safe") {
          if (!driftDetails || driftDetails.isActionRequired) return false;
        } else if (filterAction === "hold") {
          if (!getTargetHoldInfo(target).isHoldActive) return false;
        }
      }
      return true;
    });
  }, [targets, filterAction, targetAnalysis, driftThresholdPercent]);

  const holdCount = useMemo(() => {
    return targets.filter((t) => getTargetHoldInfo(t).isHoldActive).length;
  }, [targets]);

  const matchedCount = useMemo(() => {
    return targets.filter((t) => !!targetAnalysis[t.targetId]?.acceptedPrice)
      .length;
  }, [targets, targetAnalysis]);

  const actionRequiredTargets = useMemo(() => {
    return targets.filter((t) => {
      if (isAdvancedTarget(t)) return false;
      const d = getDrift(t);
      const isUnmatched =
        matchedCount > 0 && !targetAnalysis[t.targetId]?.acceptedPrice;
      return d?.isActionRequired || isUnmatched;
    });
  }, [targets, targetAnalysis, driftThresholdPercent, matchedCount]);

  const actionRequiredCount = actionRequiredTargets.length;

  const unmatchedSelectedCount = useMemo(() => {
    return targets.filter(
      (t) =>
        selectedTargets[t.targetId] &&
        !isAdvancedTarget(t) &&
        !targetAnalysis[t.targetId]?.acceptedPrice,
    ).length;
  }, [targets, selectedTargets, targetAnalysis]);

  const eligibleSelectedCount = useMemo(() => {
    return targets.filter(
      (t) =>
        selectedTargets[t.targetId] &&
        !isAdvancedTarget(t) &&
        !getTargetHoldInfo(t).isHoldActive &&
        !!targetAnalysis[t.targetId]?.acceptedPrice,
    ).length;
  }, [targets, selectedTargets, targetAnalysis]);

  const isAllActionRequiredSelected =
    actionRequiredCount > 0 &&
    actionRequiredTargets.every((t) => !!selectedTargets[t.targetId]);

  const selectableFilteredTargets = useMemo(() => {
    return filteredTargets.filter((t) => !isAdvancedTarget(t));
  }, [filteredTargets]);

  const selectableFilteredCount = selectableFilteredTargets.length;

  const isAllFilteredSelected =
    selectableFilteredCount > 0 &&
    selectableFilteredTargets.every((t) => !!selectedTargets[t.targetId]);

  const handleToggleSelectFiltered = () => {
    const next = { ...selectedTargets };
    if (isAllFilteredSelected) {
      selectableFilteredTargets.forEach((t) => {
        delete next[t.targetId];
      });
    } else {
      selectableFilteredTargets.forEach((t) => {
        next[t.targetId] = true;
      });
    }
    setSelectedTargets(next);
  };

  const handleSetFilterAction = (newFilter: FilterAction) => {
    if (newFilter !== filterAction) {
      setSelectedTargets({});
      setFilterAction(newFilter);
    }
  };

  const handleToggleSelectActionRequired = () => {
    const next = { ...selectedTargets };
    if (isAllActionRequiredSelected) {
      actionRequiredTargets.forEach((t) => {
        delete next[t.targetId];
      });
    } else {
      actionRequiredTargets.forEach((t) => {
        next[t.targetId] = true;
      });
    }
    setSelectedTargets(next);
  };

  const handleSelectAll = () => {
    const next: Record<string, boolean> = {};
    targets.forEach((t) => {
      if (!isAdvancedTarget(t)) {
        next[t.targetId] = true;
      }
    });
    setSelectedTargets(next);
  };

  const handleToggleSelectTarget = (targetId: string) => {
    const target = targets.find((t) => t.targetId === targetId);
    if (target && isAdvancedTarget(target)) {
      toast.error("Advanced targets with custom attributes cannot be batch updated", {
        id: "adv-target-select",
      });
      return;
    }
    setSelectedTargets((prev) => ({
      ...prev,
      [targetId]: !prev[targetId],
    }));
  };

  const selectedCount = Object.values(selectedTargets).filter(Boolean).length;
  const isOnlyUnmatchedSelected =
    selectedCount > 0 &&
    eligibleSelectedCount === 0 &&
    unmatchedSelectedCount > 0;

  return (
    <>
      <TargetToolbar
        targetSubTab={targetSubTab}
        setTargetSubTab={setTargetSubTab}
        targetsCount={targets.length}
        matchedCount={matchedCount}
        actionRequiredCount={actionRequiredCount}
        selectableFilteredCount={selectableFilteredCount}
        isAllFilteredSelected={isAllFilteredSelected}
        onToggleSelectFiltered={handleToggleSelectFiltered}
        holdCount={holdCount}
        showExtraOptions={showExtraOptions}
        setShowExtraOptions={setShowExtraOptions}
        driftThresholdPercent={driftThresholdPercent}
        setDriftThresholdPercent={setDriftThresholdPercent}
        filterAction={filterAction}
        setFilterAction={handleSetFilterAction}
        onSyncTargets={fetchTargets}
        loadingTargets={loading}
        onLoadAcceptedPrices={loadAcceptedPrices}
        loadingPrices={loadingPrices}
        hasAcceptedPricesMeta={!!acceptedPricesMeta}
      />

      {/* ── SUB-TAB: ACTIVE TARGETS (CARDS GRID) ─────────────────────── */}
      {targetSubTab === "active" && (
        <>
          {loading ? (
            <div style={styles.loadingWrapper}>
              <Loader2 size={32} className="spin" style={styles.loadingSpinner} />
              <div>Loading active targets from DMarket...</div>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="card" style={styles.emptyCard}>
              <Target size={38} style={styles.emptyIcon} />
              <div style={styles.emptyTitle}>No targets found</div>
              <div style={styles.emptySubtitle}>
                {filterAction !== "all"
                  ? 'Try switching filter back to "All"'
                  : "No active buy targets found on your DMarket account"}
              </div>
            </div>
          ) : (
            <div style={getCardsGridStyle(selectedCount > 0)}>
              {filteredTargets.map((target) => (
                <TargetCard
                  key={target.targetId}
                  target={target}
                  analysis={targetAnalysis[target.targetId]}
                  driftDetails={getDrift(target)}
                  isSelected={!!selectedTargets[target.targetId]}
                  isProcessing={processingId === target.targetId}
                  onToggleSelect={handleToggleSelectTarget}
                  onOpenMarket={onOpenMarket}
                  onOpenLookupModal={onOpenLookupModal}
                  onOpenEditModal={onOpenEditModal}
                  onQuantityAdjust={handleQuantityAdjust}
                  onQuickUpdateToOracle={handleQuickUpdateToOracle}
                  onDeleteTarget={handleDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SUB-TAB: TARGET HISTORY / CLOSED TRADES ─────────────────── */}
      {targetSubTab === "history" && (
        <TargetHistoryView
          closedTrades={closedTrades}
          closedLoading={closedLoading}
          onFetchClosedTargets={fetchClosedTargets}
          onOpenMarket={onOpenMarket}
        />
      )}

      {/* ── FLOATING BATCH ACTIONS PANEL FOR TARGETS ── */}
      {targetSubTab === "active" && selectedCount > 0 && (
        <TargetBatchBar
          selectedCount={selectedCount}
          totalTargetsCount={targets.filter((t) => !isAdvancedTarget(t)).length}
          actionRequiredCount={actionRequiredCount}
          isAllActionRequiredSelected={isAllActionRequiredSelected}
          unmatchedSelectedCount={unmatchedSelectedCount}
          eligibleSelectedCount={eligibleSelectedCount}
          isOnlyUnmatchedSelected={isOnlyUnmatchedSelected}
          deleteUnmatched={deleteUnmatched}
          setDeleteUnmatched={setDeleteUnmatched}
          batchProcessing={batchProcessing}
          isSidebarExpanded={isSidebarExpanded}
          onSelectAll={handleSelectAll}
          onToggleSelectActionRequired={handleToggleSelectActionRequired}
          onClearSelection={clearSelection}
          onBatchDelete={handleBatchDelete}
          onBatchUpdateToOracle={handleBatchUpdateToOracle}
        />
      )}
    </>
  );
};

// ── EXTRACTED STYLES & DYNAMIC STYLE HELPERS ─────────────────────────

const getCardsGridStyle = (hasSelectedTargets: boolean): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "10px",
  paddingBottom: hasSelectedTargets ? "75px" : "12px",
});

const styles = {
  loadingWrapper: {
    padding: "60px 0",
    textAlign: "center",
    color: "var(--so-text-muted)",
  } as React.CSSProperties,

  loadingSpinner: {
    margin: "0 auto 12px",
  } as React.CSSProperties,

  emptyCard: {
    textAlign: "center",
    padding: "50px 20px",
    color: "var(--so-text-muted)",
    backgroundColor: "var(--so-surface-card)",
    border: "1px solid var(--so-border-medium)",
    borderRadius: "var(--so-radius-md)",
  } as React.CSSProperties,

  emptyIcon: {
    margin: "0 auto 12px",
    opacity: 0.4,
  } as React.CSSProperties,

  emptyTitle: {
    fontSize: "15px",
    fontWeight: 700,
    color: "var(--so-text-primary)",
  } as React.CSSProperties,

  emptySubtitle: {
    fontSize: "12.5px",
    marginTop: "4px",
  } as React.CSSProperties,
};
