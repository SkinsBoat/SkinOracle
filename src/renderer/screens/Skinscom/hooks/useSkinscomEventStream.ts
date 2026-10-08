import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import type {
  SkinscomListing,
  SkinscomStreamEvent,
  SkinscomStreamFilters,
  SkinscomStreamStatus,
} from "../../../../shared/types/skinscom.types";
import { getListingIdentity } from "../utils/skinscomUtils";

/**
 * Live Skins.com event stream (socket.io) as a React hook.
 *
 * The canonical key is the *physical item* (`market_name` + exact float), not
 * the deposit id. Skins.com assigns a fresh deposit id each time an unsold
 * auction is re-listed and the same item moves between `new_item` /
 * `updated_item` / `auction_update` / `deleted_item`, so keying by deposit id
 * would pile up the same item several times. Entries therefore accumulate the
 * set of deposit ids they were seen under, the newest state wins, and an entry
 * is only dropped once every one of its deposit ids has been deleted.
 *
 * The feed is capped so a long-running session cannot grow unbounded.
 */

export interface SkinscomStreamEntry {
  /** Canonical item identity (`market_name` + float). */
  identity: string;
  /** Most recent deposit id for this item (used for links/keys). */
  id: number;
  /** Every deposit id this item appeared under (re-listings). */
  ids: number[];
  eventType: SkinscomStreamEvent["type"];
  listing: SkinscomListing;
  receivedAt: number;
}

const MAX_ENTRIES = 600;

const EMPTY_STATUS: SkinscomStreamStatus = {
  connected: false,
  connecting: false,
  authenticated: false,
  eventCount: 0,
  lastEventAt: null,
  error: null,
};

function capEntries(
  entries: Record<string, SkinscomStreamEntry>,
): Record<string, SkinscomStreamEntry> {
  const values = Object.values(entries);
  if (values.length <= MAX_ENTRIES) return entries;
  values.sort((a, b) => b.receivedAt - a.receivedAt);
  const capped: Record<string, SkinscomStreamEntry> = {};
  values.slice(0, MAX_ENTRIES).forEach((e) => {
    capped[e.identity] = e;
  });
  return capped;
}

function findIdentityById(
  entries: Record<string, SkinscomStreamEntry>,
  depositId: number,
): string | undefined {
  return Object.values(entries).find((e) => e.ids.includes(depositId))
    ?.identity;
}

export function reduceStreamEvent(
  prev: Record<string, SkinscomStreamEntry>,
  event: SkinscomStreamEvent,
): Record<string, SkinscomStreamEntry> {
  const next = { ...prev };

  if (event.type === "new_item" || event.type === "updated_item") {
    (event.items ?? []).forEach((listing) => {
      if (!listing || typeof listing.id !== "number") return;
      const identity = getListingIdentity(listing);
      const existing = next[identity];
      const ids = existing
        ? existing.ids.includes(listing.id)
          ? existing.ids
          : [...existing.ids, listing.id]
        : [listing.id];
      next[identity] = {
        identity,
        id: listing.id,
        ids,
        eventType: event.type,
        listing,
        receivedAt: event.receivedAt,
      };
    });
  } else if (event.type === "auction_update") {
    (event.auctions ?? []).forEach((auction) => {
      const identity = findIdentityById(next, auction.id);
      if (!identity) return; // Bid delta for an item we never saw; not matchable.
      const existing = next[identity];
      next[identity] = {
        ...existing,
        eventType: "auction_update",
        receivedAt: event.receivedAt,
        listing: {
          ...existing.listing,
          auction_highest_bid: auction.auction_highest_bid,
          auction_number_of_bids: auction.auction_number_of_bids,
          auction_ends_at: String(auction.auction_ends_at),
        },
      };
    });
  } else if (event.type === "deleted_item") {
    (event.deletedIds ?? []).forEach((depositId) => {
      const identity = findIdentityById(next, depositId);
      if (!identity) return;
      const existing = next[identity];
      const remainingIds = existing.ids.filter((id) => id !== depositId);
      if (remainingIds.length === 0) {
        // Every deposit id for this item is gone; drop it.
        delete next[identity];
      } else {
        // The item was re-listed; the surviving id keeps it alive.
        next[identity] = {
          ...existing,
          ids: remainingIds,
          id: remainingIds[remainingIds.length - 1],
        };
      }
    });
  }

  return capEntries(next);
}

export function useSkinscomEventStream() {
  const [entriesByIdentity, setEntriesByIdentity] = useState<
    Record<string, SkinscomStreamEntry>
  >({});
  const [status, setStatus] = useState<SkinscomStreamStatus>(EMPTY_STATUS);

  useEffect(() => {
    const api = window.electronAPI?.skinscom;
    if (!api?.onStreamEvent) return;

    const offEvent = api.onStreamEvent((event) =>
      setEntriesByIdentity((prev) => reduceStreamEvent(prev, event)),
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

  const start = useCallback(async (filters: SkinscomStreamFilters) => {
    try {
      const next = await window.electronAPI.skinscom.startStream(filters);
      if (next) setStatus(next);
    } catch (err: any) {
      toast.error(`Stream failed: ${err?.message || err}`);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      const next = await window.electronAPI.skinscom.stopStream();
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
