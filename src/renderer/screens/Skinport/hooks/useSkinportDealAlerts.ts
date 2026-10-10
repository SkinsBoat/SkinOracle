import { useEffect, useRef } from "react";
import { notificationManager } from "../../../services/notificationManager";
import { useNotificationStore } from "../../../store/useNotificationStore";

// ─────────────────────────────────────────────────────────────────
// Skinport deal alerts
//
// Fires a single, human-friendly alert when a listing is at or below the
// Oracle Buy Ceiling (a genuine "deal"). It is deliberately conservative to
// avoid alert spam:
//   • one alert per item identity per session (dedup across tab remounts),
//   • bursts are batched and summarised (e.g. "7 New Target Matches"),
//   • a minimum gap throttles rapid successive alerts,
//   • respects the global sound / desktop / cooldown settings.
// ─────────────────────────────────────────────────────────────────

export interface SkinportDealAlert {
  /** Stable identity (market hash name, or name+float for the live feed). */
  key: string;
  name: string;
  priceUsd: number;
  ceilingUsd: number;
}

/**
 * Whether a listing should raise a deal alert.
 * Strict rule: a genuine deal is `price <= ceiling` (accepted price / Buy Ceiling).
 */
export function isAlertEligible(
  priceCents: number | null,
  ceilingCents: number | null | undefined,
): boolean {
  if (priceCents === null || ceilingCents === undefined || ceilingCents <= 0) {
    return false;
  }
  return priceCents <= ceilingCents;
}

/** Wait this long for more deals before summarising a burst. */
const BATCH_MS = 1200;
/** Never fire two alerts closer together than this. */
const MIN_GAP_MS = 3000;
/** Upper bound on remembered identities so long sessions stay bounded. */
const MAX_TRACKED_KEYS = 8000;

// Module-level so the dedup survives tab switches/remounts (per session).
const alertedKeys = new Set<string>();
let lastAlertAt = 0;

/** Returns deals not yet alerted, remembering them so they never repeat. */
export function pickNovelDeals(
  deals: SkinportDealAlert[],
  seen: Set<string> = alertedKeys,
): SkinportDealAlert[] {
  const novel: SkinportDealAlert[] = [];
  for (const deal of deals) {
    if (!deal || !deal.key) continue;
    if (seen.has(deal.key)) continue;
    seen.add(deal.key);
    novel.push(deal);
  }
  if (seen.size > MAX_TRACKED_KEYS) {
    const drop = seen.size - MAX_TRACKED_KEYS / 2;
    let removed = 0;
    for (const key of seen) {
      seen.delete(key);
      if (++removed >= drop) break;
    }
  }
  return novel;
}

/** Picks the deepest deal (lowest price relative to its ceiling) and labels the batch. */
export function buildDealAlertMessage(batch: SkinportDealAlert[]): {
  title: string;
  body: string;
} {
  const ratio = (d: SkinportDealAlert) =>
    d.priceUsd / Math.max(d.ceilingUsd, 0.0001);
  const best = batch.reduce((a, b) => (ratio(b) < ratio(a) ? b : a));
  if (batch.length === 1) {
    return {
      title: "Target Match Detected",
      body: `${best.name} — $${best.priceUsd.toFixed(2)} ≤ $${best.ceilingUsd.toFixed(2)}`,
    };
  }
  return {
    title: `${batch.length} New Target Matches`,
    body: `${best.name} and ${batch.length - 1} more at or below your Buy Ceilings`,
  };
}

export function resetSkinportDealAlerts(): void {
  alertedKeys.clear();
  lastAlertAt = 0;
}

export function useSkinportDealAlerts(
  deals: SkinportDealAlert[],
  enabled = true,
): void {
  const notifyOnNewDeals = useNotificationStore((s) => s.notifyOnNewDeals);
  const dealSoundCooldownSeconds = useNotificationStore(
    (s) => s.dealSoundCooldownSeconds,
  );

  const active = enabled && notifyOnNewDeals;
  const pendingRef = useRef<SkinportDealAlert[]>([]);
  const timerRef = useRef<number | null>(null);
  const cooldownRef = useRef(dealSoundCooldownSeconds);
  cooldownRef.current = dealSoundCooldownSeconds;

  useEffect(() => {
    if (!active) return;

    const novel = pickNovelDeals(deals, alertedKeys);
    if (novel.length === 0) return;

    pendingRef.current.push(...novel);
    if (timerRef.current !== null) return;

    const since = Date.now() - lastAlertAt;
    const delay = Math.max(BATCH_MS, MIN_GAP_MS - since);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      lastAlertAt = Date.now();
      const batch = pendingRef.current;
      pendingRef.current = [];
      if (batch.length === 0) return;

      const { title, body } = buildDealAlertMessage(batch);
      notificationManager.triggerAlert({
        title,
        body,
        cooldownMs: Math.max(cooldownRef.current * 1000, 1000),
        playSound: true,
        showToast: true,
        showOSNotification: true,
      });
    }, delay);
  }, [deals, active]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [],
  );
}
