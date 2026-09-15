import { useState, useEffect, useCallback, useRef } from "react";
import {
  CooldownEntry,
  loadStoredCooldowns,
  saveStoredCooldowns,
  parseCooldownSeconds,
  formatCooldown,
} from "../../../dmarket-utils";

export function useDmarketCooldowns() {
  const [cooldowns, setCooldowns] = useState<Record<string, CooldownEntry>>(() =>
    loadStoredCooldowns(),
  );

  // Keep a ref for stable access inside intervals and callbacks
  const cooldownsRef = useRef(cooldowns);
  cooldownsRef.current = cooldowns;

  // 1-second interval timer that only runs while there are active unexpired cooldowns
  useEffect(() => {
    const hasActive = Object.values(cooldowns).some(
      (entry) => entry.expiresAt > Date.now(),
    );
    if (!hasActive) return;

    const timer = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const next: Record<string, CooldownEntry> = {};

      Object.entries(cooldownsRef.current).forEach(([key, val]) => {
        if (val.expiresAt > now) {
          next[key] = val;
        } else {
          changed = true; // expired
        }
      });

      if (changed) {
        setCooldowns(next);
        saveStoredCooldowns(next);
      } else {
        // Trigger a light state update to re-render ticking formatted countdown strings
        setCooldowns({ ...next });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldowns]);

  // Record a cooldown for a single identifier (offerId or assetId)
  const recordCooldown = useCallback(
    (id: string, seconds: number, meta?: Partial<CooldownEntry>) => {
      if (!id || seconds <= 0) return;
      const expiresAt = Date.now() + seconds * 1000;
      const entry: CooldownEntry = {
        offerId: id,
        expiresAt,
        durationSeconds: seconds,
        reason: meta?.reason || "AssetTimeLocked",
        code: meta?.code || "AssetTimeLocked",
        ...meta,
      };

      setCooldowns((prev) => {
        const next = { ...prev, [id]: entry };
        // If assetId is also known and differs from offerId, key by assetId too
        if (entry.assetId && entry.assetId !== id) {
          next[entry.assetId] = entry;
        }
        saveStoredCooldowns(next);
        return next;
      });
    },
    [],
  );

  // Record cooldowns in bulk from DMarket API failure objects
  // e.g. [{ offerId: "...", code: "AssetTimeLocked", message: "10:48" }]
  const recordCooldownsFromFailures = useCallback(
    (failedItems: any[]): number => {
      if (!Array.isArray(failedItems) || failedItems.length === 0) return 0;
      const now = Date.now();
      let recordedCount = 0;

      setCooldowns((prev) => {
        const next = { ...prev };
        failedItems.forEach((fail) => {
          const code = String(fail?.code || fail?.error || "");
          const msg = String(fail?.message || fail?.error_description || "");
          const isTimeLocked =
            code === "AssetTimeLocked" ||
            /timelock/i.test(code) ||
            /time limit/i.test(msg) ||
            /after the time limit/i.test(msg) ||
            /cooldown/i.test(msg);

          if (isTimeLocked) {
            const targetId = fail.offerId || fail.id || fail.assetId;
            if (targetId) {
              const seconds = parseCooldownSeconds(msg, 600); // default 10m if parsing fails
              const expiresAt = now + seconds * 1000;
              const entry: CooldownEntry = {
                offerId: targetId,
                assetId: fail.assetId,
                expiresAt,
                durationSeconds: seconds,
                reason: msg,
                code: code || "AssetTimeLocked",
              };
              next[targetId] = entry;
              if (fail.assetId && fail.assetId !== targetId) {
                next[fail.assetId] = entry;
              }
              recordedCount++;
            }
          }
        });

        if (recordedCount > 0) {
          saveStoredCooldowns(next);
          return next;
        }
        return prev;
      });

      return recordedCount;
    },
    [],
  );

  // Check if an offer or item is currently time-locked
  const isItemLocked = useCallback(
    (target: string | { id?: string; offerId?: string; assetId?: string }): boolean => {
      if (!target) return false;
      const now = Date.now();
      if (typeof target === "string") {
        const entry = cooldowns[target];
        return Boolean(entry && entry.expiresAt > now);
      }
      const ids = [target.offerId, target.id, target.assetId].filter(
        Boolean,
      ) as string[];
      return ids.some((id) => {
        const entry = cooldowns[id];
        return Boolean(entry && entry.expiresAt > now);
      });
    },
    [cooldowns],
  );

  // Get active remaining seconds and formatted string (e.g. "10:48") for an offer/item
  const getItemCooldown = useCallback(
    (
      target: string | { id?: string; offerId?: string; assetId?: string },
    ): { remainingSeconds: number; formatted: string } | null => {
      if (!target) return null;
      const now = Date.now();
      let match: CooldownEntry | undefined;

      if (typeof target === "string") {
        match = cooldowns[target];
      } else {
        const ids = [target.offerId, target.id, target.assetId].filter(
          Boolean,
        ) as string[];
        for (const id of ids) {
          if (cooldowns[id]) {
            match = cooldowns[id];
            break;
          }
        }
      }

      if (!match || match.expiresAt <= now) return null;

      const remainingSeconds = Math.max(
        0,
        Math.ceil((match.expiresAt - now) / 1000),
      );
      if (remainingSeconds <= 0) return null;

      return {
        remainingSeconds,
        formatted: formatCooldown(remainingSeconds),
      };
    },
    [cooldowns],
  );

  // Clear cooldown manually if needed
  const clearCooldown = useCallback((id: string) => {
    setCooldowns((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      saveStoredCooldowns(next);
      return next;
    });
  }, []);

  return {
    cooldowns,
    isItemLocked,
    getItemCooldown,
    recordCooldown,
    recordCooldownsFromFailures,
    clearCooldown,
  };
}
