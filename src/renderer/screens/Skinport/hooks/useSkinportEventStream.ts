import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type {
  SkinportStreamEvent,
  SkinportStreamStatus,
} from "../../../../shared/types/skinport.types";
import {
  type SkinportFeedEntry,
} from "../utils/skinportFilters";
import { saleIdentity } from "../utils/skinportUtils";

/**
 * Live Skinport sale feed as a React hook. Entries are keyed by
 * `market hash name` + float so a flood of identical listings collapses into
 * one card with an occurrence count. The feed is capped to bound memory.
 */

const MAX_ENTRIES = 600;

const EMPTY_STATUS: SkinportStreamStatus = {
  connected: false,
  connecting: false,
  eventCount: 0,
  lastEventAt: null,
  error: null,
};

function capEntries(
  entries: Record<string, SkinportFeedEntry>,
): Record<string, SkinportFeedEntry> {
  const values = Object.values(entries);
  if (values.length <= MAX_ENTRIES) return entries;
  values.sort((a, b) => b.receivedAt - a.receivedAt);
  const capped: Record<string, SkinportFeedEntry> = {};
  values.slice(0, MAX_ENTRIES).forEach((e) => {
    capped[e.identity] = e;
  });
  return capped;
}

export function reduceSkinportFeedEvent(
  prev: Record<string, SkinportFeedEntry>,
  event: SkinportStreamEvent,
): Record<string, SkinportFeedEntry> {
  const next = { ...prev };
  (event.sales ?? []).forEach((sale) => {
    if (!sale || !sale.marketHashName) return;
    const identity = saleIdentity(sale);
    const existing = next[identity];
    next[identity] = {
      identity,
      sale,
      eventType: event.eventType,
      receivedAt: event.receivedAt,
      count: existing ? existing.count + 1 : 1,
    };
  });
  return capEntries(next);
}

export function useSkinportEventStream() {
  const [entriesByIdentity, setEntriesByIdentity] = useState<
    Record<string, SkinportFeedEntry>
  >({});
  const [status, setStatus] = useState<SkinportStreamStatus>(EMPTY_STATUS);

  useEffect(() => {
    const api = window.electronAPI?.skinport;
    if (!api?.onStreamEvent) return;

    const offEvent = api.onStreamEvent((event) =>
      setEntriesByIdentity((prev) => reduceSkinportFeedEvent(prev, event)),
    );
    const offStatus = api.onStreamStatus?.((next) => setStatus(next));
    api
      .getStreamStatus?.()
      .then((next) => next && setStatus(next))
      .catch(() => {
        /* status is best-effort */
      });

    return () => {
      offEvent?.();
      offStatus?.();
    };
  }, []);

  const start = useCallback(async () => {
    try {
      const next = await window.electronAPI.skinport.startStream();
      if (next) setStatus(next);
    } catch (err: any) {
      toast.error(`Stream failed: ${err?.message || err}`);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      const next = await window.electronAPI.skinport.stopStream();
      if (next) setStatus(next);
    } catch (err: any) {
      toast.error(`Stream stop failed: ${err?.message || err}`);
    }
  }, []);

  const clear = useCallback(() => setEntriesByIdentity({}), []);

  const entries = useMemo(
    () => Object.values(entriesByIdentity),
    [entriesByIdentity],
  );

  return { entries, status, start, stop, clear };
}
