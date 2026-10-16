/**
 * RAID — device-local saved sellers.
 *
 * Bookmarks are non-secret trader preferences (storefront URLs + labels),
 * so they use the plain localStorage helper, never the encrypted store.
 */

import { RaidBookmark } from '../../../../shared/types/raid.types';
import { safeGetItem, safeSetItem } from '../../../utils/storage';
import { bookmarkKey } from './raidUtils';

const RAID_BOOKMARKS_KEY = 'so_raid_bookmarks_v1';

/** Reads the saved-seller list, dropping malformed entries. */
export function loadRaidBookmarks(): RaidBookmark[] {
  const raw = safeGetItem(RAID_BOOKMARKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          typeof entry.handle === 'string' &&
          typeof entry.marketplace === 'string' &&
          typeof entry.url === 'string',
      )
      .map((entry) => ({
        marketplace: entry.marketplace,
        handle: String(entry.handle),
        name: String(entry.name || entry.handle),
        url: String(entry.url),
        savedAt: String(entry.savedAt || new Date().toISOString()),
      }));
  } catch {
    return [];
  }
}

export function saveRaidBookmarks(bookmarks: RaidBookmark[]): void {
  safeSetItem(RAID_BOOKMARKS_KEY, JSON.stringify(bookmarks || []));
}

/** Adds or replaces a bookmark (keyed by marketplace + handle). */
export function upsertRaidBookmark(
  bookmark: RaidBookmark,
): RaidBookmark[] {
  const key = bookmarkKey(bookmark);
  const existing = loadRaidBookmarks().filter((b) => bookmarkKey(b) !== key);
  const next = [bookmark, ...existing];
  saveRaidBookmarks(next);
  return next;
}

export function removeRaidBookmark(
  marketplace: RaidBookmark['marketplace'],
  handle: string,
): RaidBookmark[] {
  const key = bookmarkKey({ marketplace, handle });
  const next = loadRaidBookmarks().filter((b) => bookmarkKey(b) !== key);
  saveRaidBookmarks(next);
  return next;
}
