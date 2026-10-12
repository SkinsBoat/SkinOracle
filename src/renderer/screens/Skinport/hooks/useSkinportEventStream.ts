import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
/** Ring buffer length for velocity telemetry (last N socket pushes). */
const MAX_PUSH_SAMPLES = 60;
/** Upper bound on queued events while the feed is frozen. */
const MAX_FROZEN_EVENTS = 1000;

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

/**
 * Merge events buffered while the feed was frozen into the visible entries.
 * Deduplication semantics are identical to the live reducer, so freezing only
 * delays the layout change — it never loses or double-counts a match.
 */
export function flushFrozenEvents(
  prev: Record<string, SkinportFeedEntry>,
  buffer: SkinportStreamEvent[],
): Record<string, SkinportFeedEntry> {
  return buffer.reduce(
    (acc, event) => reduceSkinportFeedEvent(acc, event),
    prev,
  );
}

export function useSkinportEventStream() {
  const [entriesByIdentity, setEntriesByIdentity] = useState<
    Record<string, SkinportFeedEntry>
  >({});
  const [status, setStatus] = useState<SkinportStreamStatus>(EMPTY_STATUS);
  const [pushTimestamps, setPushTimestamps] = useState<number[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenCount, setFrozenCount] = useState(0);

  // Refs mirror the frozen flag and buffer so the socket listener (registered
  // once) can read the live value without re-subscribing.
  const frozenRef = useRef(false);
  const frozenBufferRef = useRef<SkinportStreamEvent[]>([]);

  useEffect(() => {
    frozenRef.current = isFrozen;
  }, [isFrozen]);

  useEffect(() => {
    const api = window.electronAPI?.skinport;
    if (!api?.onStreamEvent) return;

    const offEvent = api.onStreamEvent((event) => {
      // Velocity tracks socket health regardless of freeze state.
      setPushTimestamps((prev) => {
        const next = [...prev, event.receivedAt];
        return next.length > MAX_PUSH_SAMPLES
          ? next.slice(next.length - MAX_PUSH_SAMPLES)
          : next;
      });

      if (frozenRef.current) {
        const buf = frozenBufferRef.current;
        buf.push(event);
        if (buf.length > MAX_FROZEN_EVENTS) {
          buf.splice(0, buf.length - MAX_FROZEN_EVENTS);
        }
        setFrozenCount(buf.length);
        return;
      }

      setEntriesByIdentity((prev) => reduceSkinportFeedEvent(prev, event));
    });
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

  const clear = useCallback(() => {
    setEntriesByIdentity({});
    setPushTimestamps([]);
    frozenBufferRef.current = [];
    setFrozenCount(0);
  }, []);

  /** Drain any buffered frozen events into the visible entries. */
  const flushFrozen = useCallback(() => {
    const buffer = frozenBufferRef.current;
    if (buffer.length > 0) {
      setEntriesByIdentity((prev) => flushFrozenEvents(prev, buffer));
    }
    frozenBufferRef.current = [];
    setFrozenCount(0);
  }, []);

  const setFrozen = useCallback(
    (frozen: boolean) => {
      if (!frozen) flushFrozen();
      frozenRef.current = frozen;
      setIsFrozen(frozen);
    },
    [flushFrozen],
  );

  const toggleFreeze = useCallback(
    () => setFrozen(!frozenRef.current),
    [setFrozen],
  );

  const entries = useMemo(
    () => Object.values(entriesByIdentity),
    [entriesByIdentity],
  );

  return {
    entries,
    status,
    pushTimestamps,
    isFrozen,
    frozenCount,
    toggleFreeze,
    setFrozen,
    flushFrozen,
    start,
    stop,
    clear,
  };
}
